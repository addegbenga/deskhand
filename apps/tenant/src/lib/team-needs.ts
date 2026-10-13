import type { JoinRequest, WorkspaceMember } from '@deskhand/schemas'

export type TeamNeed = {
  id: string
  kind: 'mfa' | 'calendar' | 'join'
  blocking: boolean
  name: string
}

/** Per-person setup still open: two-factor (required for Owner/Admin) and calendar (bookable staff). */
export function teamSetupItems(members: WorkspaceMember[], joins: JoinRequest[] = []): TeamNeed[] {
  const items: TeamNeed[] = []
  for (const member of members) {
    const mfaRequired = member.role === 'owner' || member.role === 'admin'
    if (!member.twoFactor) {
      items.push({ id: `mfa-${member.id}`, kind: 'mfa', blocking: mfaRequired, name: member.name })
    }
    if (member.bookable && !member.calendarConnected) {
      items.push({ id: `cal-${member.id}`, kind: 'calendar', blocking: true, name: member.name })
    }
  }
  const pending = joins.filter((item) => item.status === 'pending').length
  if (pending) items.push({ id: 'joins', kind: 'join', blocking: false, name: String(pending) })
  return items
}
