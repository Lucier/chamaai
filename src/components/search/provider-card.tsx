import Link from 'next/link'
import { PinIcon, WhatsAppIcon } from '@/components/ui/icons'
import { CategoryTag, Rating } from '@/components/ui/badges'
import { buttonClasses } from '@/components/ui/button'
import { Cover, Price } from '@/components/ui/provider-visuals'
import type { ProviderWithRating } from '@/lib/types'
import { whatsappLink } from '@/lib/whatsapp'

export function ProviderCard({ provider: p }: { provider: ProviderWithRating }) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-lift focus-within:-translate-y-0.5 focus-within:shadow-lift">
      <Cover provider={p} className="aspect-[16/10]" />
      <div className="flex flex-1 flex-col gap-2 px-5 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
        <CategoryTag category={p.category} />
        <h3 className="text-[17px]">
          {/* "Stretched link": o ::after cobre o card inteiro, então o card todo abre o perfil. */}
          <Link
            href={`/prestador/${p.id}`}
            aria-label={`Ver perfil de ${p.name}`}
            className="after:absolute after:inset-0 after:rounded-xl after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-primary"
          >
            {p.name}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 text-[13px] text-muted">
          <PinIcon className="size-3.5 shrink-0" />
          {p.city}
        </div>
        <div className="flex min-h-5 items-center gap-1.5 text-[13px]">
          <Rating avg={p.avgStars} count={p.reviewCount} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#f0f2f3] pt-3">
          <Price provider={p} />
          <a
            href={whatsappLink(p)}
            target="_blank"
            rel="noopener"
            aria-label={`Chamar ${p.name} no WhatsApp`}
            className={buttonClasses({ variant: 'wa', size: 'sm', className: 'relative z-10' })}
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
        </div>
      </div>
    </article>
  )
}
