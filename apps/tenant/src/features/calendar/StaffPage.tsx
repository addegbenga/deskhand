import { Link } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import { Badge, Breadcrumbs, NoPermissionState, PageContainer, PageHeader, Switch, usePermission } from '@deskhand/ui'
import { usePatchStaff, useStaffProfiles } from '../../api/booking'
import { useSession } from '../../api/queries'

export function StaffPage() {
  const { t } = useTranslation(['calendar', 'common'])
  const session = useSession()
  const access = usePermission('calendar.edit')
  const list = useStaffProfiles()
  const patch = usePatchStaff()

  if (!canSeeArea(session.membership.role, 'bookings')) {
    return (
      <PageContainer>
        <PageHeader title={t('staffPage.title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('staffPage.title')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/bookings">{label}</Link> }, { label: t('staffPage.title') }]} />}
      />
      <ul className="space-y-2">
        {list.data?.map((member) => (
          <li key={member.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{member.name}</p>
              <p className="text-xs text-fg-muted">{member.title}</p>
            </div>
            <Badge tone={member.calendarConnected ? 'success' : 'attention'}>
              {member.calendarConnected ? t('staffPage.connected') : t('staffPage.disconnected')}
            </Badge>
            {access.allowed && (
              <Switch checked={member.bookable} onCheckedChange={(bookable) => void patch.mutate({ id: member.id, bookable })} aria-label={t('staffPage.bookable')} />
            )}
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}
