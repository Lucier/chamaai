import 'server-only'
import type { ProviderData } from '@/lib/schemas'
import type { ProviderStatus } from '@/lib/constants'
import { PG_UNIQUE_VIOLATION, query, queryOne } from './db'
import { removePhotos } from './uploads'

export async function insertProvider(id: string, data: ProviderData, photoKeys: string[]): Promise<void> {
  await query(
    `insert into providers
       (id, name, whatsapp, category, city, price, description, photos, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'pending')`,
    [id, data.name, data.whatsapp, data.category, data.city, data.price, data.description, photoKeys],
  )
}

export async function updateProviderStatus(id: string, status: ProviderStatus): Promise<boolean> {
  const row = await queryOne('update providers set status = $2 where id = $1 returning id', [id, status])
  return row !== null
}

/** Apaga o prestador (avaliações e orçamentos saem junto, por cascade) e as fotos do disco. */
export async function deleteProvider(id: string): Promise<boolean> {
  const row = await queryOne<{ photos: string[] }>('delete from providers where id = $1 returning photos', [id])
  if (!row) return false
  await removePhotos(row.photos)
  return true
}

export type NewReview = { providerId: string; author: string; stars: number; comment: string | null; deviceId: string }

/** "approved" = prestador aprovado; "duplicate" = esse aparelho já avaliou; "unavailable" = prestador inexistente/não aprovado. */
export async function insertReview(r: NewReview): Promise<'created' | 'duplicate' | 'unavailable'> {
  try {
    const row = await queryOne(
      `insert into reviews (provider_id, author, stars, comment, device_id)
       select p.id, $2, $3, $4, $5 from providers p where p.id = $1 and p.status = 'approved'
       returning id`,
      [r.providerId, r.author, r.stars, r.comment, r.deviceId],
    )
    return row ? 'created' : 'unavailable'
  } catch (err) {
    if ((err as { code?: string }).code === PG_UNIQUE_VIOLATION) return 'duplicate'
    throw err
  }
}

export async function deleteReview(id: string): Promise<boolean> {
  return (await queryOne('delete from reviews where id = $1 returning id', [id])) !== null
}

export type NewQuote = {
  providerId: string
  clientName: string
  clientPhone: string | null
  neighborhood: string
  preferredWhen: string
  details: string
}

export async function insertQuote(q: NewQuote): Promise<boolean> {
  const row = await queryOne(
    `insert into quotes (provider_id, client_name, client_phone, neighborhood, preferred_when, details)
     select p.id, $2, $3, $4, $5, $6 from providers p where p.id = $1 and p.status = 'approved'
     returning id`,
    [q.providerId, q.clientName, q.clientPhone, q.neighborhood, q.preferredWhen, q.details],
  )
  return row !== null
}

export async function deleteQuote(id: string): Promise<boolean> {
  return (await queryOne('delete from quotes where id = $1 returning id', [id])) !== null
}
