import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProfileView } from '@/components/profile/profile-view'
import { loadProfile } from '@/server/profile'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await loadProfile((await params).id)
  if (!data) return { title: 'Perfil não encontrado' }
  const { provider: p } = data
  const title = `${p.name} — ${p.category} em ${p.city}`
  return {
    title,
    description: p.description.slice(0, 160),
    robots: p.status === 'approved' ? undefined : { index: false },
  }
}

/** Acesso direto ao link do perfil (compartilhado, recarregado ou aberto em nova aba). */
export default async function ProviderPage({ params }: Props) {
  const data = await loadProfile((await params).id)
  if (!data) notFound()
  return (
    <div className="mx-auto max-w-[820px]">
      <Link href="/" className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary no-underline">
        ← Voltar para a busca
      </Link>
      <div className="overflow-hidden rounded-xl bg-card shadow-card">
        <ProfileView provider={data.provider} />
      </div>
    </div>
  )
}
