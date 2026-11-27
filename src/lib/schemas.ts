import { z } from 'zod'
import { ADMIN_TAB_VALUES, CATEGORY_NAMES, PROVIDER_STATUSES, SORT_VALUES, WHEN_OPTIONS } from './constants'
import { normalizePhone, parsePrice } from './format'

/* Schemas compartilhados: o navegador valida para dar resposta imediata
   e o servidor valida de novo (nunca confie só no cliente). */

export const idSchema = z.uuid('Identificador inválido.')

/* ---------------- Cadastro de prestador ---------------- */

export const providerSchema = z.object({
  name: z.string().trim().min(3, 'Informe seu nome (mínimo 3 letras).').max(80, 'Use no máximo 80 caracteres.'),
  whatsapp: z.string().transform((v, ctx) => {
    const n = normalizePhone(v)
    if (!n) {
      ctx.addIssue({
        code: 'custom',
        message: 'WhatsApp inválido. Use DDD + número, ex: (89) 99999-9999.',
      })
      return z.NEVER
    }
    return n
  }),
  category: z
    .string()
    .trim()
    .min(1, 'Escolha uma categoria.')
    .refine((v) => (CATEGORY_NAMES as readonly string[]).includes(v), 'Escolha uma categoria.'),
  city: z.string().trim().min(2, 'Informe a cidade.').max(60, 'Use no máximo 60 caracteres.'),
  /** Texto digitado; vazio = "a combinar". Convertido em número por parseProvider(). */
  price: z.string().trim(),
  description: z
    .string()
    .trim()
    .min(20, 'Descreva seu serviço com pelo menos 20 caracteres.')
    .max(1000, 'Use no máximo 1000 caracteres.'),
  terms: z.literal(true, 'Marque esta opção para enviar.'),
})

export type ProviderData = Omit<z.output<typeof providerSchema>, 'price' | 'terms'> & { price: number }

export type ParseResult<T> = { success: true; data: T } | { success: false; errors: Record<string, string> }

/**
 * Valida o cadastro inteiro e devolve TODOS os erros de uma vez (um por campo).
 * O preço é opcional: em branco vira 0, que a interface mostra como "A combinar". Preenchido,
 * precisa ser um valor entre 0,01 e 999.999,99 — por isso a conversão fica aqui e não no schema.
 */
export function parseProvider(input: unknown): ParseResult<ProviderData> {
  const parsed = providerSchema.safeParse(input)
  const errors = parsed.success ? {} : firstErrors(parsed.error)

  const raw = (input ?? {}) as Record<string, unknown>
  const priceText = String(raw.price ?? '').trim()
  let price = 0
  if (priceText) {
    const n = parsePrice(priceText)
    if (n === null || !(n > 0) || n >= 1_000_000) {
      errors.price = 'Informe um preço válido, ex: 80 (ou deixe em branco se for a combinar).'
    } else {
      price = n
    }
  }

  if (!parsed.success || Object.keys(errors).length) return { success: false, errors }
  const { name, whatsapp, category, city, description } = parsed.data
  return { success: true, data: { name, whatsapp, category, city, description, price } }
}

/* ---------------- Avaliação ---------------- */

export const reviewSchema = z.object({
  providerId: idSchema,
  stars: z.coerce
    .number('Escolha de 1 a 5 estrelas.')
    .int('Escolha de 1 a 5 estrelas.')
    .min(1, 'Escolha de 1 a 5 estrelas.')
    .max(5, 'Escolha de 1 a 5 estrelas.'),
  author: z.string().trim().min(2, 'Informe seu nome.').max(60, 'Use no máximo 60 caracteres.'),
  comment: z
    .string()
    .trim()
    .max(500, 'Use no máximo 500 caracteres.')
    .transform((v) => v || null),
})
export type ReviewInput = z.input<typeof reviewSchema>

/* ---------------- Pedido de orçamento ---------------- */

export const quoteSchema = z.object({
  providerId: idSchema,
  clientName: z.string().trim().min(2, 'Informe seu nome.').max(80, 'Use no máximo 80 caracteres.'),
  clientPhone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || v.replace(/\D/g, '').length >= 10, 'Telefone incompleto. Use DDD + número.')
    .transform((v) => v || null),
  neighborhood: z.string().trim().min(2, 'Informe seu bairro.').max(60, 'Use no máximo 60 caracteres.'),
  preferredWhen: z.enum(WHEN_OPTIONS, 'Escolha para quando.'),
  details: z
    .string()
    .trim()
    .min(10, 'Conte um pouco mais (mínimo 10 caracteres).')
    .max(1000, 'Use no máximo 1000 caracteres.'),
})
export type QuoteInput = z.input<typeof quoteSchema>

/* ---------------- Login do admin ---------------- */

/** O bcrypt só usa os primeiros 72 BYTES (não caracteres) da senha. */
const BCRYPT_MAX_BYTES = 72
const byteLength = (v: string) => new TextEncoder().encode(v).length

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Informe um e-mail válido.')),
  password: z
    .string()
    .min(1, 'Informe a senha.')
    // Nenhuma senha válida passa de 72 bytes; recusar antes evita hashear entrada gigante.
    .refine((v) => byteLength(v) <= BCRYPT_MAX_BYTES, 'E-mail ou senha incorretos.'),
})
export type LoginInput = z.input<typeof loginSchema>

/**
 * Política da senha do admin (aplicada ao CRIAR/TROCAR a senha, não no login, para nunca
 * trancar ninguém para fora por causa de uma regra nova).
 */
export const adminPasswordSchema = z
  .string()
  .min(10, 'A senha precisa ter pelo menos 10 caracteres.')
  .refine(
    (v) => byteLength(v) <= BCRYPT_MAX_BYTES,
    `A senha pode ter no máximo ${BCRYPT_MAX_BYTES} bytes (limite do bcrypt).`,
  )
  .refine((v) => /\p{L}/u.test(v) && /\d/.test(v), 'A senha precisa misturar letras e números.')

/** E-mail + senha de um admin novo; a senha não pode conter a parte local do e-mail. */
export const adminCredentialsSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email('ADMIN_EMAIL inválido')),
    password: adminPasswordSchema,
  })
  .superRefine(({ email, password }, ctx) => {
    const local = email.split('@')[0] ?? ''
    if (local.length >= 4 && password.toLowerCase().includes(local)) {
      ctx.addIssue({ code: 'custom', path: ['password'], message: 'A senha não pode conter o seu e-mail.' })
    }
  })

/* ---------------- Ações do admin ---------------- */

export const statusChangeSchema = z.object({
  id: idSchema,
  status: z.enum(PROVIDER_STATUSES),
})

/* ---------------- Parâmetros de URL ---------------- */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .catch(undefined)
    .transform((v) => v || '')

/** Filtros da busca (?q=&categoria=&cidade=&ordem=). Valores inválidos viram o padrão. */
export const searchParamsSchema = z.object({
  q: optionalText(100),
  categoria: optionalText(60),
  cidade: optionalText(60),
  ordem: z.enum(SORT_VALUES).catch('avaliacao'),
})
export type SearchFilters = z.output<typeof searchParamsSchema>

export const adminTabSchema = z.enum(ADMIN_TAB_VALUES).catch('pendentes')

/** Converte fieldErrors do Zod em { campo: primeira mensagem }. */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
