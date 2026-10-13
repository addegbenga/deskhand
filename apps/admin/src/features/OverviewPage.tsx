import { Link } from '@tanstack/react-router'
import { formatNumber, useTranslation } from '@deskhand/i18n'
import { AccountStateSchema, isApiError, MarketCodeSchema } from '@deskhand/schemas'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, PageContainer, PageHeader, Skeleton, StatusChip } from '@deskhand/ui'
import { useAdminOverview, useAdminSession } from '../api/queries'
import { useRegion } from '../lib/region'
import { canOpenModule } from '../shell/nav'
import { TenantRows } from './TenantRows'

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <span className="block h-full rounded-full bg-brand" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
    </span>
  )
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-64 lg:col-span-1" />
      <Skeleton className="h-64 lg:col-span-1" />
    </div>
  )
}

/** S0 overview: real numbers from the mock so the shell has something honest to show. Full dashboard is S10. */
export function OverviewPage() {
  const { t, i18n } = useTranslation('admin')
  const session = useAdminSession()
  const region = useRegion((s) => s.region)
  const { data, isPending, isError, error, refetch, isRefetching } = useAdminOverview(region)
  const locale = i18n.language

  return (
    <PageContainer>
      <PageHeader title={t('nav.overview')} description={t('overview.subtitle', { persona: t(`personas.${session.persona}`) })} />
      {isPending && <OverviewSkeleton />}
      {isError && (
        <Card>
          <ErrorState supportCode={isApiError(error) ? error.supportCode : undefined} onRetry={() => void refetch()} retrying={isRefetching} />
        </Card>
      )}
      {data && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{t('overview.tenants')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="tabular text-4xl font-semibold tracking-tight">{formatNumber(data.total, locale)}</p>
              <p className="mt-1 text-sm text-fg-muted">{t(`region.${region}`)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('overview.byState')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {AccountStateSchema.options
                  .filter((state) => data.byState[state])
                  .map((state) => (
                    <li key={state} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0">
                        <StatusChip domain="account" value={state} />
                      </span>
                      <Bar value={data.byState[state] ?? 0} max={data.total} />
                      <span className="tabular w-10 text-end text-fg-muted">{formatNumber(data.byState[state] ?? 0, locale)}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('overview.byMarket')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {MarketCodeSchema.options
                  .filter((market) => data.byMarket[market])
                  .map((market) => (
                    <li key={market} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate">{t(`devtools:markets.${market}`)}</span>
                      <Bar value={data.byMarket[market] ?? 0} max={data.total} />
                      <span className="tabular w-10 text-end text-fg-muted">{formatNumber(data.byMarket[market] ?? 0, locale)}</span>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{t('overview.recent')}</CardTitle>
              {canOpenModule(session.persona, 'tenants') && (
                <Link to="/tenants" className="text-sm font-medium text-fg-muted hover:text-fg">
                  {t('nav.tenants')}
                </Link>
              )}
            </CardHeader>
            <TenantRows tenants={data.recent} />
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
