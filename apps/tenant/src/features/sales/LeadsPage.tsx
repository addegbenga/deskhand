import { Link } from '@tanstack/react-router'
import { Search, Sparkles, Users } from 'lucide-react'
import { useState } from 'react'
import { formatRelative, useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import {
  AIBadge,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  NoPermissionState,
  Skeleton,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useLeads, useQualifyLead } from '../../api/booking'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

export function LeadsPage() {
  const { t } = useTranslation(['pipeline', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const access = usePermission('pipeline.edit')
  const [q, setQ] = useState('')
  const query = useLeads(locationId, q.trim())
  const qualify = useQualifyLead()

  if (!canSeeArea(session.membership.role, 'sales')) {
    return <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
  }

  const items = query.data ?? []
  const searching = q.trim().length > 0

  return (
    <div>
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          aria-label={t('leads.search')}
          placeholder={t('leads.search')}
          className="ps-9"
        />
      </div>
      {query.isPending && !query.data && <Skeleton className="h-40" />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.data && items.length === 0 && (
        <EmptyState
          icon={Users}
          title={searching ? t('leads.noResults.title') : t('leads.empty.title')}
          description={searching ? t('leads.noResults.body') : t('leads.empty.body')}
        />
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start text-fg-muted">
                <th className="p-2">{t('leads.contact')}</th>
                <th className="p-2">{t('source')}</th>
                <th className="p-2">{t('leads.status')}</th>
                <th className="p-2">{t('leads.owner')}</th>
                <th className="p-2">{t('leads.activity')}</th>
                <th className="p-2">{t('leads.followUp')}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={lead.id} className="border-t border-border">
                  <td className="p-2 font-medium">
                    <Link to="/app/contacts/$contactId" params={{ contactId: lead.contactId }} className="hover:underline">
                      {lead.contactName}
                    </Link>
                    {lead.aiSuggested && (
                      <span className="ms-2 inline-flex">
                        <AIBadge />
                      </span>
                    )}
                  </td>
                  <td className="p-2">{lead.source}</td>
                  <td className="p-2">
                    <Badge tone={lead.status === 'qualified' || lead.status === 'converted' ? 'success' : lead.aiSuggested ? 'ai' : 'neutral'}>
                      {t(`leads.statuses.${lead.status}`)}
                    </Badge>
                  </td>
                  <td className="p-2">{lead.assignedName ?? '—'}</td>
                  <td className="p-2">{formatRelative(lead.lastActivityAt, new Date(), ctx)}</td>
                  <td className="p-2">{lead.nextFollowUpAt ? formatRelative(lead.nextFollowUpAt, new Date(), ctx) : '—'}</td>
                  <td className="p-2">
                    {access.allowed && !lead.opportunityId && lead.status !== 'disqualified' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={qualify.isPending}
                        onClick={() =>
                          void qualify.mutateAsync({ id: lead.id }).then(() => toast.success(t('leads.qualified')))
                        }
                      >
                        <Sparkles className="size-3.5" aria-hidden />
                        {t('leads.qualify')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
