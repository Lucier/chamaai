import { headers } from "next/headers";

/*
 * Limitador simples em memória (janela deslizante) para os endpoints públicos.
 * Vale por instância do servidor: suficiente para um deploy único; com várias
 * réplicas, troque por um limitador compartilhado (ex.: Redis ou tabela no Postgres).
 */
const g = globalThis as unknown as { __chamaaiRate?: Map<string, number[]> };
const hits = (g.__chamaaiRate ??= new Map<string, number[]>());

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

/** IP do cliente. Atrás de proxy reverso, ele precisa repassar X-Forwarded-For. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export const TOO_MANY = "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.";
