import { describe, expect, it } from 'vitest'
import { formatPhone, maskPhone, normalizePhone, normalizeText, parsePrice } from './format'
import {
  adminCredentialsSchema,
  adminPasswordSchema,
  adminTabSchema,
  loginSchema,
  parseProvider,
  quoteSchema,
  reviewSchema,
  searchParamsSchema,
} from './schemas'
import { quoteMessage, whatsappLink } from './whatsapp'

describe('telefone', () => {
  it('aplica máscara progressiva', () => {
    expect(maskPhone('8')).toBe('(8')
    expect(maskPhone('89999')).toBe('(89) 999')
    expect(maskPhone('8999999999')).toBe('(89) 9999-9999')
    expect(maskPhone('89999999999')).toBe('(89) 99999-9999')
    expect(maskPhone('899999999991234')).toBe('(89) 99999-9999')
  })
  it('normaliza para 55 + DDD + número', () => {
    expect(normalizePhone('(89) 99999-9999')).toBe('5589999999999')
    expect(normalizePhone('0 89 9999-9999')).toBe('558999999999')
    expect(normalizePhone('5589999999999')).toBe('5589999999999')
    expect(normalizePhone('999')).toBeNull()
  })
  it('formata de volta', () => {
    expect(formatPhone('5589999999999')).toBe('(89) 99999-9999')
  })
})

describe('preço', () => {
  it('entende formatos brasileiros', () => {
    expect(parsePrice('80')).toBe(80)
    expect(parsePrice('R$ 80,50')).toBe(80.5)
    expect(parsePrice('1.200,00')).toBe(1200)
    expect(parsePrice('')).toBeNull()
    expect(parsePrice('abc')).toBeNull()
  })
})

describe('busca', () => {
  it('ignora acentos e caixa', () => {
    expect(normalizeText('  Elétrica Ção ')).toBe('eletrica cao')
  })
})

const validProvider = {
  name: 'João Silva Elétrica',
  whatsapp: '(89) 99999-9999',
  category: 'Eletricista',
  city: 'Uruçuí - PI',
  price: '80',
  description: 'Instalações e reparos elétricos residenciais.',
  terms: true,
}

describe('cadastro de prestador', () => {
  it('aceita dados válidos e normaliza', () => {
    const r = parseProvider(validProvider)
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.whatsapp).toBe('5589999999999')
      expect(r.data.price).toBe(80)
      expect('terms' in r.data).toBe(false)
    }
  })
  it("preço em branco é 'a combinar' e grava 0", () => {
    const r = parseProvider({ ...validProvider, price: '' })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.price).toBe(0)
  })
  it('rejeita preço preenchido que não seja um valor válido', () => {
    for (const price of ['abc', '0', '-5', '1000000']) {
      const r = parseProvider({ ...validProvider, price })
      expect(r.success).toBe(false)
      if (!r.success) expect(r.errors.price).toMatch(/preço válido/)
    }
  })
  it('não carrega bairro nem unidade de cobrança', () => {
    const r = parseProvider({ ...validProvider, neighborhood: 'Centro', priceUnit: 'por hora' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect('neighborhood' in r.data).toBe(false)
      expect('priceUnit' in r.data).toBe(false)
    }
  })
  it('devolve todos os erros de uma vez', () => {
    const r = parseProvider({
      name: 'Jo',
      whatsapp: '1',
      category: '',
      city: '',
      price: 'abc',
      description: 'curta',
      terms: false,
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      expect(Object.keys(r.errors).sort()).toEqual(
        ['category', 'city', 'description', 'name', 'price', 'terms', 'whatsapp'].sort(),
      )
    }
  })
  it('rejeita categoria desconhecida', () => {
    expect(parseProvider({ ...validProvider, category: 'Hacker' }).success).toBe(false)
  })
})

describe('avaliação e orçamento', () => {
  const id = '3f1c2b4e-6a7d-4e8f-9a0b-1c2d3e4f5a6b'
  it('avaliação exige nota de 1 a 5 e transforma comentário vazio em null', () => {
    expect(reviewSchema.safeParse({ providerId: id, stars: 0, author: 'Ana', comment: '' }).success).toBe(false)
    const ok = reviewSchema.safeParse({ providerId: id, stars: '5', author: 'Ana', comment: '  ' })
    expect(ok.success).toBe(true)
    if (ok.success) {
      expect(ok.data.stars).toBe(5)
      expect(ok.data.comment).toBeNull()
    }
  })
  it('orçamento: telefone é opcional mas, se vier, precisa de DDD', () => {
    const base = {
      providerId: id,
      clientName: 'Ana',
      neighborhood: 'Centro',
      preferredWhen: 'Esta semana',
      details: 'Trocar três tomadas',
    }
    expect(quoteSchema.safeParse({ ...base, clientPhone: '' }).success).toBe(true)
    expect(quoteSchema.safeParse({ ...base, clientPhone: '(89) 9999' }).success).toBe(false)
    expect(quoteSchema.safeParse({ ...base, clientPhone: '(89) 99999-9999' }).success).toBe(true)
  })
})

describe('parâmetros de URL', () => {
  it('usa padrões quando o valor é inválido', () => {
    const f = searchParamsSchema.parse({ q: ['a', 'b'], ordem: 'xyz' })
    expect(f).toEqual({ q: '', categoria: '', cidade: '', ordem: 'avaliacao' })
    expect(adminTabSchema.parse('???')).toBe('pendentes')
    expect(adminTabSchema.parse('orcamentos')).toBe('orcamentos')
  })
})

describe('whatsapp', () => {
  it('monta links com texto codificado', () => {
    const url = whatsappLink({ name: 'João', category: 'Eletricista', whatsapp: '5589999990001' })
    expect(url.startsWith('https://wa.me/5589999990001?text=')).toBe(true)
    expect(decodeURIComponent(url)).toContain('serviço de Eletricista')
    expect(
      quoteMessage('João', { clientName: 'Ana', neighborhood: 'Centro', preferredWhen: 'Esta semana', details: 'x' }),
    ).toContain('*Nome:* Ana')
  })
})

describe('login do admin', () => {
  it('normaliza o e-mail e exige senha', () => {
    const ok = loginSchema.safeParse({ email: '  Admin@Exemplo.COM ', password: 'x' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(ok.data.email).toBe('admin@exemplo.com')
    expect(loginSchema.safeParse({ email: 'admin@exemplo.com', password: '' }).success).toBe(false)
    expect(loginSchema.safeParse({ email: 'não-é-email', password: 'x' }).success).toBe(false)
  })
  it('recusa senha acima de 72 bytes (nenhuma senha válida chega lá)', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(72) }).success).toBe(true)
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'a'.repeat(73) }).success).toBe(false)
    // 40 caracteres "ã" = 80 bytes em UTF-8
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'ã'.repeat(40) }).success).toBe(false)
  })
})

describe('política de senha do admin', () => {
  const ruim = (pw: string) => adminPasswordSchema.safeParse(pw).success === false
  it('aceita senha longa o bastante, com letras e números', () => {
    expect(adminPasswordSchema.safeParse('cafe-com-leite-42').success).toBe(true)
    expect(adminPasswordSchema.safeParse('Ação1234567').success).toBe(true)
  })
  it('recusa curta, só letras, só números e acima de 72 bytes', () => {
    expect(ruim('abc123')).toBe(true)
    expect(ruim('apenasletrasaqui')).toBe(true)
    expect(ruim('1234567890123')).toBe(true)
    expect(ruim('a1'.repeat(37))).toBe(true) // 74 bytes
    expect(ruim('ã1'.repeat(25))).toBe(true) // só 50 caracteres, mas 75 bytes em UTF-8
    expect(ruim('ã1'.repeat(24))).toBe(false) // 72 bytes: no limite, ainda vale
  })
  it('a senha não pode conter a parte local do e-mail', () => {
    expect(adminCredentialsSchema.safeParse({ email: 'maria@x.com', password: 'Maria-2026-ok' }).success).toBe(false)
    expect(adminCredentialsSchema.safeParse({ email: 'maria@x.com', password: 'cafe-com-leite-42' }).success).toBe(true)
    // parte local curta demais para ser comparada
    expect(adminCredentialsSchema.safeParse({ email: 'ana@x.com', password: 'ana-cafe-leite-42' }).success).toBe(true)
  })
})
