import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { PublicLandingSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, PageCanvas, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { ChatWidget } from '../features/ChatWidget'
import { PublicForm } from '../features/PublicForm'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function LandingPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('public')
  const query = useQuery({
    queryKey: ['public-page', slug],
    queryFn: ({ signal }) => api(`/public/pages/${encodeURIComponent(slug)}`, { schema: PublicLandingSchema, signal }),
  })

  if (query.isPending) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isApiError(query.error, 'not_found')) return <PublicNotFound />
  if (query.error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <ErrorState supportCode={isApiError(query.error) ? query.error.supportCode : undefined} onRetry={() => void query.refetch()} />
      </main>
    )
  }
  if (!query.data) return <PublicNotFound />

  const { page, business, brandColor, showPoweredBy, bookingSlug, privacyHref, languages, city, formId, whatsappHref } =
    query.data
  return (
    <PublicShell
      tenant={{
        slug: bookingSlug,
        name: business,
        brandColor,
        showPoweredBy,
        locale: document.documentElement.lang || 'en',
        languages,
        city,
        timezone: 'Africa/Lagos',
        currency: 'NGN',
        privacyHref,
      }}
    >
      <PageCanvas blocks={page.blocks.filter((block) => block.type !== 'booking' && block.type !== 'form')} />
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild>
          <a href={`/b/${bookingSlug}`}>{t('landing.book')}</a>
        </Button>
        <Button asChild variant="outline">
          <a href={whatsappHref}>{t('landing.whatsapp')}</a>
        </Button>
      </div>
      {formId && (
        <div className="mt-8 rounded-lg border border-border p-4">
          <PublicForm formId={formId} framed />
        </div>
      )}
      <div className="mt-8 overflow-hidden rounded-lg border border-border">
        <iframe title={t('landing.book')} src={`/b/${bookingSlug}`} className="h-[32rem] w-full border-0" />
      </div>
      <ChatWidget slug={bookingSlug} />
    </PublicShell>
  )
}

export const Route = createFileRoute('/p/$slug')({ component: LandingPage })
