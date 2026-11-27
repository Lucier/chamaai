/* Aplica db/migrations/*.sql em ordem, uma única vez cada, de forma segura contra execuções concorrentes. */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { closePool, getPool } from "../src/server/db";

const LOCK_ID = 727_001; // qualquer inteiro fixo; evita duas migrações simultâneas

async function main() {
  const dir = path.resolve(process.cwd(), "db/migrations");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const client = await getPool().connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    await client.query(
      `create table if not exists schema_migrations (
         name text primary key,
         applied_at timestamptz not null default now()
       )`,
    );
    const { rows } = await client.query<{ name: string }>("select name from schema_migrations");
    const done = new Set(rows.map((r) => r.name));

    let applied = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      console.log(`→ aplicando ${file}`);
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
        await client.query("commit");
        applied++;
      } catch (err) {
        await client.query("rollback").catch(() => undefined);
        throw new Error(`Falha em ${file}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(applied ? `✓ ${applied} migração(ões) aplicada(s).` : "✓ Banco já está atualizado.");
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

main()
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closePool());
