import { CategoryTag, Rating, StatusPill, Stars } from '@/components/ui/badges'
import { InnerBox } from '@/components/ui/card'
import { PinIcon } from '@/components/ui/icons'
import { Price } from '@/components/ui/provider-visuals'
import { formatDate, formatRating, pluralize } from '@/lib/format'
import type { ProviderWithRating } from '@/lib/types'
import { getReviews } from '@/server/queries'
import { Gallery } from './gallery'
import { ProfileActions } from './profile-actions'
import { ReviewForm } from './review-form'

/** Conteúdo do perfil — compartilhado entre o modal (rota interceptada) e a página /prestador/[id]. */
export async function ProfileView({ provider: p }: { provider: ProviderWithRating }) {
  const reviews = await getReviews(p.id)
  const approved = p.status === 'approved'
  const firstName = p.name.split(' ')[0]
  const distribution = [5, 4, 3, 2, 1].map((n) => [n, reviews.filter((r) => r.stars === n).length] as const)

  return (
    <article>
      <Gallery provider={p} />
      <div className="p-5 md:p-6">
        {!approved && (
          <InnerBox className="mb-4 px-4 py-3">
            Visualização do admin · Status: <StatusPill status={p.status} /> — este perfil não aparece para os clientes.
          </InnerBox>
        )}

        <div className="flex flex-wrap justify-between gap-6">
          <div className="flex flex-col gap-2">
            <CategoryTag category={p.category} />
            <h1>{p.name}</h1>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <PinIcon className="size-3.5 shrink-0" />
              {p.city}
            </div>
            <div className="flex min-h-5 items-center gap-1.5 text-[13px]">
              <Rating avg={p.avgStars} count={p.reviewCount} />
            </div>
          </div>
          <Price provider={p} className="md:text-right" />
        </div>

        <ProfileActions provider={p} canQuote={approved} />

        <section className="mt-8">
          <h2>Sobre o serviço</h2>
          <p className="mt-2 whitespace-pre-line">{p.description}</p>
        </section>

        <section className="mt-8">
          <h2>Avaliações</h2>
          {p.avgStars !== null && p.reviewCount > 0 ? (
            <div className="my-3 mb-4 flex flex-wrap items-center gap-4">
              <div className="text-4xl leading-none font-bold">{formatRating(p.avgStars)}</div>
              <div>
                <Stars value={p.avgStars} />
                <div className="text-[13px] text-muted">
                  {p.reviewCount} {pluralize(p.reviewCount, 'avaliação', 'avaliações')}
                </div>
              </div>
              <div className="grid max-w-[260px] flex-1 grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs text-muted max-md:max-w-none max-md:basis-full md:ml-auto">
                {distribution.map(([n, count]) => (
                  <DistributionRow key={n} stars={n} count={count} total={p.reviewCount} />
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-2 mb-4 text-muted">Ainda sem avaliações. Contratou {firstName}? Conte como foi!</p>
          )}

          <div>
            {reviews.map((r) => (
              <div key={r.id} className="border-t border-[#eef1f2] py-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <strong>{r.author}</strong>
                  <span className="text-[13px] text-muted">{formatDate(r.createdAt)}</span>
                </div>
                <Stars value={r.stars} />
                {r.comment && <p className="mt-1.5">{r.comment}</p>}
              </div>
            ))}
          </div>

          {approved && <ReviewForm providerId={p.id} />}
        </section>
      </div>
    </article>
  )
}

function DistributionRow({ stars, count, total }: { stars: number; count: number; total: number }) {
  return (
    <>
      <span>{stars}★</span>
      <span className="h-1.5 overflow-hidden rounded-full bg-[#eef1f2]">
        <i className="block h-full rounded-full bg-star" style={{ width: `${((count / total) * 100).toFixed(0)}%` }} />
      </span>
      <span>{count}</span>
    </>
  )
}
