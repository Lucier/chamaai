import type { NextConfig } from 'next'

const config: NextConfig = {
  // Gera .next/standalone: imagem Docker enxuta, sem node_modules completo.
  output: 'standalone',
  // O rastreador de arquivos arrasta o código-fonte de src/server para a imagem; ele já está compilado em .next.
  outputFileTracingExcludes: { '/*': ['./src/**/*'] },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // O navegador precisa rever o service worker a cada visita, senão uma versão nova demora a chegar.
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
  experimental: {
    serverActions: {
      // Cadastro envia até 4 fotos (já comprimidas no navegador, ~2 MB cada no máximo).
      bodySizeLimit: '12mb',
    },
  },
}

export default config
