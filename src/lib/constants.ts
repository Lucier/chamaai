export const CATEGORIES = [
  ["Eletricista", "⚡"],
  ["Encanador", "🔧"],
  ["Diarista", "🧹"],
  ["Pedreiro", "🧱"],
  ["Pintor", "🎨"],
  ["Marceneiro", "🪚"],
  ["Jardineiro", "🌿"],
  ["Técnico de ar-condicionado", "❄️"],
  ["Montador de móveis", "🛠️"],
  ["Mecânico", "🚗"],
  ["Manicure e pedicure", "💅"],
  ["Cabeleireiro(a)", "✂️"],
  ["Fretes e mudanças", "🚚"],
  ["Técnico de informática", "💻"],
  ["Cuidador(a) de idosos", "🤝"],
  ["Babá", "🧸"],
  ["Outros", "⭐"],
] as const;

export const CATEGORY_NAMES = CATEGORIES.map(([name]) => name);
const CATEGORY_ICON: Record<string, string> = Object.fromEntries(CATEGORIES);

export function categoryIcon(category: string): string {
  return CATEGORY_ICON[category] ?? "⭐";
}

export const PROVIDER_STATUSES = ["pending", "approved", "rejected", "paused"] as const;
export type ProviderStatus = (typeof PROVIDER_STATUSES)[number];

export const STATUS_LABEL: Record<ProviderStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  paused: "Pausado",
  rejected: "Recusado",
};

export const WHEN_OPTIONS = [
  "O quanto antes",
  "Esta semana",
  "Este mês",
  "Só estou pesquisando preço",
] as const;

/** Cores de fundo do placeholder quando o prestador não tem foto. */
export const PLACEHOLDER_COLORS = [
  "#DCEFF0",
  "#FDEBDD",
  "#E5EEFB",
  "#E8F5E9",
  "#F3E8FD",
  "#FFF4D6",
  "#FDE7EC",
  "#E6F4F1",
] as const;

export const SORT_VALUES = ["avaliacao", "preco", "recentes"] as const;
export type SortValue = (typeof SORT_VALUES)[number];
export const SORT_LABEL: Record<SortValue, string> = {
  avaliacao: "Melhor avaliados",
  preco: "Menor preço",
  recentes: "Mais recentes",
};

export const ADMIN_TAB_VALUES = ["pendentes", "aprovados", "outros", "avaliacoes", "orcamentos"] as const;
export type AdminTab = (typeof ADMIN_TAB_VALUES)[number];
export const ADMIN_TAB_LABEL: Record<AdminTab, string> = {
  pendentes: "Pendentes",
  aprovados: "Aprovados",
  outros: "Pausados e recusados",
  avaliacoes: "Avaliações",
  orcamentos: "Orçamentos",
};

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB por foto (mesmo limite do bucket antigo)
export const TIMEZONE = "America/Sao_Paulo";
