'use server'

import { revalidatePath } from 'next/cache'
import { quoteSchema, reviewSchema, firstErrors } from '@/lib/schemas'
import type { ActionResult } from '@/lib/types'
import { getOrCreateDeviceId } from '@/server/auth'
import { insertQuote, insertReview } from '@/server/mutations'
import { clientIp, rateLimit, TOO_MANY } from '@/server/rate-limit'

/** Avaliação pública — uma por aparelho (cookie) em cada prestador. */
export async function submitReview(input: unknown): Promise<ActionResult> {
  if (!rateLimit(`review:${await clientIp()}`, 10, 60 * 60_000)) return { ok: false, message: TOO_MANY }

  const parsed = reviewSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Confira os campos.', fieldErrors: firstErrors(parsed.error) }
  }
  try {
    const result = await insertReview({ ...parsed.data, deviceId: await getOrCreateDeviceId() })
    if (result === 'duplicate') return { ok: false, message: 'Você já avaliou este prestador neste aparelho.' }
    if (result === 'unavailable') return { ok: false, message: 'Esse perfil não está disponível.' }
  } catch (err) {
    console.error('[submitReview]', err)
    return { ok: false, message: 'Não foi possível publicar sua avaliação. Tente de novo.' }
  }
  revalidatePath('/', 'layout')
  return { ok: true }
}

/** Guarda a cópia do pedido de orçamento (o envio em si acontece no WhatsApp, pelo navegador). */
export async function submitQuote(input: unknown): Promise<ActionResult> {
  if (!rateLimit(`quote:${await clientIp()}`, 20, 60 * 60_000)) return { ok: false, message: TOO_MANY }

  const parsed = quoteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: 'Confira os campos.', fieldErrors: firstErrors(parsed.error) }
  }
  try {
    if (!(await insertQuote(parsed.data))) return { ok: false, message: 'Esse perfil não está disponível.' }
  } catch (err) {
    console.error('[submitQuote]', err)
    return { ok: false, message: 'Não foi possível salvar o pedido.' }
  }
  revalidatePath('/admin')
  return { ok: true }
}
