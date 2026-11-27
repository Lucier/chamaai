import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { query, queryOne } from './db'
import { getEnv } from './env'
import { signSessionToken, verifySessionToken } from './jwt'
import { dummyHash, hashPassword, needsRehash, verifyPassword } from './password'

const SESSION_COOKIE = 'chamaai_admin'
const DEVICE_COOKIE = 'chamaai_device'

/** Falhas seguidas que bloqueiam a conta, e por quanto tempo. */
export const MAX_FAILED_LOGINS = 5
export const LOCK_MINUTES = 15

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex')

export type AdminUser = { id: string; email: string }

export type AuthResult = { ok: true; adminId: string; version: number } | { ok: false; reason: 'invalid' | 'locked' }

/* ---------------- Núcleo (sem cookies — testável) ---------------- */

/**
 * Confere e-mail/senha. Aplica o bloqueio de conta, conta falhas, e troca hashes antigos
 * (scrypt ou bcrypt de custo menor) por um bcrypt atual quando a senha está certa.
 * Gasta sempre o mesmo tempo de hash, exista o e-mail ou não.
 */
export async function authenticate(email: string, password: string): Promise<AuthResult> {
  const admin = await queryOne<{ id: string; password_hash: string; token_version: number; locked: boolean }>(
    `select id, password_hash, token_version,
            (locked_until is not null and locked_until > now()) as locked
       from admins where email = $1`,
    [email],
  )
  const matches = await verifyPassword(password, admin?.password_hash ?? (await dummyHash()))
  if (!admin) return { ok: false, reason: 'invalid' }

  // Conta bloqueada: recusa até com a senha certa, e não conta a tentativa (não estende o bloqueio).
  if (admin.locked) return { ok: false, reason: 'locked' }

  if (!matches) {
    // Ao atingir o limite, trava e zera o contador: passado o bloqueio, a pessoa tem tentativas novas.
    await query(
      `update admins
          set failed_attempts = case when failed_attempts + 1 >= $2 then 0 else failed_attempts + 1 end,
              locked_until    = case when failed_attempts + 1 >= $2 then now() + make_interval(mins => $3) else locked_until end
        where id = $1`,
      [admin.id, MAX_FAILED_LOGINS, LOCK_MINUTES],
    )
    return { ok: false, reason: 'invalid' }
  }

  const upgraded = needsRehash(admin.password_hash) ? await hashPassword(password) : null
  await query(
    `update admins
        set failed_attempts = 0, locked_until = null, last_login_at = now(),
            password_hash = coalesce($2, password_hash)
      where id = $1`,
    [admin.id, upgraded],
  )
  return { ok: true, adminId: admin.id, version: admin.token_version }
}

/** Registra a sessão (hash do jti) e devolve o JWT assinado. */
export async function openSession(adminId: string, version: number): Promise<{ token: string; expires: Date }> {
  const sessionId = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + getEnv().SESSION_TTL_DAYS * 86_400_000)
  await query('delete from admin_sessions where expires_at < now()')
  await query('insert into admin_sessions (token_hash, admin_id, expires_at) values ($1, $2, $3)', [
    sha256(sessionId),
    adminId,
    expires,
  ])
  return { token: await signSessionToken({ adminId, sessionId, version }, expires), expires }
}

/**
 * Admin dono do token, ou null. Além da assinatura/validade do JWT, exige no banco que a
 * sessão não foi revogada (logout) e que a versão da credencial ainda é a atual (troca de senha).
 */
export async function resolveSession(token: string): Promise<AdminUser | null> {
  const claims = await verifySessionToken(token)
  if (!claims) return null
  return queryOne<AdminUser>(
    `select a.id, a.email
       from admin_sessions s join admins a on a.id = s.admin_id
      where s.token_hash = $1 and s.admin_id = $2 and s.expires_at > now() and a.token_version = $3`,
    [sha256(claims.sessionId), claims.adminId, claims.version],
  )
}

/** Revoga a sessão do token (se for um JWT nosso). */
export async function revokeSession(token: string): Promise<void> {
  const claims = await verifySessionToken(token)
  if (claims) await query('delete from admin_sessions where token_hash = $1', [sha256(claims.sessionId)])
}

/* ---------------- Camada de requisição (cookies) ---------------- */

/**
 * Cookie com o atributo `Secure`? Sim quando COOKIE_SECURE=true OU quando a requisição chegou por HTTPS
 * (o proxy avisa em X-Forwarded-Proto). Assim o mesmo app serve http na porta 3000 e https atrás do proxy
 * sem trocar configuração: um cookie `Secure` enviado por http simplesmente não seria guardado pelo navegador.
 */
async function cookieSecure(): Promise<boolean> {
  return getEnv().COOKIE_SECURE || (await headers()).get('x-forwarded-proto') === 'https'
}

/** Admin da sessão atual (ou null). Memoizado por requisição. */
export const getAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return token ? resolveSession(token) : null
})

export class UnauthorizedError extends Error {
  constructor() {
    super('Não autenticado.')
    this.name = 'UnauthorizedError'
  }
}

/** Guarda "negar por padrão": use em todo acesso a dado ou ação restrita ao admin. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdmin()
  if (!admin) throw new UnauthorizedError()
  return admin
}

/** Confere as credenciais e, se corretas, grava o cookie da sessão. */
export async function loginAdmin(email: string, password: string): Promise<AuthResult> {
  const auth = await authenticate(email, password)
  if (!auth.ok) return auth
  const { token, expires } = await openSession(auth.adminId, auth.version)
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await cookieSecure(),
    path: '/',
    expires,
  })
  return auth
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies()
  const token = jar.get(SESSION_COOKIE)?.value
  if (token) await revokeSession(token)
  jar.delete(SESSION_COOKIE)
}

/**
 * Identificador anônimo do aparelho (cookie de 1 ano) — usado para permitir
 * apenas uma avaliação por prestador em cada aparelho.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const jar = await cookies()
  const existing = jar.get(DEVICE_COOKIE)?.value
  if (existing && existing.length >= 8 && existing.length <= 64) return existing
  const id = crypto.randomUUID()
  jar.set(DEVICE_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: await cookieSecure(),
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return id
}
