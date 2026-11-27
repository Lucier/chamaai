import { mkdir, readFile, rm, rmdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { MAX_PHOTO_BYTES, MAX_PHOTOS } from '@/lib/constants'
import { getEnv } from './env'

export class UploadError extends Error {}

const EXT_MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' } as const
type Ext = keyof typeof EXT_MIME

/** Identifica o formato pelos primeiros bytes (não confia no nome nem no Content-Type enviados). */
export function sniffImage(buf: Buffer): Ext | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg'
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png'
  }
  if (
    buf.length > 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp'
  }
  return null
}

/** URL pública de uma foto a partir da chave guardada no banco. */
export const photoUrl = (key: string) => `/uploads/${key}`

/** Grava as fotos e devolve as chaves (relativas a UPLOAD_DIR). Em caso de erro, apaga o que já gravou. */
export async function savePhotos(providerId: string, files: File[]): Promise<string[]> {
  if (files.length > MAX_PHOTOS) throw new UploadError(`Máximo de ${MAX_PHOTOS} fotos.`)
  const root = getEnv().UPLOAD_DIR
  const keys: string[] = []
  try {
    for (const [i, file] of files.entries()) {
      if (file.size > MAX_PHOTO_BYTES) throw new UploadError('Foto muito grande ou em formato não aceito.')
      const buf = Buffer.from(await file.arrayBuffer())
      const ext = sniffImage(buf)
      if (!ext) throw new UploadError('Foto muito grande ou em formato não aceito.')
      const key = `prestadores/${providerId}/${i + 1}-${Date.now()}.${ext}`
      const target = path.join(root, key)
      await mkdir(/*turbopackIgnore: true*/ path.dirname(target), { recursive: true })
      await writeFile(/*turbopackIgnore: true*/ target, buf, { flag: 'wx' })
      keys.push(key)
    }
    return keys
  } catch (err) {
    await removePhotos(keys)
    throw err
  }
}

export async function removePhotos(keys: string[]): Promise<void> {
  const root = getEnv().UPLOAD_DIR
  const dirs = new Set<string>()
  for (const key of keys) {
    const file = resolveUploadPath(key)
    if (!file) continue
    await rm(/*turbopackIgnore: true*/ file, { force: true }).catch((e) =>
      console.warn('[uploads] não removeu', key, e),
    )
    dirs.add(path.dirname(file))
  }
  for (const dir of dirs) {
    // rmdir só remove pasta vazia (e falha em silêncio se ainda houver algo dentro)
    if (dir !== root) await rmdir(/*turbopackIgnore: true*/ dir).catch(() => undefined)
  }
}

const KEY_RE = /^prestadores\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+\.(jpg|png|webp)$/

/** Converte uma chave em caminho de arquivo, ou null se for inválida / tentar sair da pasta. */
export function resolveUploadPath(key: string): string | null {
  if (!KEY_RE.test(key) || key.includes('..')) return null
  const root = getEnv().UPLOAD_DIR
  const full = path.resolve(root, key)
  return full.startsWith(root + path.sep) ? full : null
}

export async function readUpload(key: string): Promise<{ data: Buffer; contentType: string } | null> {
  const file = resolveUploadPath(key)
  if (!file) return null
  try {
    const ext = path.extname(file).slice(1) as Ext
    return { data: await readFile(/*turbopackIgnore: true*/ file), contentType: EXT_MIME[ext] }
  } catch {
    return null
  }
}
