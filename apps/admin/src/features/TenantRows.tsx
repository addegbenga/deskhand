import { formatDateTime, useTranslation } from '@deskhand/i18n'
import type { TenantSummary } from '@deskhand/schemas'
import { Badge, StatusChip } from '@deskhand/ui'

function HealthScore({ score }: { score: number }) {
  const tone = score >= 70 ? 'success' : score >= 40 ? 'attention' : 'danger'
  return (
    <Badge tone={tone} className="tabular">
      {score}
    </Badge>
  )
}

/** Tenant list: a table from md up, stacked cards on phones. Owner fields arrive masked unless revealed. */
export function TenantRows({ tenants, className }: { tenants: TenantSummary[]; className?: string }) {
  const { t, i18n } = useTranslation('admin')
  const ctx = { locale: i18n.language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }

  return (
    <div className={className}>
      <table className="w-full text-sm max-md:hidden">
        <thead>
          <tr className="border-y border-border text-start text-xs text-fg-muted">
            <th scope="col" className="px-4 py-2 text-start font-medium">{t('table.tenant')}</th>
            <th scope="col" className="px-4 py-2 text-start font-medium">{t('table.owner')}</th>
            <th scope="col" className="px-4 py-2 text-start font-medium">{t('table.market')}</th>
            <th scope="col" className="px-4 py-2 text-start font-medium">{t('table.plan')}</th>
            <th scope="col" className="px-4 py-2 text-start font-medium">{t('table.state')}</th>
            <th scope="col" className="px-4 py-2 text-end font-medium">{t('table.health')}</th>
            <th scope="col" className="px-4 py-2 text-end font-medium max-lg:hidden">{t('table.created')}</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => (
            <tr key={tenant.id} className="h-(--row-h) border-b border-border last:border-0 hover:bg-surface-2/60">
              <td className="px-4">
                <span className="block font-medium text-fg">{tenant.name}</span>
                <span className="block text-xs text-fg-muted">{tenant.id}</span>
              </td>
              <td className="px-4">
                <span className="block">{tenant.ownerName}</span>
                <span className="block text-xs text-fg-muted">{tenant.ownerEmail}</span>
              </td>
              <td className="px-4">{t(`devtools:markets.${tenant.market}`)}</td>
              <td className="px-4">{t(`plans.${tenant.plan}`)}</td>
              <td className="px-4">
                <StatusChip domain="account" value={tenant.state} />
              </td>
              <td className="px-4 text-end">
                <HealthScore score={tenant.healthScore} />
              </td>
              <td className="tabular px-4 text-end text-fg-muted max-lg:hidden">
                {formatDateTime(tenant.createdAt, ctx, { dateStyle: 'medium' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border border-y border-border md:hidden">
        {tenants.map((tenant) => (
          <li key={tenant.id} className="flex flex-col gap-1.5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium text-fg">{tenant.name}</span>
              <HealthScore score={tenant.healthScore} />
            </div>
            <span className="text-sm text-fg-muted">
              {tenant.ownerName} · {tenant.ownerEmail}
            </span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
              <StatusChip domain="account" value={tenant.state} />
              <span>{t(`devtools:markets.${tenant.market}`)}</span>
              <span>{t(`plans.${tenant.plan}`)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
