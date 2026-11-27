import { ProfileView } from '@/components/profile/profile-view'
import { Modal } from '@/components/ui/modal'
import { loadProfile } from '@/server/profile'

export const dynamic = 'force-dynamic'

/** Mesma URL de /prestador/[id], mas aberta como modal por cima da página atual (busca ou admin). */
export default async function ProviderModal({ params }: { params: Promise<{ id: string }> }) {
  const data = await loadProfile((await params).id)
  return (
    <Modal>
      {data ? (
        <ProfileView provider={data.provider} />
      ) : (
        <div className="p-8 text-center">
          <div className="mb-2 text-[42px]" aria-hidden>
            🔍
          </div>
          <h2>Esse perfil não está disponível.</h2>
          <p className="mt-2 text-muted">Ele pode ter sido pausado ou removido.</p>
        </div>
      )}
    </Modal>
  )
}
