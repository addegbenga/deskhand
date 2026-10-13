import { Search, SquareKanban } from 'lucide-react'
import { useState } from 'react'
import { formatMoney, formatRelative, useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import { EmptyState, ErrorState, Input, NoPermissionState, Skeleton, usePermission } from '@deskhand/ui'
import { usePipeline } from '../../api/booking'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

export function OpportunitiesPage() {
  const { t } = useTranslation(['pipeline', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const access = usePermission('pipeline.edit')
  const [q, setQ] = useState('')
  const board = usePipeline(locationId, q.trim())

  if (!canSeeArea(session.membership.role, 'sales')) {
    return <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
  }

  const items = board.data?.items ?? []
  const searching = q.trim().length > 0

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label={t('search')}
          placeholder={t('search')}
          className="ps-9"
        />
      </div>
      {board.isPending && !board.data && <Skeleton className="h-40" />}
      {board.isError && <ErrorState onRetry={() => void board.refetch()} />}
      {board.data && items.length === 0 && (
        <EmptyState
          icon={SquareKanban}
          title={searching ? t('noResults.title') : t('empty.title')}
          description={searching ? t('noResults.body') : t('empty.body')}
        />
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-fg-muted">
                <th className="p-2">{t('leads.contact')}</th>
                <th className="p-2">{t('opps.stage')}</th>
                <th className="p-2">{t('opps.value')}</th>
                <th className="p-2">{t('opps.probability')}</th>
                <th className="p-2">{t('opps.forecast')}</th>
                <th className="p-2">{t('opps.close')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const forecast = item.value != null ? Math.round((item.value * item.probability) / 100) : null
                return (
                  <tr key={item.id} className="border-t border-border">
                    <td className="p-2 font-medium">{item.contactName}</td>
                    <td className="p-2">{item.stageName}</td>
                    <td className="p-2">{item.value != null ? formatMoney(item.value, ctx.currency, ctx.locale) : '—'}</td>
                    <td className="p-2">{t('opps.percent', { value: item.probability })}</td>
                    <td className="p-2">{forecast != null ? formatMoney(forecast, ctx.currency, ctx.locale) : '—'}</td>
                    <td className="p-2">{item.expectedCloseAt ? formatRelative(item.expectedCloseAt, new Date(), ctx) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
