import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { isApiError } from '@deskhand/schemas'
import { ErrorState, Skeleton } from '@deskhand/ui'
import { publicTenantQuery } from '../../api'
import { BookingFlow } from '../../features/BookingFlow'
import { PublicShell } from '../../PublicShell'
import { PublicNotFound } from '../__root'

function BookingPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('public')
  const { data: tenant, isPending, error, refetch, isRefetching } = useQuery(publicTenantQuery(slug))

  if (isPending) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }
  if (isApiError(error, 'not_found')) return <PublicNotFound />
  if (error || !tenant) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <ErrorState supportCode={isApiError(error) ? error.supportCode : undefined} onRetry={() => void refetch()} retrying={isRefetching} />
      </main>
    )
  }

  return (
    <PublicShell tenant={tenant}>
      <h1 className="text-2xl font-semibold tracking-tight">{t('booking.title', { business: tenant.name })}</h1>
      {tenant.city && <p className="mt-1 text-sm text-fg-muted">{t('booking.subtitle', { city: tenant.city })}</p>}
      <div className="mt-6">
        <BookingFlow slug={slug} />
      </div>
    </PublicShell>
  )
}

export const Route = createFileRoute('/b/$slug')({ component: BookingPage })
