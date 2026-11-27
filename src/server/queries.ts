import "server-only";
import { normalizeText } from "@/lib/format";
import type { SearchFilters } from "@/lib/schemas";
import type { AdminReview, ProviderWithRating, Quote, Review } from "@/lib/types";
import type { ProviderStatus } from "@/lib/constants";
import { requireAdmin } from "./auth";
import { query, queryOne } from "./db";
import { photoUrl } from "./uploads";

/* ---------------- Prestadores ---------------- */

type ProviderRow = {
  id: string;
  created_at: Date;
  name: string;
  whatsapp: string;
  category: string;
  city: string;
  price: number;
  description: string;
  photos: string[];
  status: ProviderStatus;
  avg_stars: number | null;
  review_count: number;
};

const PROVIDER_SELECT = `
  select p.id, p.created_at, p.name, p.whatsapp, p.category, p.city,
         p.price::float8 as price, p.description, p.photos, p.status,
         r.avg_stars, coalesce(r.review_count, 0)::int as review_count
    from providers p
    left join (
      select provider_id, avg(stars)::float8 as avg_stars, count(*)::int as review_count
        from reviews group by provider_id
    ) r on r.provider_id = p.id`;

function mapProvider(r: ProviderRow): ProviderWithRating {
  return {
    id: r.id,
    createdAt: r.created_at.toISOString(),
    name: r.name,
    whatsapp: r.whatsapp,
    category: r.category,
    city: r.city,
    price: r.price,
    description: r.description,
    photos: r.photos.map(photoUrl),
    status: r.status,
    avgStars: r.avg_stars,
    reviewCount: r.review_count,
  };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => "\\" + c);

/** Busca pública: só prestadores aprovados. Cada palavra precisa aparecer (sem acento / sem caixa). */
export async function searchProviders(f: SearchFilters): Promise<ProviderWithRating[]> {
  const where: string[] = ["p.status = 'approved'"];
  const params: unknown[] = [];
  const add = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };

  if (f.categoria) where.push(`p.category = ${add(f.categoria)}`);
  if (f.cidade) where.push(`p.city = ${add(f.cidade)}`);

  const words = normalizeText(f.q).split(/\s+/).filter(Boolean).slice(0, 8);
  for (const w of words) {
    where.push(
      `unaccent(lower(concat_ws(' ', p.name, p.category, p.description, p.city)))
         like '%' || unaccent(lower(${add(escapeLike(w))})) || '%' escape '\\'`,
    );
  }

  const order = {
    avaliacao: "coalesce(r.avg_stars, 0) desc, coalesce(r.review_count, 0) desc, p.created_at desc",
    // "a combinar" (preço 0) vai para o fim; empate desempata pela nota
    preco: "(case when p.price <= 0 then 1 else 0 end), p.price asc, coalesce(r.avg_stars, 0) desc",
    recentes: "p.created_at desc",
  }[f.ordem];

  const rows = await query<ProviderRow>(`${PROVIDER_SELECT} where ${where.join(" and ")} order by ${order}`, params);
  return rows.map(mapProvider);
}

export type FilterOptions = {
  total: number;
  categories: { name: string; count: number }[];
  cities: string[];
};

/** Opções dos filtros (e contagem dos chips) — sempre sobre todos os aprovados. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [cats, cities] = await Promise.all([
    query<{ category: string; n: number }>(
      "select category, count(*)::int as n from providers where status = 'approved' group by category",
    ),
    query<{ city: string }>("select distinct city from providers where status = 'approved'"),
  ]);
  const collator = new Intl.Collator("pt-BR");
  return {
    total: cats.reduce((s, c) => s + c.n, 0),
    categories: cats.map((c) => ({ name: c.category, count: c.n })),
    cities: cities.map((c) => c.city).sort(collator.compare),
  };
}

export async function getProvider(id: string): Promise<ProviderWithRating | null> {
  const row = await queryOne<ProviderRow>(`${PROVIDER_SELECT} where p.id = $1`, [id]);
  return row ? mapProvider(row) : null;
}

/** Sugestões de cidade para o campo do cadastro (datalist). */
export async function getCitySuggestions(includeAllStatuses: boolean): Promise<string[]> {
  const filter = includeAllStatuses ? "" : "where status = 'approved'";
  const rows = await query<{ city: string }>(`select distinct city from providers ${filter} order by city`);
  return rows.map((r) => r.city);
}

export async function countPending(): Promise<number> {
  const row = await queryOne<{ n: number }>("select count(*)::int as n from providers where status = 'pending'");
  return row?.n ?? 0;
}

/* ---------------- Avaliações ---------------- */

type ReviewRow = {
  id: string;
  provider_id: string;
  author: string;
  stars: number;
  comment: string | null;
  created_at: Date;
  provider_name?: string;
};

const mapReview = (r: ReviewRow): Review => ({
  id: r.id,
  providerId: r.provider_id,
  author: r.author,
  stars: r.stars,
  comment: r.comment,
  createdAt: r.created_at.toISOString(),
});

export async function getReviews(providerId: string): Promise<Review[]> {
  const rows = await query<ReviewRow>(
    `select id, provider_id, author, stars, comment, created_at
       from reviews where provider_id = $1 order by created_at desc`,
    [providerId],
  );
  return rows.map(mapReview);
}

/* ---------------- Painel do admin ---------------- */

export async function getAdminData(): Promise<{
  providers: ProviderWithRating[];
  reviews: AdminReview[];
  quotes: Quote[];
}> {
  await requireAdmin(); // defesa em profundidade: não confia só na checagem da página
  const [providers, reviews, quotes] = await Promise.all([
    query<ProviderRow>(`${PROVIDER_SELECT} order by p.created_at desc`),
    query<ReviewRow>(
      `select r.id, r.provider_id, r.author, r.stars, r.comment, r.created_at, p.name as provider_name
         from reviews r join providers p on p.id = r.provider_id
        order by r.created_at desc`,
    ),
    query<{
      id: string;
      provider_id: string;
      provider_name: string;
      client_name: string;
      client_phone: string | null;
      neighborhood: string;
      preferred_when: string | null;
      details: string;
      created_at: Date;
    }>(
      `select q.id, q.provider_id, p.name as provider_name, q.client_name, q.client_phone,
              q.neighborhood, q.preferred_when, q.details, q.created_at
         from quotes q join providers p on p.id = q.provider_id
        order by q.created_at desc`,
    ),
  ]);
  return {
    providers: providers.map(mapProvider),
    reviews: reviews.map((r) => ({ ...mapReview(r), providerName: r.provider_name ?? "(removido)" })),
    quotes: quotes.map((q) => ({
      id: q.id,
      providerId: q.provider_id,
      providerName: q.provider_name,
      clientName: q.client_name,
      clientPhone: q.client_phone,
      neighborhood: q.neighborhood,
      preferredWhen: q.preferred_when,
      details: q.details,
      createdAt: q.created_at.toISOString(),
    })),
  };
}
