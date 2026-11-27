import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import bcrypt from "bcryptjs";

/*
 * Senhas NUNCA são criptografadas (isso seria reversível): guardamos só um hash
 * bcrypt, lento de propósito e com sal próprio embutido no resultado.
 *
 * Formato: $2b$<custo>$<sal+hash>. O custo 12 (~250 ms) segura força bruta offline
 * sem pesar no login de um admin. Subir o custo aqui faz needsRehash() devolver true
 * para os hashes antigos, e eles são trocados no próximo login bem-sucedido.
 *
 * Limite do bcrypt: só os primeiros 72 BYTES da senha entram no hash. A política em
 * schemas.ts recusa senhas maiores em vez de truncar em silêncio.
 */
export const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("scrypt$")) return verifyLegacyScrypt(password, stored);
  try {
    return await bcrypt.compare(password, stored);
  } catch {
    return false; // hash malformado
  }
}

/** true quando o hash guardado não é bcrypt ou usa um custo menor que o atual. */
export function needsRehash(stored: string): boolean {
  const m = /^\$2[aby]\$(\d{2})\$/.exec(stored);
  return !m || Number(m[1]) < BCRYPT_COST;
}

// Hash descartável usado para gastar o mesmo tempo quando o e-mail não existe.
let dummy: Promise<string> | undefined;
export function dummyHash(): Promise<string> {
  dummy ??= hashPassword("senha-inexistente-chama-ai");
  return dummy;
}

/* ---------------- Legado: scrypt (formato antigo deste projeto) ----------------
   Só VERIFICA. Admins criados antes do bcrypt continuam entrando; no primeiro login o
   hash é regravado em bcrypt (ver needsRehash) e este caminho deixa de ser usado. */

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

/** Formato: scrypt$N$r$p$<salt b64>$<hash b64> */
async function verifyLegacyScrypt(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Só para os testes gerarem um hash no formato antigo. */
export async function legacyScryptHashForTests(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
}
