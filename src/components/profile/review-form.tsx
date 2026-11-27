'use client'

import clsx from 'clsx'
import { useState, useTransition, type FormEvent } from 'react'
import { submitReview } from '@/actions/engagement'
import { Button } from '@/components/ui/button'
import { InnerBox } from '@/components/ui/card'
import { Field, Required, TextareaField, TextField } from '@/components/ui/fields'
import { useToast } from '@/components/ui/providers'
import { firstErrors, reviewSchema } from '@/lib/schemas'

export function ReviewForm({ providerId }: { providerId: string }) {
  const toast = useToast()
  const [stars, setStars] = useState(0)
  const [author, setAuthor] = useState('')
  const [comment, setComment] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const input = { providerId, stars, author, comment }
    const parsed = reviewSchema.safeParse(input)
    if (!parsed.success) {
      const errs = firstErrors(parsed.error)
      // o schema fala de "1 a 5 estrelas"; o nome vazio tem mensagem própria
      setErrors(errs)
      return
    }
    startTransition(async () => {
      const res = await submitReview(input).catch(() => null)
      if (!res) return toast('Sem conexão com o servidor. Confira a internet e tente de novo.', 'error')
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        return toast(res.message, 'error')
      }
      toast('Obrigado! Sua avaliação foi publicada.', 'success')
      setStars(0)
      setAuthor('')
      setComment('')
      setErrors({})
    })
  }

  return (
    <InnerBox className="mt-8">
      <form onSubmit={onSubmit} noValidate>
        <h3>Deixe sua avaliação</h3>
        <div className="mt-4 flex flex-col gap-4">
          <Field
            label={
              <>
                Sua nota <Required />
              </>
            }
            error={errors.stars}
          >
            <div role="radiogroup" aria-label="Nota de 1 a 5" className="-ml-1 flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
                  onClick={() => {
                    setStars(n)
                    setErrors((x) => ({ ...x, stars: '' }))
                  }}
                  className={clsx(
                    'grid size-10 place-items-center text-[30px] leading-none transition hover:scale-110 pointer-coarse:size-11',
                    n <= stars ? 'text-star' : 'text-[#d9dee1]',
                  )}
                >
                  ★
                </button>
              ))}
            </div>
          </Field>
          <TextField
            id="rvName"
            maxLength={60}
            placeholder="Ex: Carla S."
            label={
              <>
                Seu nome <Required />
              </>
            }
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value)
              setErrors((x) => ({ ...x, author: '' }))
            }}
            error={errors.author}
          />
          <TextareaField
            id="rvCom"
            maxLength={500}
            placeholder="Como foi o atendimento?"
            className="[&_textarea]:min-h-20"
            label={
              <>
                Comentário <span className="text-muted">(opcional)</span>
              </>
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            error={errors.comment}
          />
          <div className="flex sm:justify-end">
            <Button type="submit" block className="sm:w-auto" disabled={pending}>
              {pending ? 'Publicando…' : 'Publicar avaliação'}
            </Button>
          </div>
        </div>
      </form>
    </InnerBox>
  )
}
