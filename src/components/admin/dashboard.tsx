import clsx from 'clsx'
import Link from 'next/link'
import { StatusPill } from '@/components/ui/badges'
import { buttonClasses } from '@/components/ui/button'
import { Card, EmptyState } from '@/components/ui/card'
import { ChipRow, chipClasses } from '@/components/ui/chip'
import { Cover } from '@/components/ui/provider-visuals'
import { ADMIN_TAB_LABEL, ADMIN_TAB_VALUES, categoryIcon, type AdminTab } from '@/lib/constants'
import {
  formatBRL,
  formatDate,
  formatDateTime,
  formatPhone,
  formatRating,
  hashColor,
  isPriceOnRequest,
} from '@/lib/format'
import type { AdminReview, ProviderWithRating, Quote } from '@/lib/types'
import { whatsappLink } from '@/lib/whatsapp'
import { AdminActionButton } from './action-button'
import { AdminToolbar } from './toolbar'

type Data = { providers: ProviderWithRating[]; reviews: AdminReview[]; quotes: Quote[] }

const priceText = (p: ProviderWithRating) => (isPriceOnRequest(p) ? 'A combinar' : formatBRL(p.price))

export function Dashboard({ tab, data }: { tab: AdminTab; data: Data }) {
  const pending = data.providers.filter((p) => p.status === 'pending')
  const approved = data.providers.filter((p) => p.status === 'approved')
  const others = data.providers.filter((p) => p.status === 'paused' || p.status === 'rejected')
  const avgAll = data.reviews.length ? data.reviews.reduce((s, r) => s + r.stars, 0) / data.reviews.length : 0

  const counts: Record<AdminTab, number> = {
    pendentes: pending.length,
    aprovados: approved.length,
    outros: others.length,
    avaliacoes: data.reviews.length,
    orcamentos: data.quotes.length,
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1>Painel do administrador</h1>
          <p className="text-[13px] text-muted">Atualizado em {formatDateTime(new Date())}</p>
        </div>
        <AdminToolbar />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 wide:grid-cols-4">
        <Stat label="Aguardando aprovação" value={pending.length} className="text-accent" />
        <Stat label="Prestadores no ar" value={approved.length} className="text-primary" />
        <Stat
          label="Avaliações"
          value={data.reviews.length}
          note={data.reviews.length ? `média ★ ${formatRating(avgAll)}` : 'sem avaliações'}
        />
        <Stat label="Pedidos de orçamento" value={data.quotes.length} />
      </div>

      <ChipRow className="mt-8">
        {ADMIN_TAB_VALUES.map((t) => (
          <Link
            key={t}
            href={t === 'pendentes' ? '/admin' : `/admin?aba=${t}`}
            replace
            scroll={false}
            aria-current={tab === t ? 'page' : undefined}
            className={chipClasses(tab === t)}
          >
            {ADMIN_TAB_LABEL[t]} <span className="text-xs opacity-70">{counts[t]}</span>
          </Link>
        ))}
      </ChipRow>

      <div className="mt-4 flex flex-col gap-4">
        {tab === 'pendentes' && <PendingList providers={pending} />}
        {tab === 'aprovados' && (
          <ProvidersTable title="Prestadores aprovados" note="Estes aparecem para os clientes." providers={approved} />
        )}
        {tab === 'outros' && (
          <ProvidersTable
            title="Pausados e recusados"
            note="Estes não aparecem para os clientes. Você pode reativar quando quiser."
            providers={others}
          />
        )}
        {tab === 'avaliacoes' && <ReviewsTable reviews={data.reviews} />}
        {tab === 'orcamentos' && <QuotesTable quotes={data.quotes} />}
      </div>
    </div>
  )
}

function Stat({ label, value, note, className }: { label: string; value: number; note?: string; className?: string }) {
  return (
    <Card>
      <div className="text-[13px] font-medium text-muted">{label}</div>
      <div className={clsx('mt-1 text-[28px] leading-[1.1] font-bold', className)}>{value}</div>
      {note && <div className="text-[13px] text-muted">{note}</div>}
    </Card>
  )
}

/* ---------------- Pendentes ---------------- */

function PendingList({ providers }: { providers: ProviderWithRating[] }) {
  if (!providers.length) {
    return (
      <EmptyState icon="🎉" title="Tudo em dia!">
        Nenhum cadastro esperando aprovação.
      </EmptyState>
    )
  }
  return providers.map((p) => (
    <Card key={p.id} className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
      <div className="grid grid-cols-4 content-start gap-1.5 md:grid-cols-2">
        {p.photos.length ? (
          p.photos.map((url) => (
            <img
              key={url}
              src={url}
              alt=""
              className={clsx(
                'aspect-square w-full rounded-lg object-cover',
                p.photos.length === 1 && 'col-span-full max-md:col-auto',
              )}
            />
          ))
        ) : (
          <div
            className="col-span-full max-md:col-auto aspect-square overflow-hidden rounded-lg"
            style={{ background: hashColor(p.category) }}
          >
            <Cover provider={p} className="size-full text-[28px]" />
          </div>
        )}
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2>{p.name}</h2>
          <StatusPill status={p.status} />
        </div>
        <dl className="my-3 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]">
          <Info label="Categoria">
            {categoryIcon(p.category)} {p.category}
          </Info>
          <Info label="WhatsApp">
            <a
              href={whatsappLink(p, 'Olá! Aqui é do Chama Aí, sobre o seu cadastro.')}
              target="_blank"
              rel="noopener"
              className="font-semibold text-primary"
            >
              {formatPhone(p.whatsapp)}
            </a>
          </Info>
          <Info label="Cidade">{p.city}</Info>
          <Info label="Preço">{priceText(p)}</Info>
          <Info label="Enviado em">{formatDate(p.createdAt)}</Info>
          <Info label="Fotos">{p.photos.length}</Info>
        </dl>
        <p className="rounded-lg bg-[#f8fafb] px-4 py-3 text-[13px] whitespace-pre-line">{p.description}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-4">
          <AdminActionButton kind="approve" id={p.id} variant="success" size="md">
            ✓ Aprovar
          </AdminActionButton>
          <AdminActionButton kind="reject" id={p.id} variant="ghostDanger" size="md">
            Recusar
          </AdminActionButton>
          <Link
            href={`/prestador/${p.id}`}
            className={buttonClasses({ variant: 'ghost', className: 'col-span-2 print:hidden sm:col-auto' })}
          >
            Ver como cliente
          </Link>
        </div>
      </div>
    </Card>
  ))
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="[overflow-wrap:anywhere]">{children}</dd>
    </div>
  )
}

/* ---------------- Tabelas ---------------- */

function TableCard({
  title,
  note,
  empty,
  children,
}: {
  title: string
  note: string
  empty?: string
  children?: React.ReactNode
}) {
  return (
    <Card>
      <h2>{title}</h2>
      <p className="mt-1 mb-4 text-[13px] text-muted">{note}</p>
      {empty ? (
        <p className="text-muted">{empty}</p>
      ) : (
        // Celular (narrow): a tabela vira uma lista de cartões, um por linha, com o rótulo de cada coluna (data-label).
        // Sem rolagem lateral e com os botões de ação ao alcance do polegar. A partir de 768px é a tabela normal.
        <div className="-mx-5 -mb-5 overflow-x-auto border-t border-line md:-mx-6 md:-mb-6 print:mx-0 print:mb-0 print:overflow-visible">
          <table role="table" className="w-full min-w-[760px] border-collapse text-sm narrow:block narrow:min-w-0">
            {children}
          </table>
        </div>
      )}
    </Card>
  )
}

const th = 'bg-[#f3f4f6] px-4 py-3 text-left text-[13px] font-semibold whitespace-nowrap text-[#374151]'
const td = 'border-t border-line px-4 py-3 align-top narrow:border-t-0 narrow:px-0 narrow:py-1'
// Com "label": no celular a célula mostra "Rótulo  valor" em duas colunas. Sem "label": linha inteira (título/ações).
const tdLabelled =
  'narrow:grid narrow:grid-cols-[6rem_1fr] narrow:gap-x-3 narrow:before:pt-0.5 narrow:before:text-xs narrow:before:font-medium narrow:before:text-muted narrow:before:content-[attr(data-label)]'

// role="..." explícitos: com display:block o navegador pode descartar a semântica de tabela (leitores de tela).
const Head = ({ cols }: { cols: string[] }) => (
  <thead role="rowgroup" className="narrow:sr-only">
    <tr role="row">
      {cols.map((c) => (
        <th key={c} role="columnheader" className={clsx(th, c === 'Ações' && 'print:hidden')}>
          {c}
        </th>
      ))}
    </tr>
  </thead>
)

const Tr = ({ children }: { children: React.ReactNode }) => (
  <tr
    role="row"
    className="hover:bg-[#fafbfc] narrow:block narrow:border-t narrow:border-line narrow:px-5 narrow:py-4 narrow:first:border-t-0"
  >
    {children}
  </tr>
)

function Td({ label, className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <td role="cell" data-label={label} className={clsx(td, label ? tdLabelled : 'narrow:block', className)}>
      <div className="min-w-0">{children}</div>
    </td>
  )
}

/** Célula de ações: no celular os botões dividem a largura da linha. */
function ActionsTd({ children }: { children: React.ReactNode }) {
  return (
    <Td className="print:hidden narrow:pt-3">
      <div className="flex flex-wrap gap-2 narrow:[&>*]:flex-1">{children}</div>
    </Td>
  )
}

function ProvidersTable({ title, note, providers }: { title: string; note: string; providers: ProviderWithRating[] }) {
  return (
    <TableCard title={title} note={note} empty={providers.length ? undefined : 'Nada por aqui.'}>
      <Head cols={['Nome', 'Categoria', 'Cidade', 'WhatsApp', 'Nota', 'Status', 'Ações']} />
      <tbody role="rowgroup" className="narrow:block">
        {providers.map((p) => (
          <Tr key={p.id}>
            <Td>
              <strong className="narrow:text-base">{p.name}</strong>
            </Td>
            <Td label="Categoria">{p.category}</Td>
            <Td label="Cidade">{p.city}</Td>
            <Td label="WhatsApp">{formatPhone(p.whatsapp)}</Td>
            <Td label="Nota">
              {p.avgStars !== null ? (
                `★ ${formatRating(p.avgStars)} (${p.reviewCount})`
              ) : (
                <span className="text-muted">—</span>
              )}
            </Td>
            <Td label="Status">
              <StatusPill status={p.status} />
            </Td>
            <ActionsTd>
              <Link href={`/prestador/${p.id}`} className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                Ver
              </Link>
              {p.status === 'approved' ? (
                <AdminActionButton kind="pause" id={p.id}>
                  Pausar
                </AdminActionButton>
              ) : (
                <AdminActionButton kind="approve" id={p.id} variant="success">
                  Reativar
                </AdminActionButton>
              )}
              <AdminActionButton kind="delete-provider" id={p.id} variant="ghostDanger">
                Excluir
              </AdminActionButton>
            </ActionsTd>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  )
}

function ReviewsTable({ reviews }: { reviews: AdminReview[] }) {
  return (
    <TableCard
      title="Avaliações"
      note="Apague avaliações ofensivas ou falsas."
      empty={reviews.length ? undefined : 'Nenhuma avaliação ainda.'}
    >
      <Head cols={['Data', 'Prestador', 'Autor', 'Nota', 'Comentário', 'Ações']} />
      <tbody role="rowgroup" className="narrow:block">
        {reviews.map((r) => (
          <Tr key={r.id}>
            <Td label="Data">{formatDate(r.createdAt)}</Td>
            <Td label="Prestador">{r.providerName}</Td>
            <Td label="Autor">{r.author}</Td>
            <Td label="Nota" className="whitespace-nowrap">
              <span aria-label={`${r.stars} de 5`}>
                {'★'.repeat(r.stars)}
                <span className="text-[#d9dee1]">{'★'.repeat(5 - r.stars)}</span>
              </span>
            </Td>
            <Td label="Comentário">{r.comment || '—'}</Td>
            <ActionsTd>
              <AdminActionButton kind="delete-review" id={r.id} variant="ghostDanger">
                Apagar
              </AdminActionButton>
            </ActionsTd>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  )
}

function QuotesTable({ quotes }: { quotes: Quote[] }) {
  return (
    <TableCard
      title="Pedidos de orçamento"
      note="Cópia de cada pedido enviado pelos clientes no WhatsApp."
      empty={quotes.length ? undefined : 'Nenhum pedido de orçamento ainda.'}
    >
      <Head cols={['Data', 'Prestador', 'Cliente', 'Bairro', 'Quando', 'Pedido', 'Ações']} />
      <tbody role="rowgroup" className="narrow:block">
        {quotes.map((q) => (
          <Tr key={q.id}>
            <Td label="Data">{formatDate(q.createdAt)}</Td>
            <Td label="Prestador">{q.providerName}</Td>
            <Td label="Cliente">
              <strong>{q.clientName}</strong>
              {q.clientPhone && <div className="text-[13px] text-muted">{q.clientPhone}</div>}
            </Td>
            <Td label="Bairro">{q.neighborhood}</Td>
            <Td label="Quando">{q.preferredWhen || '—'}</Td>
            <Td label="Pedido" className="md:min-w-[220px]">
              {q.details}
            </Td>
            <ActionsTd>
              <AdminActionButton kind="delete-quote" id={q.id} variant="ghostDanger">
                Apagar
              </AdminActionButton>
            </ActionsTd>
          </Tr>
        ))}
      </tbody>
    </TableCard>
  )
}
