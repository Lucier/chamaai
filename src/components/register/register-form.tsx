'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition, type ChangeEvent, type FormEvent } from 'react'
import { registerProvider } from '@/actions/providers'
import { Button, buttonClasses } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Field, Required, SelectField, TextareaField, TextField } from '@/components/ui/fields'
import { CheckIcon } from '@/components/ui/icons'
import { useToast } from '@/components/ui/providers'
import { CATEGORIES, MAX_PHOTOS } from '@/lib/constants'
import { maskPhone } from '@/lib/format'
import { compressImage } from '@/lib/image'
import { parseProvider } from '@/lib/schemas'

type Photo = { blob: Blob; url: string }
const initial = { name: '', whatsapp: '', category: '', city: '', price: '', description: '', terms: false }
type FormState = typeof initial
const FIELD_ORDER = ['name', 'whatsapp', 'category', 'city', 'price', 'description', 'terms']

export function RegisterForm({ cities }: { cities: string[] }) {
  const toast = useToast()
  const [form, setForm] = useState<FormState>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [photos, setPhotos] = useState<Photo[]>([])
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const photosRef = useRef<Photo[]>([])
  useEffect(() => {
    photosRef.current = photos
  }, [photos])
  // libera as URLs temporárias das prévias ao sair da tela
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    if (errors[key]) setErrors((e) => ({ ...e, [key]: '' }))
  }
  const text = (key: Exclude<keyof FormState, 'terms'>) => ({
    name: key,
    value: form[key],
    error: errors[key],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => set(key, e.target.value),
  })

  async function onPhotos(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    const room = MAX_PHOTOS - photos.length
    if (files.length > room) toast(`Máximo de ${MAX_PHOTOS} fotos. ${room > 0 ? `Vou usar só ${room}.` : ''}`, 'error')
    for (const file of files.slice(0, Math.max(0, room))) {
      if (!file.type.startsWith('image/')) {
        toast(`"${file.name}" não é uma imagem.`, 'error')
        continue
      }
      try {
        const blob = await compressImage(file)
        setPhotos((p) => [...p, { blob, url: URL.createObjectURL(blob) }])
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Não foi possível processar a foto.', 'error')
      }
    }
  }

  function removePhoto(i: number) {
    setPhotos((list) => {
      const removed = list[i]
      if (removed) URL.revokeObjectURL(removed.url)
      return list.filter((_, idx) => idx !== i)
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pending) return
    const parsed = parseProvider(form)
    if (!parsed.success) {
      setErrors(parsed.errors)
      const first = FIELD_ORDER.find((k) => parsed.errors[k])
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      toast('Confira os campos marcados em vermelho.', 'error')
      return
    }
    const fd = new FormData()
    for (const [k, v] of Object.entries(form)) fd.append(k, String(v))
    photos.forEach((p, i) => fd.append('photos', new File([p.blob], `foto-${i + 1}.jpg`, { type: 'image/jpeg' })))

    startTransition(async () => {
      const res = await registerProvider(fd).catch(() => null)
      if (!res) return toast('Sem conexão com o servidor. Confira a internet e tente de novo.', 'error')
      if (!res.ok) {
        if (res.fieldErrors) setErrors(res.fieldErrors)
        return toast(res.message, 'error')
      }
      photos.forEach((p) => URL.revokeObjectURL(p.url))
      setPhotos([])
      setForm(initial)
      setErrors({})
      setSuccess(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (success) {
    return (
      <Card className="border border-[#bbf7d0] bg-success-soft text-center">
        <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-success text-white">
          <CheckIcon className="size-7" />
        </div>
        <h1>Cadastro recebido!</h1>
        <p className="mx-auto mt-2 mb-6 max-w-[440px] text-muted">
          Agora nossa equipe vai conferir suas informações. Assim que for aprovado, seu perfil aparece para os clientes
          da sua cidade.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
          <Button variant="ghost" onClick={() => setSuccess(false)}>
            Cadastrar outro profissional
          </Button>
          <Link href="/" className={buttonClasses()}>
            Ver o catálogo
          </Link>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <h1 id="t-reg">Divulgue seu serviço grátis</h1>
        <p className="mt-1.5 text-muted">
          Preencha seus dados. Os campos com <span className="text-danger">*</span> são obrigatórios.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            id="rName"
            maxLength={80}
            placeholder="Ex: João Silva Elétrica"
            autoComplete="name"
            className="md:col-span-2"
            label={
              <>
                Nome completo ou nome do negócio <Required />
              </>
            }
            {...text('name')}
          />
          <TextField
            id="rWa"
            inputMode="tel"
            placeholder="(89) 99999-9999"
            autoComplete="tel"
            label={
              <>
                WhatsApp com DDD <Required />
              </>
            }
            {...text('whatsapp')}
            onChange={(e) => set('whatsapp', maskPhone(e.target.value))}
          />
          <SelectField
            id="rCat"
            label={
              <>
                Categoria <Required />
              </>
            }
            {...text('category')}
          >
            <option value="">Escolha…</option>
            {CATEGORIES.map(([name, icon]) => (
              <option key={name} value={name}>
                {icon} {name}
              </option>
            ))}
          </SelectField>
          <TextField
            id="rCity"
            maxLength={60}
            list="dlCity"
            placeholder="Ex: Uruçuí - PI"
            label={
              <>
                Cidade <Required />
              </>
            }
            {...text('city')}
          />
          <datalist id="dlCity">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <TextField
            id="rPrice"
            inputMode="decimal"
            label="Preço inicial (R$)"
            {...text('price')}
            placeholder="Ex: 80 (em branco = a combinar)"
          />
          <TextareaField
            id="rDesc"
            maxLength={1000}
            className="md:col-span-2"
            placeholder="O que você faz, há quanto tempo trabalha, dias e horários de atendimento, se atende emergência…"
            label={
              <>
                Descreva seu serviço <Required />
              </>
            }
            {...text('description')}
            footer={<div className="ml-auto text-right text-xs text-muted">{form.description.length}/1000</div>}
          />

          <Field
            className="md:col-span-2"
            label={
              <>
                Fotos do seu trabalho <span className="text-muted">(até {MAX_PHOTOS}, a primeira vira a capa)</span>
              </>
            }
          >
            {photos.length < MAX_PHOTOS && (
              <label className="block cursor-pointer rounded-xl border-[1.5px] border-dashed border-[#c9d3d6] bg-[#fafbfc] p-5 text-center transition hover:border-primary hover:bg-primary-soft">
                <input type="file" accept="image/*" multiple className="sr-only" onChange={onPhotos} />
                <strong className="text-primary">📷 Toque para escolher fotos</strong>
                <div className="mt-1 text-[13px] text-muted">
                  As fotos são reduzidas automaticamente para o app carregar rápido.
                </div>
              </label>
            )}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {photos.map((p, i) => (
                  <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg bg-[#eef1f2]">
                    <img src={p.url} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      aria-label="Remover foto"
                      className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-full bg-ink/75 text-[20px] leading-none text-white transition hover:bg-danger pointer-coarse:size-11"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-white/90 px-1.5 py-0.5 text-[11px] font-semibold">
                        Capa
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Field>

          <Field className="md:col-span-2" label="" error={errors.terms}>
            <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-2.5 text-sm">
              <input
                type="checkbox"
                name="terms"
                checked={form.terms}
                onChange={(e) => set('terms', e.target.checked)}
                className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary"
              />
              <span>
                Confirmo que as informações são verdadeiras e autorizo que meu nome, WhatsApp e fotos apareçam no Chama
                Aí. <Required />
              </span>
            </label>
          </Field>
        </div>

        <Button type="submit" variant="accent" block className="mt-6" disabled={pending}>
          {pending ? (photos.length ? 'Enviando fotos e dados…' : 'Enviando…') : 'Enviar cadastro para aprovação'}
        </Button>
      </form>
    </Card>
  )
}
