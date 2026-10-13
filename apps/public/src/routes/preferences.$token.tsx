import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { PreferenceCenterSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, Skeleton, Switch, toast } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function PreferencesPage() {
  const { token } = Route.useParams()
  const { t } = useTranslation('public')
  const client = useQueryClient()
  const query = useQuery({
    queryKey: ['public-prefs', token],
    queryFn: ({ signal }) => api(`/public/preferences/${token}`, { schema: PreferenceCenterSchema, signal }),
  })
  const patch = useMutation({
    mutationFn: (body: { channel?: string; granted?: boolean; unsubscribeAll?: boolean }) =>
      api(`/public/preferences/${token}`, { method: 'PATCH', body, schema: PreferenceCenterSchema }),
    onSuccess: (data) => {
      client.setQueryData(['public-prefs', token], data)
      toast.success(t('prefs.saved'))
    },
  })

  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-40 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />

  return (
    <PublicShell tenant={query.data}>
      <h1 className="text-2xl font-semibold">{t('prefs.title')}</h1>
      <p className="mt-2 text-fg-muted">{t('prefs.hello', { name: query.data.contactName })}</p>
      <ul className="mt-6 space-y-3">
        {query.data.channels.map((row) => (
          <li key={row.channel} className="flex items-center justify-between rounded-md border border-border p-3">
            <span className="capitalize">{row.channel}</span>
            <Switch
              checked={row.granted}
              onCheckedChange={(granted) => void patch.mutateAsync({ channel: row.channel, granted })}
              aria-label={row.channel}
            />
          </li>
        ))}
      </ul>
      <Button className="mt-6" variant="outline" onClick={() => void patch.mutateAsync({ unsubscribeAll: true })}>
        {t('prefs.all')}
      </Button>
    </PublicShell>
  )
}

export const Route = createFileRoute('/preferences/$token')({ component: PreferencesPage })
