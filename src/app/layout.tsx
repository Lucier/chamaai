import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import type { ReactNode } from 'react'
import { Footer } from '@/components/layout/footer'
import { PwaRegister } from '@/components/layout/pwa'
import { Topbar } from '@/components/layout/topbar'
import { Providers } from '@/components/ui/providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'Chama Aí — Profissionais de confiança perto de você', template: '%s | Chama Aí' },
  description:
    'Encontre eletricistas, diaristas, encanadores e outros profissionais da sua cidade e fale direto pelo WhatsApp.',
  applicationName: 'Chama Aí',
  // iOS: abre em tela cheia quando adicionado à Tela de Início. O ícone vem de app/apple-icon.png.
  appleWebApp: { capable: true, title: 'Chama Aí', statusBarStyle: 'default' },
}

export const viewport: Viewport = { themeColor: '#0F6B73', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="flex flex-col">
        <Providers>
          <Topbar />
          <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 pb-12 md:pt-8">{children}</main>
          <Footer />
          {modal}
          <PwaRegister />
        </Providers>
      </body>
    </html>
  )
}
