import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { PublicLinkResolveSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function LinkPage() {
  const { slug } = Route.useParams()
  const { t } = useTranslation('public')
  const query = useQuery({
    queryKey: ['public-link', slug],
    queryFn: ({ signal }) => api(`/public/l/${slug}`, { schema: PublicLinkResolveSchema, signal }),
  })

  useEffect(() => {
    if (query.data?.kind === 'track') window.location.replace(query.data.href)
  }, [query.data])

  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-32 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />
  if (query.data.kind === 'track') return <Skeleton className="mx-auto mt-12 h-24 max-w-lg" />

  const hub = query.data.hub
  return (
    <PublicShell tenant={hub}>
      <h1 className="text-2xl font-semibold">{t('hub.title', { business: hub.name })}</h1>
      <div className="mt-6 grid gap-3">
        {hub.buttons.map((item) => (
          <Button key={item.id} variant={item.id === 'book' ? 'primary' : 'outline'} asChild>
            <a href={item.href}>{t(`hub.${item.id}`)}</a>
          </Button>
        ))}
      </div>
    </PublicShell>
  )
}

export const Route = createFileRoute('/l/$slug')({ component: LinkPage })
