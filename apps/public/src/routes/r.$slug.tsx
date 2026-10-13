import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { PublicReviewLandingSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function ReviewPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('public')
  const query = useQuery({
    queryKey: ['public-review', slug],
    queryFn: ({ signal }) => api(`/public/reviews/${slug}`, { schema: PublicReviewLandingSchema, signal }),
  })
  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-32 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <PublicShell tenant={query.data}>
      <h1 className="text-2xl font-semibold">{t('review.title', { business: query.data.name })}</h1>
      <p className="mt-2 text-fg-muted">{t('review.body', { location: query.data.locationName })}</p>
      <Button className="mt-6" asChild>
        <a href={query.data.googleHref} rel="noreferrer">
          {t('review.cta')}
        </a>
      </Button>
    </PublicShell>
  )
}

export const Route = createFileRoute('/r/$slug')({ component: ReviewPage })
