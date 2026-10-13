import { DAY } from './clock'
import { PLAN_LIMITS } from './settings-rules'
import type { AuditEventRecord, DeviceSessionRecord, InvoiceRecord, JoinLinkRecord, JoinRequestRecord } from './db'

export function buildSettingsExtras(input: {
  scenarioId: string
  accountId: string
  plan: 'starter' | 'growth' | 'pro'
  ownerName: string
  ownerEmail: string
  staffName: string
  currency: string
  iso: (offset: number) => string
  empty: boolean
}) {
  const { scenarioId, accountId, plan, ownerName, ownerEmail, staffName, currency, iso, empty } = input
  const invoices: InvoiceRecord[] = empty
    ? []
    : [0, 1, 2].map((index) => ({
        id: `invc_${scenarioId}_${index + 1}`,
        accountId,
        number: `DH-${2026 - index}-00${index + 1}`,
        amount: plan === 'starter' ? 18000 : plan === 'growth' ? 45000 : 120000,
        currency,
        status: 'paid' as const,
        issuedAt: iso(-(index + 1) * 30 * DAY),
      }))

  const joinLinks: JoinLinkRecord[] = empty
    ? []
    : [
        {
          id: `jl_${scenarioId}_1`,
          accountId,
          token: `joinlink-${scenarioId}`,
          role: 'staff',
          expiresAt: iso(20 * 60 * 60 * 1000),
          createdAt: iso(-2 * 60 * 60 * 1000),
        },
      ]

  const joinRequests: JoinRequestRecord[] = empty
    ? []
    : [
        {
          id: `jr_${scenarioId}_1`,
          accountId,
          name: 'Ifeoma Nwosu',
          email: 'ifeoma.nwosu@gmail.com',
          role: 'staff',
          status: 'pending',
          createdAt: iso(-3 * 60 * 60 * 1000),
        },
      ]

  const deviceSessions: DeviceSessionRecord[] = [
    {
      id: `ses_${scenarioId}_this`,
      accountId,
      device: 'This browser',
      location: 'Lagos',
      current: true,
      lastActiveAt: iso(0),
    },
    {
      id: `ses_${scenarioId}_phone`,
      accountId,
      device: `${staffName}'s iPhone`,
      location: 'Ikeja',
      current: false,
      lastActiveAt: iso(-2 * DAY),
    },
  ]

  const auditEvents: AuditEventRecord[] = empty
    ? []
    : [
        { id: `aud_${scenarioId}_1`, accountId, actor: ownerName, action: 'invitation.sent', target: 'ngozi.eze@gmail.com', createdAt: iso(-6 * DAY) },
        { id: `aud_${scenarioId}_2`, accountId, actor: ownerName, action: 'connection.connected', target: 'whatsapp', createdAt: iso(-40 * DAY) },
        { id: `aud_${scenarioId}_3`, accountId, actor: ownerName, action: 'plan.changed', target: plan, createdAt: iso(-90 * DAY) },
      ]

  const limits = PLAN_LIMITS[plan]
  const usage = {
    used: {
      seats: 4,
      locations: 2,
      aiEmployees: 1,
      contacts: Math.round(limits.contacts * 0.42),
      aiConversations: Math.round(limits.aiConversations * 0.82),
      emails: Math.round(limits.emails * 1),
    },
    capMode: 'soft' as const,
    spendingCeiling: 50000,
  }

  const billing = {
    paymentMethod: 'Visa •• 4242',
    taxId: '',
    billingEmail: ownerEmail,
  }

  return { invoices, joinLinks, joinRequests, deviceSessions, auditEvents, usage, billing }
}
