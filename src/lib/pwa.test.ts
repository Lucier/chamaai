import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { describe, expect, it, vi } from 'vitest'
import manifest from '@/app/manifest'
import { buildInstallHelp, isMobileUserAgent } from './pwa-install'

describe('manifest do PWA', () => {
  const m = manifest()
  const icon = (size: string, purpose: string) =>
    m.icons?.find((i) => i.sizes === size && (i.purpose ?? 'any') === purpose)

  it('cumpre os critérios de instalação (nome, start_url, display, ícones)', () => {
    expect(m.name && m.short_name).toBeTruthy()
    expect(m.start_url).toBe('/')
    expect(m.scope).toBe('/')
    expect(['standalone', 'fullscreen', 'minimal-ui']).toContain(m.display)
    expect(icon('192x192', 'any')).toBeDefined()
    expect(icon('512x512', 'any')).toBeDefined()
  })
  it('tem ícone maskable e todos os arquivos de ícone existem em public/', () => {
    expect(icon('512x512', 'maskable')).toBeDefined()
    for (const i of m.icons ?? []) {
      expect(() => readFileSync(path.join('public', i.src)), i.src).not.toThrow()
    }
  })
  it('usa as cores do tema do app', () => {
    expect(m.theme_color).toBe('#0f6b73')
    expect(m.lang).toBe('pt-BR')
  })
})

/* ---------- service worker: carregado num sandbox com mocks ---------- */

function loadServiceWorker() {
  const handlers: Record<string, (e: unknown) => void> = {}
  const store = new Map<string, unknown>()
  const cache = {
    match: vi.fn(async (req: { url?: string } | string) => store.get(typeof req === 'string' ? req : (req.url ?? ''))),
    put: vi.fn(async (req: { url: string }, res: unknown) => void store.set(req.url, res)),
    add: vi.fn(async () => undefined),
  }
  const caches = {
    open: vi.fn(async () => cache),
    match: vi.fn(async (url: string) => (url === '/offline.html' ? 'OFFLINE_PAGE' : undefined)),
    keys: vi.fn(async () => ['chamaai-v0', 'chamaai-v1', 'outra-coisa']),
    delete: vi.fn(async () => true),
  }
  const fetchMock = vi.fn()
  const self = {
    addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn),
    location: { origin: 'http://localhost:3000' },
    skipWaiting: vi.fn(async () => undefined),
    clients: { claim: vi.fn(async () => undefined) },
  }
  // Num SW de verdade, `new Request("/offline.html")` resolve contra a origem; o Request do Node recusa URL relativa.
  class FakeRequest {
    constructor(
      public url: string,
      public init?: unknown,
    ) {}
  }
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    self,
    caches,
    fetch: fetchMock,
    URL,
    Request: FakeRequest,
    Promise,
  })

  /** Dispara um evento fetch e diz se o SW assumiu a resposta (e qual). */
  async function dispatch(init: { method?: string; url: string; mode?: string }) {
    const respondWith = vi.fn()
    handlers.fetch!({
      request: { method: init.method ?? 'GET', url: init.url, mode: init.mode ?? 'no-cors' },
      respondWith,
    })
    return respondWith.mock.calls.length
      ? { intercepted: true as const, response: await respondWith.mock.calls[0]![0] }
      : { intercepted: false as const }
  }
  return { handlers, caches, cache, self, fetchMock, dispatch }
}

describe('service worker', () => {
  const O = 'http://localhost:3000'

  it('navegação vai SEMPRE para a rede, sem gravar nada no cache (admin e dados nunca ficam velhos)', async () => {
    const sw = loadServiceWorker()
    sw.fetchMock.mockResolvedValue('PAGINA_DA_REDE')
    for (const p of ['/', '/admin', '/admin?aba=aprovados', '/prestador/123']) {
      const r = await sw.dispatch({ url: O + p, mode: 'navigate' })
      expect(r, p).toEqual({ intercepted: true, response: 'PAGINA_DA_REDE' })
    }
    expect(sw.cache.put).not.toHaveBeenCalled()
  })
  it('navegação sem rede mostra a página offline', async () => {
    const sw = loadServiceWorker()
    sw.fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await sw.dispatch({ url: O + '/', mode: 'navigate' })).toEqual({
      intercepted: true,
      response: 'OFFLINE_PAGE',
    })
  })
  it('não toca em POST (Server Actions), outras origens, /api, /uploads, /admin (não-navegação) e RSC', async () => {
    const sw = loadServiceWorker()
    for (const r of [
      { method: 'POST', url: O + '/admin' },
      { method: 'PUT', url: O + '/x' },
      { url: 'https://cdn.exemplo.com/_next/static/a.js' },
      { url: O + '/api/health' },
      { url: O + '/uploads/prestadores/abc/1.jpg' },
      { url: O + '/admin?_rsc=abc' },
      { url: O + '/manifest.webmanifest' },
    ]) {
      expect((await sw.dispatch(r)).intercepted, `${r.method ?? 'GET'} ${r.url}`).toBe(false)
    }
    expect(sw.fetchMock).not.toHaveBeenCalled()
  })
  it('/_next/static é cache-first: 1ª vez busca e guarda, 2ª vem do cache sem rede', async () => {
    const sw = loadServiceWorker()
    const res = { ok: true, type: 'basic', clone: () => 'CLONE' }
    sw.fetchMock.mockResolvedValue(res)
    const url = O + '/_next/static/chunks/app-abc123.js'
    expect((await sw.dispatch({ url })).response).toBe(res)
    expect(sw.cache.put).toHaveBeenCalledTimes(1)
    expect((await sw.dispatch({ url })).response).toBe('CLONE')
    expect(sw.fetchMock).toHaveBeenCalledTimes(1)
  })
  it('não guarda resposta com erro', async () => {
    const sw = loadServiceWorker()
    sw.fetchMock.mockResolvedValue({ ok: false, type: 'basic', clone: () => 'X' })
    await sw.dispatch({ url: O + '/_next/static/chunks/quebrado.js' })
    expect(sw.cache.put).not.toHaveBeenCalled()
  })
  it('install pré-carrega só a página offline; activate apaga caches antigos do app e assume o controle', async () => {
    const sw = loadServiceWorker()
    const waits: Promise<unknown>[] = []
    sw.handlers.install!({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    sw.handlers.activate!({ waitUntil: (p: Promise<unknown>) => waits.push(p) })
    await Promise.all(waits)
    expect(sw.cache.add).toHaveBeenCalledTimes(1)
    expect(sw.self.skipWaiting).toHaveBeenCalled()
    expect(sw.caches.delete).toHaveBeenCalledTimes(1)
    expect(sw.caches.delete).toHaveBeenCalledWith('chamaai-v0')
    expect(sw.self.clients.claim).toHaveBeenCalled()
  })
})

/* ---------- botão de instalar: detecção de celular e passo a passo por navegador ---------- */

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1',
  ipadOs:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  androidTablet:
    'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:125.0) Gecko/125.0 Firefox/125.0',
  instagramIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.12.109 (iPhone14,2; iOS 17_4)',
  androidWebView:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  desktopFirefox: 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
}

describe('botão de instalar: quem é celular', () => {
  it('celulares e tablets Android/iOS são celular', () => {
    for (const ua of [
      UA.iphoneSafari,
      UA.iphoneChrome,
      UA.androidChrome,
      UA.androidTablet,
      UA.samsung,
      UA.firefoxAndroid,
      UA.instagramIos,
      UA.androidWebView,
    ]) {
      expect(isMobileUserAgent(ua), ua).toBe(true)
    }
  })
  it('iPadOS se disfarça de Mac: só é reconhecido pelo toque múltiplo', () => {
    expect(isMobileUserAgent(UA.ipadOs)).toBe(false)
    expect(isMobileUserAgent(UA.ipadOs, true)).toBe(true)
  })
  it('desktop não é celular (não ganha o botão de instruções)', () => {
    expect(isMobileUserAgent(UA.desktopChrome)).toBe(false)
    expect(isMobileUserAgent(UA.desktopFirefox)).toBe(false)
  })
})

describe('botão de instalar: passo a passo por navegador', () => {
  const help = (ua: string, secure = true, ipadOs = false) => buildInstallHelp({ ua, secure, ipadOs })

  it('iPhone (Safari ou Chrome) e iPad: Compartilhar → Adicionar à Tela de Início, sem aviso de http', () => {
    for (const h of [help(UA.iphoneSafari, false), help(UA.iphoneChrome, false), help(UA.ipadOs, false, true)]) {
      expect(h.steps.join(' ')).toMatch(/Compartilhar/)
      expect(h.steps.join(' ')).toMatch(/Adicionar à Tela de Início/)
      expect(h.note).toBeUndefined() // no iOS o atalho funciona mesmo em http
    }
  })
  it('Android Chrome: menu ⋮ → Instalar app / Adicionar à tela inicial', () => {
    const h = help(UA.androidChrome)
    expect(h.steps.join(' ')).toMatch(/⋮/)
    expect(h.steps.join(' ')).toMatch(/Instalar app/)
    expect(h.note).toBeUndefined()
  })
  it('Samsung Internet e Firefox têm passos próprios', () => {
    expect(help(UA.samsung).steps.join(' ')).toMatch(/Adicionar página a/)
    expect(help(UA.firefoxAndroid).steps.join(' ')).toMatch(/Instalar/)
    expect(help(UA.firefoxAndroid).browser).toMatch(/Firefox/)
  })
  it('em http (fora do localhost) avisa que só dá para criar um atalho — exceto no iOS', () => {
    for (const ua of [UA.androidChrome, UA.samsung, UA.firefoxAndroid]) {
      expect(help(ua, false).note, ua).toMatch(/https/)
    }
  })
  it('navegador embutido em outro app manda abrir no navegador de verdade', () => {
    for (const ua of [UA.instagramIos, UA.androidWebView]) {
      const h = help(ua, false)
      expect(h.steps.join(' '), ua).toMatch(/Abrir no navegador/)
    }
  })
  it('todo caminho tem pelo menos 3 passos e nenhum passo vazio', () => {
    for (const ua of Object.values(UA)) {
      const h = help(ua, false, ua === UA.ipadOs)
      expect(h.steps.length).toBeGreaterThanOrEqual(3)
      expect(h.steps.every((x) => x.trim().length > 0)).toBe(true)
      expect(h.browser.length).toBeGreaterThan(0)
    }
  })
})
