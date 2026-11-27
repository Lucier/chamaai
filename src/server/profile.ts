import 'server-only'
import { cache } from 'react'
import { idSchema } from '@/lib/schemas'
import type { ProviderWithRating } from '@/lib/types'
import { getAdmin } from './auth'
import { getProvider } from './queries'

/**
 * Carrega um perfil respeitando a visibilidade: o público só vê prestadores aprovados;
 * o admin vê qualquer um (para conferir o cadastro). Memoizado por requisição.
 */
export const loadProfile = cache(
  async (id: string): Promise<{ provider: ProviderWithRating; isAdmin: boolean } | null> => {
    if (!idSchema.safeParse(id).success) return null
    const [provider, admin] = await Promise.all([getProvider(id), getAdmin()])
    if (!provider) return null
    if (provider.status !== 'approved' && !admin) return null
    return { provider, isAdmin: Boolean(admin) }
  },
)
