'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { MAX_PHOTOS } from '@/lib/constants'
import { parseProvider } from '@/lib/schemas'
import type { ActionResult } from '@/lib/types'
import { insertProvider } from '@/server/mutations'
import { clientIp, rateLimit, TOO_MANY } from '@/server/rate-limit'
import { removePhotos, savePhotos, UploadError } from '@/server/uploads'

const text = (fd: FormData, key: string) => String(fd.get(key) ?? '')

/** Cadastro público de prestador (entra como "pendente" até o admin aprovar). */
export async function registerProvider(formData: FormData): Promise<ActionResult> {
  if (!rateLimit(`register:${await clientIp()}`, 5, 60 * 60_000)) {
    return { ok: false, message: TOO_MANY }
  }

  const parsed = parseProvider({
    name: text(formData, 'name'),
    whatsapp: text(formData, 'whatsapp'),
    category: text(formData, 'category'),
    city: text(formData, 'city'),
    price: text(formData, 'price'),
    description: text(formData, 'description'),
    terms: text(formData, 'terms') === 'true',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Confira os campos marcados em vermelho.', fieldErrors: parsed.errors }
  }

  const files = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (files.length > MAX_PHOTOS) return { ok: false, message: `Máximo de ${MAX_PHOTOS} fotos.` }

  const id = randomUUID()
  let keys: string[] = []
  try {
    keys = await savePhotos(id, files)
    await insertProvider(id, parsed.data, keys)
  } catch (err) {
    await removePhotos(keys)
    if (err instanceof UploadError) return { ok: false, message: err.message }
    console.error('[registerProvider]', err)
    return { ok: false, message: 'Não foi possível enviar seu cadastro. Tente de novo em instantes.' }
  }

  revalidatePath('/', 'layout')
  return { ok: true }
}
