'use client'

import { useTransition } from 'react'
import { deleteProvider, deleteQuote, deleteReview, setProviderStatus } from '@/actions/admin'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui/button'
import { useConfirm, useToast } from '@/components/ui/providers'
import type { ActionResult } from '@/lib/types'

type Spec = {
  run: (id: string) => Promise<ActionResult>
  success: string
  confirm?: { title: string; message: string; confirmLabel: string }
}

const SPECS = {
  approve: { run: (id) => setProviderStatus(id, 'approved'), success: 'Prestador aprovado! Já aparece no catálogo.' },
  reject: {
    run: (id) => setProviderStatus(id, 'rejected'),
    success: 'Cadastro recusado.',
    confirm: {
      title: 'Recusar cadastro?',
      message: 'Ele não vai aparecer para os clientes. Você pode reativar depois na aba "Pausados e recusados".',
      confirmLabel: 'Recusar',
    },
  },
  pause: { run: (id) => setProviderStatus(id, 'paused'), success: 'Prestador pausado. Ele saiu do catálogo.' },
  'delete-provider': {
    run: deleteProvider,
    success: 'Prestador excluído.',
    confirm: {
      title: 'Excluir prestador?',
      message: 'Isso apaga o cadastro, as fotos, as avaliações e os orçamentos dele. Não dá para desfazer.',
      confirmLabel: 'Excluir',
    },
  },
  'delete-review': {
    run: deleteReview,
    success: 'Avaliação apagada.',
    confirm: {
      title: 'Apagar avaliação?',
      message: 'A avaliação some do perfil do prestador.',
      confirmLabel: 'Apagar',
    },
  },
  'delete-quote': {
    run: deleteQuote,
    success: 'Pedido apagado.',
    confirm: {
      title: 'Apagar pedido?',
      message: 'Remove só a cópia daqui. O que foi enviado no WhatsApp continua lá.',
      confirmLabel: 'Apagar',
    },
  },
} satisfies Record<string, Spec>

export type AdminActionKind = keyof typeof SPECS

export function AdminActionButton({
  kind,
  id,
  variant = 'ghost',
  size = 'sm',
  children,
}: {
  kind: AdminActionKind
  id: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: React.ReactNode
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [pending, startTransition] = useTransition()
  const spec: Spec = SPECS[kind]

  async function onClick() {
    if (spec.confirm && !(await confirm(spec.confirm))) return
    startTransition(async () => {
      const res = await spec.run(id).catch(() => null)
      if (!res) return toast('Sem conexão com o servidor. Tente de novo.', 'error')
      toast(res.ok ? spec.success : res.message, res.ok ? 'success' : 'error')
    })
  }

  return (
    <Button variant={variant} size={size} onClick={onClick} disabled={pending} className="print:hidden">
      {children}
    </Button>
  )
}
