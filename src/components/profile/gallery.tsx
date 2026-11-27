'use client'

import clsx from 'clsx'
import { useState } from 'react'
import { Cover } from '@/components/ui/provider-visuals'
import type { Provider } from '@/lib/types'

export function Gallery({ provider }: { provider: Pick<Provider, 'photos' | 'name' | 'category'> }) {
  const { photos, name } = provider
  const [current, setCurrent] = useState(0)

  if (!photos.length) {
    return <Cover provider={provider} className="aspect-[16/6] text-[72px] md:rounded-t-xl" />
  }
  return (
    <>
      <img
        src={photos[current] ?? photos[0]}
        alt={`Foto de ${name}`}
        className="block aspect-video w-full bg-[#e8eef0] object-cover md:rounded-t-xl"
      />
      {photos.length > 1 && (
        <div className="flex gap-2 px-5 pt-3 md:px-6 print:hidden">
          {photos.map((url, i) => (
            <button
              key={url}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === current}
              className="min-w-0 max-w-16 flex-1 rounded-lg"
            >
              <img
                src={url}
                alt=""
                className={clsx(
                  'h-12 w-full rounded-lg border-2 object-cover transition',
                  i === current
                    ? 'border-primary opacity-100'
                    : 'border-transparent opacity-75 hover:border-primary hover:opacity-100',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </>
  )
}
