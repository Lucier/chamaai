import type { SearchFilters } from './schemas'

/** Evento global usado pelo botão "Limpar filtros" para zerar o campo de texto da busca. */
export const CLEAR_SEARCH_EVENT = 'chamaai:clear-search'

/** Monta a URL da busca omitindo valores vazios/padrão. */
export function searchHref(f: SearchFilters): string {
  const p = new URLSearchParams()
  if (f.q) p.set('q', f.q)
  if (f.categoria) p.set('categoria', f.categoria)
  if (f.cidade) p.set('cidade', f.cidade)
  if (f.ordem !== 'avaliacao') p.set('ordem', f.ordem)
  const qs = p.toString()
  return qs ? `/?${qs}` : '/'
}
