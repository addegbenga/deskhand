import { Link } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import type { JoinRequest, WorkspaceMember } from '@deskhand/schemas'
import { Badge } from '@deskhand/ui'
import { teamSetupItems, type TeamNeed } from '../../lib/team-needs'

export function TeamNeedsList({
  members,
  joins,
  items: override,
}: {
  members: WorkspaceMember[]
  joins?: JoinRequest[]
  items?: TeamNeed[]
}) {
  const { t } = useTranslation('settings')
  const items = override ?? teamSetupItems(members, joins ?? [])
  if (!items.length) return <p className="text-sm text-fg-muted">{t('team.needsClear')}</p>
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex flex-wrap items-start justify-between gap-2 rounded-md border p-3 text-sm ${item.blocking ? 'border-danger/20 bg-danger/5' : 'border-border'}`}
        >
          <span>
            <span className="block font-medium">
              {item.kind === 'mfa' && t(item.blocking ? 'team.needMfaRequired' : 'team.needMfa', { name: item.name })}
              {item.kind === 'calendar' && t('team.needCalendar', { name: item.name })}
              {item.kind === 'join' && t('team.needJoin', { count: Number(item.name) })}
            </span>
            <span className="mt-0.5 block text-fg-muted">
              {item.kind === 'mfa' && t(item.blocking ? 'team.impactMfaRequired' : 'team.impactMfa')}
              {item.kind === 'calendar' && t('team.impactCalendar')}
              {item.kind === 'join' && t('team.impactJoin')}
            </span>
          </span>
          <span className="flex items-center gap-2">
            {item.blocking ? <Badge tone="danger">{t('team.blocking')}</Badge> : <Badge tone="attention">{t('team.recommended')}</Badge>}
            {item.kind === 'calendar' ? (
              <Link className="font-medium text-brand hover:underline" to="/app/staff">
                {t('team.fix')}
              </Link>
            ) : (
              <Link className="font-medium text-brand hover:underline" to="/app/settings/$page" params={{ page: 'team' }}>
                {t('team.fix')}
              </Link>
            )}
          </span>
        </li>
      ))}
    </ul>
  )
}
