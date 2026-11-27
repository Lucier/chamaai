import { jwtVerify, SignJWT } from "jose";
import { getJwtSecret } from "./env";

/*
 * JWT da sessão do admin (HS256, assinado com JWT_SECRET).
 *
 * O token sozinho NÃO basta para entrar: auth.ts também confere no banco que o `jti`
 * ainda está na lista de sessões e que `ver` bate com admins.token_version. Assim o
 * logout e a troca de senha revogam tokens que ainda não expiraram.
 *
 * Contra confusão de algoritmo: a verificação aceita SÓ HS256 (nunca `none`) e exige
 * emissor e audiência desta aplicação.
 */
const ISSUER = "chama-ai";
const AUDIENCE = "chama-ai:admin";
const ALG = "HS256";

export type SessionClaims = {
  /** id do admin (claim `sub`) */
  adminId: string;
  /** id da sessão (claim `jti`) — o banco guarda o hash dele */
  sessionId: string;
  /** versão da credencial no momento do login (claim `ver`) */
  version: number;
};

const key = () => new TextEncoder().encode(getJwtSecret());

export async function signSessionToken(claims: SessionClaims, expiresAt: Date): Promise<string> {
  return new SignJWT({ ver: claims.version })
    .setProtectedHeader({ alg: ALG, typ: "JWT" })
    .setSubject(claims.adminId)
    .setJti(claims.sessionId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
}

/** Devolve as claims se assinatura, algoritmo, emissor, audiência e validade conferem; senão null. */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: [ALG],
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredClaims: ["sub", "jti", "exp"],
    });
    const { sub, jti, ver } = payload;
    if (typeof sub !== "string" || typeof jti !== "string" || typeof ver !== "number" || !Number.isInteger(ver)) {
      return null;
    }
    return { adminId: sub, sessionId: jti, version: ver };
  } catch {
    return null; // expirado, adulterado, algoritmo/emissor/audiência errados…
  }
}
