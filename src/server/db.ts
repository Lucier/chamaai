import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { getEnv } from "./env";

// Reaproveita o pool entre recarregamentos do `next dev` (HMR).
const globalForPg = globalThis as unknown as { __chamaaiPool?: Pool };

export function getPool(): Pool {
  if (!globalForPg.__chamaaiPool) {
    const pool = new Pool({
      connectionString: getEnv().DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30_000,
    });
    pool.on("error", (err) => console.error("[pg] erro em conexão ociosa:", err));
    globalForPg.__chamaaiPool = pool;
  }
  return globalForPg.__chamaaiPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const res = await getPool().query<T>(text, params);
  return res.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await globalForPg.__chamaaiPool?.end();
  globalForPg.__chamaaiPool = undefined;
}

/** Código SQLSTATE de violação de unicidade. */
export const PG_UNIQUE_VIOLATION = "23505";
