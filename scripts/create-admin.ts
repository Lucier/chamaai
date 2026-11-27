/*
 * Cria (ou atualiza a senha de) um administrador.
 *   npm run admin:create                       -> usa ADMIN_EMAIL / ADMIN_PASSWORD do ambiente
 *   npm run admin:create -- ana@x.com "senha"   -> usa os argumentos
 * Sem credenciais definidas, não faz nada (útil no docker compose).
 *
 * Idempotente: rodar de novo com a MESMA senha não muda nada (só troca um hash antigo por
 * bcrypt, se for o caso) e não derruba as sessões abertas. Com uma senha DIFERENTE, grava o
 * novo hash, destrava a conta e invalida todas as sessões já emitidas (token_version + 1).
 *
 * Política de senha (schemas.ts): vale para senha nova ou trocada. Uma senha já guardada que
 * não a cumpre continua entrando — só gera um aviso —, para uma regra nova não trancar ninguém.
 */
import { z } from "zod";
import { adminCredentialsSchema } from "../src/lib/schemas";
import { closePool, query, queryOne } from "../src/server/db";
import { hashPassword, needsRehash, verifyPassword } from "../src/server/password";

async function main() {
  const rawEmail = process.argv[2] ?? process.env.ADMIN_EMAIL;
  const password = process.argv[3] ?? process.env.ADMIN_PASSWORD;
  if (!rawEmail || !password) {
    console.log("• ADMIN_EMAIL/ADMIN_PASSWORD não definidos — nenhum admin criado.");
    return;
  }
  const email = z.email("ADMIN_EMAIL inválido").safeParse(rawEmail.trim().toLowerCase());
  if (!email.success) throw new Error(email.error.issues[0]!.message);
  const policy = adminCredentialsSchema.safeParse({ email: email.data, password });
  const policyProblems = policy.success ? [] : policy.error.issues.map((i) => i.message);

  const existing = await queryOne<{ id: string; password_hash: string }>(
    "select id, password_hash from admins where email = $1",
    [email.data],
  );

  // Mesma senha de antes: nada a trocar.
  if (existing && (await verifyPassword(password, existing.password_hash))) {
    if (needsRehash(existing.password_hash)) {
      await query("update admins set password_hash = $2 where id = $1", [existing.id, await hashPassword(password)]);
      console.log("• Hash da senha atualizado para bcrypt.");
    }
    if (policyProblems.length) {
      console.warn(`! A senha atual de ${email.data} não cumpre a política: ${policyProblems.join(" ")} Troque ADMIN_PASSWORD e rode de novo.`);
    }
    console.log(`✓ Admin pronto: ${email.data} (senha inalterada)`);
    return;
  }

  if (policyProblems.length) throw new Error(policyProblems.join(" "));
  const hash = await hashPassword(password);

  if (existing) {
    await query(
      `update admins
          set password_hash = $2, token_version = token_version + 1, failed_attempts = 0, locked_until = null
        where id = $1`,
      [existing.id, hash],
    );
    await query("delete from admin_sessions where admin_id = $1", [existing.id]);
    console.log(`✓ Senha de ${email.data} redefinida; sessões anteriores encerradas.`);
  } else {
    await query("insert into admins (email, password_hash) values ($1, $2)", [email.data, hash]);
    console.log(`✓ Admin criado: ${email.data}`);
  }
}

main()
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
