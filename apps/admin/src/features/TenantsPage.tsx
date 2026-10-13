import { useNavigate } from '@tanstack/react-router'
import { Building2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { isApiError, MarketCodeSchema, type MarketCode } from '@deskhand/schemas'
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
} from '@deskhand/ui'
import { useTenants } from '../api/queries'
import { useRegion } from '../lib/region'
import { TenantRows } from './TenantRows'

/** Tenant list with search and market filter. Tenant 360 and saved views arrive in S10. */
export function TenantsPage({ q, market }: { q: string; market?: MarketCode }) {
  const { t } = useTranslation('admin')
  const navigate = useNavigate({ from: '/tenants' })
  const region = useRegion((s) => s.region)
  const [draft, setDraft] = useState(q)

  useEffect(() => setDraft(q), [q])
  useEffect(() => {
    const next = draft.trim()
    if (next === q) return
    const id = setTimeout(() => void navigate({ search: (prev) => ({ ...prev, q: next || undefined }), replace: true }), 250)
    return () => clearTimeout(id)
  }, [draft, q, navigate])

  const query = useTenants({ q, market, region })
  const tenants = query.data?.pages.flatMap((page) => page.items) ?? []
  const total = query.data?.pages[0]?.total ?? 0

  return (
    <PageContainer>
      <PageHeader title={t('nav.tenants')} description={t('modules.tenants')} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
          <Input
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.label')}
            className="ps-9"
          />
        </div>
        <Select
          value={market ?? 'all'}
          onValueChange={(value) =>
            void navigate({ search: (prev) => ({ ...prev, market: value === 'all' ? undefined : (value as MarketCode) }) })
          }
        >
          <SelectTrigger aria-label={t('table.market')} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('tenants.allMarkets')}</SelectItem>
            {MarketCodeSchema.options.map((code) => (
              <SelectItem key={code} value={code}>
                {t(`devtools:markets.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {query.isPending && (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {query.isError && !query.data && (
          <ErrorState
            supportCode={isApiError(query.error) ? query.error.supportCode : undefined}
            onRetry={() => void query.refetch()}
            retrying={query.isRefetching}
          />
        )}
        {query.data && tenants.length === 0 && (
          <EmptyState
            icon={Building2}
            title={t('tenants.emptyTitle')}
            description={t('tenants.emptyBody')}
            action={
              (q || market) && (
                <Button variant="outline" onClick={() => void navigate({ search: {} })}>
                  {t('tenants.clear')}
                </Button>
              )
            }
          />
        )}
        {tenants.length > 0 && <TenantRows tenants={tenants} className={query.isPlaceholderData ? 'opacity-60' : undefined} />}
      </Card>

      {tenants.length > 0 && (
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-fg-muted">
          <span className="tabular">{t('tenants.showing', { shown: tenants.length, total })}</span>
          {query.hasNextPage && (
            <Button variant="outline" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
              {t('tenants.loadMore')}
            </Button>
          )}
        </div>
      )}
    </PageContainer>
  )
}
