import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { useTranslation } from '@deskhand/i18n'
import { isApiError } from '@deskhand/schemas'
import { Button, ErrorState, Skeleton } from '@deskhand/ui'
import { useState } from 'react'
import { publicTenantQuery } from '../../api'
import { BookingFlow } from '../../features/BookingFlow'
import { PublicNotFound } from '../__root'

function EmbedDemo() {
  const { slug } = Route.useParams()
  const search = Route.useSearch()
  const { mode } = search
  const framed = search.framed === '1' || search.framed === 'true'
  const { t } = useTranslation('public')
  const { data: tenant, isPending, error } = useQuery(publicTenantQuery(slug))
  const [open, setOpen] = useState(mode === 'inline')

  if (isPending) return <Skeleton className="mx-auto mt-20 h-48 max-w-lg" />
  if (isApiError(error, 'not_found') || !tenant) return <PublicNotFound />
  if (error) return <ErrorState />

  const flow = open ? (
    <div className="mx-auto max-w-lg rounded-lg border border-border bg-surface p-4">
      <BookingFlow slug={slug} source="embed" />
    </div>
  ) : null

  return (
    <main className={framed ? 'bg-transparent p-0' : 'min-h-dvh bg-bg p-6'}>
      {!framed && <h1 className="text-lg font-semibold">{t('embed.title')}</h1>}
      {mode === 'inline' && flow}
      {mode === 'popup' && (
        <>
          <Button className="mt-4" onClick={() => setOpen(true)}>
            {t('embed.open')}
          </Button>
          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4">
              <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-surface p-4">
                <Button variant="ghost" className="mb-2" onClick={() => setOpen(false)}>
                  {t('booking.back')}
                </Button>
                <BookingFlow slug={slug} source="embed" />
              </div>
            </div>
          )}
        </>
      )}
      {mode === 'floating' && (
        <>
          {open && <div className="mx-auto mt-8 max-w-lg">{flow}</div>}
          <button
            type="button"
            className="fixed bottom-6 end-6 z-40 rounded-full bg-brand px-4 py-3 text-sm font-medium text-brand-fg shadow-lg"
            onClick={() => setOpen((v) => !v)}
          >
            {t('embed.open')}
          </button>
        </>
      )}
    </main>
  )
}

export const Route = createFileRoute('/b/$slug/embed')({
  validateSearch: z.object({
    mode: z.enum(['inline', 'popup', 'floating']).default('inline'),
    framed: z.string().optional(),
  }),
  component: EmbedDemo,
})
