import { PLACEHOLDER_COLORS, TIMEZONE } from "./constants";

/** Minúsculas e sem acentos — usado em comparações e na busca. */
export function normalizeText(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
export const formatBRL = (n: number) => BRL.format(n);

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { timeZone: TIMEZONE });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("pt-BR", { timeZone: TIMEZONE });
}

/** "4,5" — nota com vírgula decimal. */
export const formatRating = (n: number) => n.toFixed(1).replace(".", ",");

export const pluralize = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Máscara de telefone brasileiro: (89) 99999-9999. */
export function maskPhone(value: string): string {
  const d = String(value).replace(/\D/g, "").slice(0, 11);
  if (!d.length) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Aceita "(89) 99999-9999" e devolve "5589999999999", ou null se inválido. */
export function normalizePhone(value: string): string | null {
  let d = String(value).replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return /^55\d{10,11}$/.test(d) ? d : null;
}

/** "5589999999999" → "(89) 99999-9999" */
export const formatPhone = (digits: string | null | undefined) =>
  maskPhone(String(digits ?? "").replace(/^55/, ""));

/** Aceita "80", "80,50", "1.200,00". Devolve null se não for número. */
export function parsePrice(value: string): number | null {
  let s = String(value).replace(/[R$\s]/gi, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

export function hashColor(s: string): string {
  let h = 0;
  for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PLACEHOLDER_COLORS[h % PLACEHOLDER_COLORS.length]!;
}

export function initials(name: string): string {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/** Prestador sem preço fixo? */
export const isPriceOnRequest = (p: { price: number }) => !(p.price > 0);
