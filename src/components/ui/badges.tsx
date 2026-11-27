import clsx from 'clsx'
import { STATUS_LABEL, categoryIcon, type ProviderStatus } from '@/lib/constants'
import { formatRating, pluralize } from '@/lib/format'

const statusStyle: Record<ProviderStatus, string> = {
  pending: 'bg-[#fef3c7] text-[#92400e]',
  approved: 'bg-success-soft text-[#166534]',
  paused: 'bg-[#e5e7eb] text-[#374151]',
  rejected: 'bg-danger-soft text-[#991b1b]',
}

export function StatusPill({ status }: { status: ProviderStatus }) {
  return (
    <span className={clsx('inline-block rounded-full px-2.5 py-[3px] text-xs font-semibold', statusStyle[status])}>
      {STATUS_LABEL[status]}
    </span>
  )
}

export function CategoryTag({ category }: { category: string }) {
  return (
    <span className="self-start rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
      {categoryIcon(category)} {category}
    </span>
  )
}

/** Estrelas com preenchimento parcial (ex.: 4,5 → quatro e meia). */
export function Stars({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100))
  return (
    <span
      role="img"
      aria-label={`${formatRating(value)} de 5 estrelas`}
      className={clsx('relative inline-block text-[15px] leading-none tracking-[1px] text-[#d9dee1]', className)}
    >
      ★★★★★
      <span
        aria-hidden
        className="absolute top-0 left-0 overflow-hidden whitespace-nowrap text-star"
        style={{ width: `${pct}%` }}
      >
        ★★★★★
      </span>
    </span>
  )
}

export function Rating({ avg, count }: { avg: number | null; count: number }) {
  if (avg === null || count === 0) {
    return (
      <span className="rounded-full bg-[#fdf0e6] px-2 py-0.5 text-xs font-semibold text-accent">Novo por aqui</span>
    )
  }
  return (
    <>
      <Stars value={avg} /> <strong>{formatRating(avg)}</strong>{' '}
      <span className="text-muted">
        ({count} {pluralize(count, 'avaliação', 'avaliações')})
      </span>
    </>
  )
}
