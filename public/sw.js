/*
 * Service worker do Chama Aí.
 *
 * Objetivo: deixar o app instalável e dar uma resposta decente sem internet — NÃO é um app offline.
 * As páginas são renderizadas no servidor com dados do banco e, para o admin, com sessão; guardá-las
 * em cache mostraria dado velho (ou, pior, uma tela de admin para quem já saiu). Por isso:
 *
 *   • Navegação (HTML)         -> sempre da REDE. Sem rede, mostra /offline.html. Nunca é cacheada.
 *   • /_next/static/*          -> cache-first. Os nomes têm hash do build, então nunca ficam "velhos".
 *   • Todo o resto             -> passa direto, sem o SW tocar: POST/Server Actions, /admin, /api,
 *                                 /uploads (fotos), payloads RSC, outras origens.
 *
 * Ao mudar este arquivo ou /offline.html, aumente VERSION: o navegador instala o novo SW e a
 * ativação apaga os caches antigos.
 */
const VERSION = 'v1'
const CACHE = `chamaai-${VERSION}`
const OFFLINE_URL = '/offline.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('chamaai-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req))
  }
})

async function cacheFirst(req) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req)
  if (hit) return hit
  const res = await fetch(req)
  if (res.ok && res.type === 'basic') cache.put(req, res.clone())
  return res
}
