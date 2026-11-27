import Link from 'next/link'
import { WrenchIcon } from '@/components/ui/icons'
import { getAdmin } from '@/server/auth'
import { countPending } from '@/server/queries'
import { NavTabs } from './nav-tabs'
import { InstallButton } from './pwa'

export async function Topbar() {
  // O selo de pendentes só aparece para quem está logado como admin.
  const pending = (await getAdmin()) ? await countPending() : 0
  return (
    // Celular: o header é "sticky" com top negativo igual à altura da linha do logo (h-12). Ao rolar, o logo sai
    // da tela e só as abas ficam coladas no topo (~57px em vez de ~100px de tela perdida). No desktop volta ao normal.
    <header className="sticky -top-12 z-40 border-b border-line bg-white/95 backdrop-blur-md backdrop-saturate-150 md:top-0 print:hidden">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-stretch px-0 pb-2 md:min-h-[66px] md:flex-row md:items-center md:justify-between md:gap-4 md:px-4 md:py-0">
        <div className="relative flex items-center justify-center md:justify-start md:gap-3">
          <Link
            href="/"
            aria-label="Chama Aí — início"
            className="flex h-12 items-center justify-center gap-2.5 text-[19px] font-bold tracking-[-0.02em] text-ink no-underline md:h-auto md:min-h-11 md:justify-start"
          >
            <span className="grid size-9 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#0f6b73,#14919b)] text-white">
              <WrenchIcon className="size-5" />
            </span>
            <span>
              Chama <b className="text-accent">Aí</b>
            </span>
          </Link>
          {/* Celular: sobreposto à direita da linha do logo (que continua centralizado). Desktop: ao lado do logo. */}
          <div className="absolute inset-y-0 right-3 flex items-center md:static md:inset-auto">
            <InstallButton compact />
          </div>
        </div>
        <NavTabs pendingCount={pending} />
      </div>
    </header>
  )
}
