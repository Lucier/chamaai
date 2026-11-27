import { readUpload } from '@/server/uploads'

export const dynamic = 'force-dynamic'

/** Serve as fotos gravadas em UPLOAD_DIR (o `public/` do Next não enxerga arquivos criados depois do build). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params
  const file = await readUpload(path.join('/'))
  if (!file) return new Response('Não encontrado', { status: 404 })
  return new Response(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.contentType,
      // O nome do arquivo inclui timestamp: nunca muda, então pode ficar em cache "para sempre".
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
