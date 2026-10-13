import type { ConnectionKind, Plan, UsageMeter } from '@deskhand/schemas'

export const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'trashmail.com']

export const USAGE_UNITS = ['seats', 'locations', 'aiEmployees', 'contacts', 'aiConversations', 'emails'] as const

export const PLAN_LIMITS: Record<Plan, Record<(typeof USAGE_UNITS)[number], number>> = {
  starter: { seats: 3, locations: 1, aiEmployees: 1, contacts: 500, aiConversations: 200, emails: 2000 },
  growth: { seats: 8, locations: 3, aiEmployees: 3, contacts: 5000, aiConversations: 2000, emails: 20000 },
  pro: { seats: 25, locations: 10, aiEmployees: 10, contacts: 50000, aiConversations: 10000, emails: 100000 },
}

export const CONNECTION_CATALOG: {
  kind: ConnectionKind
  group: 'messaging' | 'calendar' | 'gbp' | 'payments' | 'social' | 'contacts' | 'voice'
  ownerModel: 'we_manage' | 'you_connect'
  scopes: string[]
}[] = [
  { kind: 'whatsapp', group: 'messaging', ownerModel: 'you_connect', scopes: ['messages', 'templates'] },
  { kind: 'email', group: 'messaging', ownerModel: 'we_manage', scopes: ['send'] },
  { kind: 'webchat', group: 'messaging', ownerModel: 'we_manage', scopes: ['widget'] },
  { kind: 'messenger', group: 'messaging', ownerModel: 'you_connect', scopes: ['pages_messaging'] },
  { kind: 'instagram', group: 'social', ownerModel: 'you_connect', scopes: ['instagram_manage'] },
  { kind: 'google_calendar', group: 'calendar', ownerModel: 'you_connect', scopes: ['calendar.events'] },
  { kind: 'outlook', group: 'calendar', ownerModel: 'you_connect', scopes: ['calendars.readwrite'] },
  { kind: 'gbp', group: 'gbp', ownerModel: 'you_connect', scopes: ['business.manage'] },
  { kind: 'payments', group: 'payments', ownerModel: 'you_connect', scopes: ['charges'] },
  { kind: 'google_contacts', group: 'contacts', ownerModel: 'you_connect', scopes: ['contacts.readonly'] },
  { kind: 'sms', group: 'voice', ownerModel: 'we_manage', scopes: ['sms.send'] },
]

export function meterAlert(percent: number): UsageMeter['alert'] {
  if (percent >= 100) return 'cap'
  if (percent >= 80) return 'warn'
  return 'ok'
}

export function paidSeatCount(roles: string[]) {
  return roles.filter((role) => role !== 'readonly').length
}

export function parseInviteEmails(raw: string) {
  return [...new Set(raw.split(/[\s,;]+/).map((item) => item.trim().toLowerCase()).filter(Boolean))].slice(0, 50)
}
