import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  UPLOAD_DIR: z.string().min(1).default("./uploads"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
});

export type Env = Omit<z.infer<typeof envSchema>, "UPLOAD_DIR"> & { UPLOAD_DIR: string };

let cached: Env | undefined;

/**
 * Lê e valida as variáveis de ambiente na primeira chamada (e não no import),
 * para que `next build` funcione sem banco configurado.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Variáveis de ambiente inválidas — ${detail}`);
  }
  cached = { ...parsed.data, UPLOAD_DIR: path.resolve(parsed.data.UPLOAD_DIR) };
  return cached;
}

/**
 * Chave que assina o JWT do admin. Fica fora de getEnv() de propósito: migrações e seed
 * usam o banco mas não assinam token, e não devem exigir esta variável.
 * Trocar o valor invalida todas as sessões de admin. Gere com: openssl rand -base64 48
 */
export function getJwtSecret(): string {
  const parsed = z
    .string({ error: "JWT_SECRET é obrigatório (gere com: openssl rand -base64 48)" })
    .min(32, "JWT_SECRET precisa ter pelo menos 32 caracteres (gere com: openssl rand -base64 48)")
    .safeParse(process.env.JWT_SECRET);
  if (!parsed.success) throw new Error(`Variáveis de ambiente inválidas — ${parsed.error.issues[0]!.message}`);
  return parsed.data;
}
