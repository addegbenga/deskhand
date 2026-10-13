import { http } from 'msw'
import {
  ApiKeyListSchema,
  AuditEventListSchema,
  BillingOverviewSchema,
  BrandingSettingsSchema,
  BulkInviteResultSchema,
  WorkspaceProfileSchema,
  WorkspaceProfilePatchSchema,
  CancelBillingSchema,
  CloseAccountSchema,
  ConnectionEventListSchema,
  ConnectionHubSchema,
  ConnectionTestSchema,
  DataExportSchema,
  DataExportWriteSchema,
  DeviceSessionListSchema,
  InviteWriteSchema,
  InvoiceListSchema,
  JoinLinkSchema,
  JoinLinkWriteSchema,
  JoinRequestListSchema,
  LanguageMarketSchema,
  NotificationPrefsSchema,
  OffboardWriteSchema,
  PlanChangeSchema,
  PlanSchema,
  SecuritySettingsSchema,
  TeamInvitationListSchema,
  WorkspaceMemberListSchema,
  UsagePatchSchema,
  UsageReportSchema,
  WebhookLogListSchema,
  type BrandingSettings,
  type WorkspaceProfile,
  type InviteResult,
  type NotificationPrefs,
  type Session,
  type UsageReport,
} from '@deskhand/schemas'
import { getMarketPack } from '@deskhand/config'
import { getAuthDb, randomToken } from '../auth-db'
import { DAY, now } from '../clock'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { CONNECTION_CATALOG, DISPOSABLE_DOMAINS, PLAN_LIMITS, USAGE_UNITS, meterAlert, paidSeatCount, parseInviteEmails } from '../settings-rules'
import { notifyChange } from '../sync'
import { db, write } from '../store'
import { loadSession } from './tenant'
import type { ConnectionEventRecord, ConnectionRecord } from '../db'

const API = '/api'

function iso() {
  return now().toISOString()
}

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

async function sendMail(to: string, href: string) {
  await getAuthDb().outbox.put({
    id: randomToken(12),
    to,
    kind: 'invitation',
    code: null,
    href,
    createdAt: iso(),
  })
  notifyChange(['outbox'])
}

async function audit(session: Session, action: string, target: string) {
  const database = await db()
  await database.auditEvents.put({
    id: localId('aud'),
    accountId: session.account.id,
    actor: session.user.name,
    action,
    target,
    createdAt: iso(),
  })
}

function defaultProfile(session: Session): WorkspaceProfile {
  return {
    name: session.account.name,
    legalName: session.account.name,
    registration: '',
    description: '',
    website: `https://${session.account.slug}.ng`,
    instagram: `@${session.account.slug.replace(/-/g, '')}`,
    phone: session.locations[0]?.phone ?? '',
    email: session.user.email,
    privacyEmail: `privacy@${session.account.slug}.ng`,
    industry: session.account.industry,
    pack: session.account.industry,
  }
}

function defaultBranding(session: Session): BrandingSettings {
  return { logoText: session.account.name, brandColor: session.account.brandColor, font: 'sans', showPoweredBy: session.account.showPoweredBy }
}

function defaultNotes(): NotificationPrefs {
  return { email: true, inApp: true, whatsapp: false, quietStart: '21:00', quietEnd: '08:00', digestHour: 8 }
}

async function usageReport(session: Session): Promise<UsageReport> {
  const database = await db()
  const stored = (await database.meta.get('usage'))?.value as { used?: Record<string, number>; capMode?: UsageReport['capMode']; spendingCeiling?: number } | undefined
  const limits = PLAN_LIMITS[session.account.plan]
  const memberships = await database.memberships.toArray()
  const locations = await database.locations.toArray()
  const contacts = await database.contacts.count()
  const employees = await database.employees.count()
  const used = {
    seats: paidSeatCount(memberships.map((item) => item.role)),
    locations: locations.length,
    aiEmployees: employees,
    contacts,
    aiConversations: stored?.used?.aiConversations ?? Math.round(limits.aiConversations * 0.82),
    emails: stored?.used?.emails ?? limits.emails,
  }
  const meters = USAGE_UNITS.map((unit) => {
    const included = limits[unit]
    const value = used[unit]
    const percent = included === 0 ? 0 : Math.round((value / included) * 100)
    return { unit, used: value, included, percent, alert: meterAlert(percent) }
  })
  return {
    plan: session.account.plan,
    meters,
    projected: 'Month-end looks like this week if volume holds.',
    capMode: stored?.capMode ?? 'soft',
    spendingCeiling: stored?.spendingCeiling ?? 50000,
  }
}

function kindToRecord(kind: string): ConnectionRecord['kind'] | null {
  const allowed: ConnectionRecord['kind'][] = ['whatsapp', 'webchat', 'email', 'sms', 'messenger', 'instagram', 'google_calendar', 'payments']
  return allowed.includes(kind as ConnectionRecord['kind']) ? (kind as ConnectionRecord['kind']) : null
}

export const settingsHandlers = [
  http.get(
    `${API}/settings/business`,
    route(async () => {
      const session = await loadSession()
      const row = await (await db()).meta.get('businessProfile')
      return json(WorkspaceProfileSchema, row?.value ? { ...defaultProfile(session), ...(row.value as object) } : defaultProfile(session))
    }),
  ),
  http.patch(
    `${API}/settings/business`,
    route(async ({ request }) => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const patch = await parseBody(request, WorkspaceProfilePatchSchema)
      return write(['settings', 'session'], async (database) => {
        const current = WorkspaceProfileSchema.parse((await database.meta.get('businessProfile'))?.value ?? defaultProfile(session))
        const next = { ...current, ...patch }
        await database.meta.put({ key: 'businessProfile', value: next })
        if (patch.name) await database.accounts.update(session.account.id, { name: patch.name })
        await audit(session, 'settings.business', next.name)
        return json(WorkspaceProfileSchema, next)
      })
    }),
  ),
  http.get(
    `${API}/settings/branding`,
    route(async () => {
      const session = await loadSession()
      const row = await (await db()).meta.get('branding')
      return json(BrandingSettingsSchema, row?.value ? BrandingSettingsSchema.parse(row.value) : defaultBranding(session))
    }),
  ),
  http.patch(
    `${API}/settings/branding`,
    route(async ({ request }) => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const patch = await parseBody(request, BrandingSettingsSchema.partial())
      return write(['settings', 'session'], async (database) => {
        const current = BrandingSettingsSchema.parse((await database.meta.get('branding'))?.value ?? defaultBranding(session))
        const next = { ...current, ...patch }
        await database.meta.put({ key: 'branding', value: next })
        await database.accounts.update(session.account.id, { brandColor: next.brandColor, showPoweredBy: next.showPoweredBy })
        return json(BrandingSettingsSchema, next)
      })
    }),
  ),
  http.get(
    `${API}/settings/notifications`,
    route(async () => {
      await loadSession()
      const row = await (await db()).meta.get('notificationPrefs')
      return json(NotificationPrefsSchema, row?.value ? NotificationPrefsSchema.parse(row.value) : defaultNotes())
    }),
  ),
  http.patch(
    `${API}/settings/notifications`,
    route(async ({ request }) => {
      await loadSession()
      const patch = await parseBody(request, NotificationPrefsSchema.partial())
      return write(['settings'], async (database) => {
        const current = NotificationPrefsSchema.parse((await database.meta.get('notificationPrefs'))?.value ?? defaultNotes())
        const next = { ...current, ...patch }
        await database.meta.put({ key: 'notificationPrefs', value: next })
        return json(NotificationPrefsSchema, next)
      })
    }),
  ),
  http.get(
    `${API}/settings/languages`,
    route(async () => {
      const session = await loadSession()
      const pack = getMarketPack(session.account.market)
      return json(LanguageMarketSchema, {
        market: session.account.market,
        region: session.account.region,
        defaultLanguage: pack.conversationLanguages[0]?.code ?? 'en',
        languages: pack.conversationLanguages.map((item) => item.code),
        currency: pack.currency,
        holidays: [],
      })
    }),
  ),
  http.get(
    `${API}/connections`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role) && session.membership.role !== 'staff') {
        throw new MockHttpError('forbidden', 'Your role cannot do this.')
      }
      const rows = await (await db()).connections.toArray()
      const byKind = new Map(rows.map((row) => [row.kind, row]))
      const catalog = session.membership.role === 'staff' ? CONNECTION_CATALOG.filter((item) => item.kind === 'google_calendar') : CONNECTION_CATALOG
      const cards = catalog.map((item) => {
        const row = byKind.get(item.kind as ConnectionRecord['kind'])
        const health = row?.health ?? null
        const status = !row ? 'not_connected' : health === 'healthy' ? 'connected' : 'needs_attention'
        return {
          kind: item.kind,
          group: item.group,
          ownerModel: item.ownerModel,
          status: status as 'connected' | 'needs_attention' | 'not_connected',
          health,
          problem: row?.problem ?? null,
          connectedBy: row ? session.account.name : null,
          scopes: item.scopes,
          lastSyncAt: row ? iso() : null,
          id: row?.id ?? null,
        }
      })
      const groups = [...new Set(cards.map((card) => card.group))].map((id) => ({ id, cards: cards.filter((card) => card.group === id) }))
      return json(ConnectionHubSchema, { groups })
    }),
  ),
  http.get(
    `${API}/connections/events`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'connections.manage', 'view')
      const rows = await (await db()).connectionEvents.toArray()
      return json(
        ConnectionEventListSchema,
        rows
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((row) => ({
            id: row.id,
            accountId: row.accountId,
            kind: row.kind as never,
            action: row.action,
            actorName: row.actorName,
            detail: row.detail,
            createdAt: row.createdAt,
            createdBy: row.createdBy,
          })),
      )
    }),
  ),
  http.post(
    `${API}/connections/:kind/connect`,
    route(async ({ params }) => {
      const session = await loadSession()
      const kind = String(params.kind)
      const recordKind = kindToRecord(kind)
      if (!recordKind) throw new MockHttpError('validation_failed', 'That connection is not available yet.')
      if (session.membership.role === 'staff' && recordKind !== 'google_calendar') {
        throw new MockHttpError('forbidden', 'Your role cannot do this.')
      }
      if (session.membership.role !== 'staff') requireCapability(session, 'connections.manage')
      return write(['connections', 'banners', 'home'], async (database) => {
        const existing = (await database.connections.toArray()).find((item) => item.kind === recordKind)
        const row: ConnectionRecord = existing
          ? { ...existing, health: 'healthy', problem: null }
          : { id: localId('cxn'), accountId: session.account.id, kind: recordKind, health: 'healthy', problem: null }
        await database.connections.put(row)
        await database.connectionEvents.put({
          id: localId('cxe'),
          accountId: session.account.id,
          kind: recordKind,
          action: 'connected',
          actorName: session.user.name,
          detail: 'Connected',
          createdAt: iso(),
          createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
        })
        return json(ConnectionTestSchema, { ok: true, detail: 'Connected' })
      })
    }),
  ),
  http.post(
    `${API}/connections/:kind/test`,
    route(async ({ params }) => {
      const session = await loadSession()
      if (session.membership.role !== 'staff') requireCapability(session, 'connections.manage')
      const row = (await (await db()).connections.toArray()).find((item) => item.kind === String(params.kind))
      if (!row) throw new MockHttpError('not_found', 'Not connected.')
      const ok = row.health === 'healthy'
      return json(ConnectionTestSchema, { ok, detail: ok ? 'Test passed' : row.problem ?? 'Needs attention' })
    }),
  ),
  http.post(
    `${API}/connections/:kind/fix`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'connections.manage')
      return write(['connections', 'banners', 'home'], async (database) => {
        const row = (await database.connections.toArray()).find((item) => item.kind === String(params.kind))
        if (!row) throw new MockHttpError('not_found', 'Not connected.')
        await database.connections.put({ ...row, health: 'healthy', problem: null })
        const event: ConnectionEventRecord = {
          id: localId('cxe'),
          accountId: session.account.id,
          kind: row.kind,
          action: 'fixed',
          actorName: session.user.name,
          detail: 'Reconnected',
          createdAt: iso(),
          createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
        }
        await database.connectionEvents.put(event)
        return json(ConnectionTestSchema, { ok: true, detail: 'Fixed' })
      })
    }),
  ),
  http.post(
    `${API}/connections/:kind/disconnect`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'connections.manage')
      return write(['connections', 'banners', 'home'], async (database) => {
        const row = (await database.connections.toArray()).find((item) => item.kind === String(params.kind))
        if (row) await database.connections.delete(row.id)
        return json(ConnectionTestSchema, { ok: true, detail: 'Disconnected' })
      })
    }),
  ),
  http.get(
    `${API}/team/members`,
    route(async () => {
      await loadSession()
      const database = await db()
      const memberships = await database.memberships.toArray()
      const users = await database.users.toArray()
      const locations = await database.locations.toArray()
      const loc = new Map(locations.map((item) => [item.id, item.name]))
      const staff = await database.staffProfiles.toArray()
      const calendarByUser = new Map(staff.map((item) => [item.userId, item]))
      return json(
        WorkspaceMemberListSchema,
        memberships.map((membership) => {
          const user = users.find((item) => item.id === membership.userId)!
          const profile = calendarByUser.get(user.id) ?? staff.find((item) => item.name === user.name)
          return {
            id: membership.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: membership.role,
            title: membership.title,
            locationIds: membership.locationIds,
            locationNames: membership.locationIds.map((id) => loc.get(id) ?? id),
            twoFactor: membership.role === 'owner',
            calendarConnected: profile?.calendarConnected ?? false,
            bookable: profile?.bookable ?? false,
            lastActiveAt: membership.role === 'staff' ? new Date(now().getTime() - 2 * 60 * 60 * 1000).toISOString() : iso(),
          }
        }),
      )
    }),
  ),
  http.get(
    `${API}/team/invitations`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      const rows = await (await db()).invitations.toArray()
      const resends = ((await (await db()).meta.get('inviteResends'))?.value as Record<string, number> | undefined) ?? {}
      return json(
        TeamInvitationListSchema,
        rows.map((row) => ({
          id: row.id,
          email: row.email,
          role: row.role,
          status: Date.parse(row.expiresAt) < now().getTime() && row.status === 'pending' ? 'expired' : row.status,
          expiresAt: row.expiresAt,
          token: row.token,
          resends: resends[row.id] ?? 0,
          note: row.note,
        })),
      )
    }),
  ),
  http.post(
    `${API}/team/invites`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      const body = await parseBody(request, InviteWriteSchema)
      const emails = parseInviteEmails(body.emails)
      return write(['team', 'notifications'], async (database) => {
        const memberships = await database.memberships.toArray()
        const users = await database.users.toArray()
        const memberEmails = new Set(
          memberships.map((membership) => users.find((user) => user.id === membership.userId)?.email.toLowerCase()).filter(Boolean) as string[],
        )
        const pending = (await database.invitations.toArray()).filter((item) => item.status === 'pending')
        const limits = PLAN_LIMITS[session.account.plan]
        let remaining = Math.max(0, limits.seats - paidSeatCount(memberships.map((item) => item.role)) - pending.filter((item) => item.role !== 'readonly').length)
        const results: { email: string; result: InviteResult }[] = []
        for (const email of emails) {
          const domain = email.split('@')[1] ?? ''
          if (!email.includes('@') || !domain.includes('.')) {
            results.push({ email, result: 'invalid' })
            continue
          }
          if (DISPOSABLE_DOMAINS.includes(domain)) {
            results.push({ email, result: 'blocked' })
            continue
          }
          if (memberEmails.has(email) || pending.some((item) => item.email.toLowerCase() === email)) {
            results.push({ email, result: 'already_member' })
            continue
          }
          if (body.role !== 'readonly' && remaining <= 0) {
            results.push({ email, result: 'plan_limit' })
            continue
          }
          const token = randomToken(10)
          await database.invitations.put({
            id: localId('inv'),
            accountId: session.account.id,
            token,
            email,
            role: body.role,
            locationIds: body.locationIds,
            invitedBy: session.user.id,
            note: body.note ?? null,
            status: 'pending',
            expiresAt: new Date(now().getTime() + 7 * DAY).toISOString(),
            createdAt: iso(),
          })
          await sendMail(email, `/invite/${token}`)
          if (body.role !== 'readonly') remaining -= 1
          results.push({ email, result: 'sent' })
        }
        await audit(session, 'invitation.sent', emails.join(','))
        return json(BulkInviteResultSchema, { results, remainingSeats: remaining })
      })
    }),
  ),
  http.post(
    `${API}/team/invitations/:id/resend`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      return write(['team'], async (database) => {
        const invitation = await database.invitations.get(String(params.id))
        if (!invitation) throw new MockHttpError('not_found', 'Invitation not found.')
        const resends = ((await database.meta.get('inviteResends'))?.value as Record<string, number> | undefined) ?? {}
        const count = resends[invitation.id] ?? 0
        if (count >= 3) throw new MockHttpError('rate_limited', 'Resend limited to 3 per invitation.')
        await database.meta.put({ key: 'inviteResends', value: { ...resends, [invitation.id]: count + 1 } })
        await sendMail(invitation.email, `/invite/${invitation.token}`)
        return json(BulkInviteResultSchema, { results: [{ email: invitation.email, result: 'sent' }], remainingSeats: 0 })
      })
    }),
  ),
  http.post(
    `${API}/team/invitations/:id/revoke`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      return write(['team'], async (database) => {
        const invitation = await database.invitations.get(String(params.id))
        if (!invitation) throw new MockHttpError('not_found', 'Invitation not found.')
        await database.invitations.put({ ...invitation, status: 'revoked' })
        await audit(session, 'invitation.revoked', invitation.email)
        return json(BulkInviteResultSchema, { results: [{ email: invitation.email, result: 'sent' }], remainingSeats: 0 })
      })
    }),
  ),
  http.post(
    `${API}/team/join-links`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      const body = await parseBody(request, JoinLinkWriteSchema)
      return write(['team'], async (database) => {
        const token = `joinlink-${randomToken(8)}`
        const row = {
          id: localId('jl'),
          accountId: session.account.id,
          token,
          role: body.role,
          expiresAt: new Date(now().getTime() + DAY).toISOString(),
          createdAt: iso(),
        }
        await database.joinLinks.put(row)
        return json(JoinLinkSchema, { id: row.id, token, role: body.role, expiresAt: row.expiresAt, href: `/invite/${token}` })
      })
    }),
  ),
  http.get(
    `${API}/team/join-requests`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      const rows = await (await db()).joinRequests.toArray()
      return json(
        JoinRequestListSchema,
        rows.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, createdAt: row.createdAt })),
      )
    }),
  ),
  http.post(
    `${API}/team/join-requests/:id/approve`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      return write(['team', 'session'], async (database) => {
        const row = await database.joinRequests.get(String(params.id))
        if (!row) throw new MockHttpError('not_found', 'Request not found.')
        await database.joinRequests.put({ ...row, status: 'approved' })
        const user = { id: localId('usr'), name: row.name, email: row.email, phone: null, locale: 'en', createdAt: iso() }
        await database.users.put(user)
        await database.memberships.put({
          id: localId('mem'),
          accountId: session.account.id,
          userId: user.id,
          role: row.role,
          locationIds: [],
          title: '',
        })
        return json(JoinRequestListSchema, [{ id: row.id, name: row.name, email: row.email, role: row.role, status: 'approved', createdAt: row.createdAt }])
      })
    }),
  ),
  http.post(
    `${API}/team/:id/offboard`,
    route(async ({ params, request }) => {
      const session = await loadSession()
      requireCapability(session, 'team.manage')
      const body = await parseBody(request, OffboardWriteSchema)
      return write(['team', 'session', 'conversations', 'tasks'], async (database) => {
        const membership = await database.memberships.get(String(params.id))
        if (!membership) throw new MockHttpError('not_found', 'Member not found.')
        const user = await database.users.get(membership.userId)
        if (!user || user.name !== body.confirmation) throw new MockHttpError('validation_failed', 'Type the person’s name to confirm.')
        if (membership.role === 'owner') throw new MockHttpError('forbidden', 'Transfer ownership first.')
        const conversations = await database.conversations.where('assignedUserId').equals(membership.userId).toArray()
        for (const conversation of conversations) await database.conversations.update(conversation.id, { assignedUserId: body.reassignToUserId })
        const tasks = await database.tasks.filter((task) => task.assignedUserId === membership.userId).toArray()
        for (const task of tasks) await database.tasks.update(task.id, { assignedUserId: body.reassignToUserId })
        await database.memberships.delete(membership.id)
        await audit(session, 'member.offboarded', user.email)
        return json(WorkspaceMemberListSchema, [])
      })
    }),
  ),
  http.get(
    `${API}/billing`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'billing.manage', 'view')
      const extra = ((await (await db()).meta.get('billing'))?.value as { paymentMethod?: string; taxId?: string; billingEmail?: string } | undefined) ?? {}
      const limits = PLAN_LIMITS[session.account.plan]
      return json(BillingOverviewSchema, {
        plan: session.account.plan,
        state: session.account.state,
        paymentMethod: extra.paymentMethod ?? 'Visa •• 4242',
        taxId: extra.taxId ?? '',
        billingEmail: extra.billingEmail ?? session.user.email,
        nextInvoiceAt: new Date(now().getTime() + 20 * DAY).toISOString(),
        entitlements: USAGE_UNITS.map((unit) => ({ unit, included: limits[unit] })),
      })
    }),
  ),
  http.get(
    `${API}/billing/invoices`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'billing.manage')
      const rows = await (await db()).invoices.toArray()
      return json(
        InvoiceListSchema,
        rows.map((row) => ({ id: row.id, number: row.number, amount: row.amount, currency: row.currency, status: row.status, issuedAt: row.issuedAt })),
      )
    }),
  ),
  http.post(
    `${API}/billing/plan`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'billing.manage')
      const body = await parseBody(request, PlanChangeSchema)
      PlanSchema.parse(body.plan)
      return write(['session', 'banners', 'billing', 'usage'], async (database) => {
        await database.accounts.update(session.account.id, { plan: body.plan })
        await audit(session, 'plan.changed', body.plan)
        return json(BillingOverviewSchema, {
          plan: body.plan,
          state: session.account.state,
          paymentMethod: 'Visa •• 4242',
          taxId: '',
          billingEmail: session.user.email,
          nextInvoiceAt: new Date(now().getTime() + 20 * DAY).toISOString(),
          entitlements: USAGE_UNITS.map((unit) => ({ unit, included: PLAN_LIMITS[body.plan][unit] })),
        })
      })
    }),
  ),
  http.post(
    `${API}/billing/cancel`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'billing.manage')
      const body = await parseBody(request, CancelBillingSchema)
      if (body.confirmation !== session.account.name) throw new MockHttpError('validation_failed', 'Type the business name to confirm.')
      return write(['session', 'banners', 'billing'], async (database) => {
        await database.accounts.update(session.account.id, { state: 'cancelled' })
        await audit(session, 'billing.cancelled', session.account.name)
        return json(BillingOverviewSchema, {
          plan: session.account.plan,
          state: 'cancelled',
          paymentMethod: 'Visa •• 4242',
          taxId: '',
          billingEmail: session.user.email,
          nextInvoiceAt: null,
          entitlements: [],
        })
      })
    }),
  ),
  http.get(
    `${API}/usage`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      return json(UsageReportSchema, await usageReport(session))
    }),
  ),
  http.patch(
    `${API}/usage`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'billing.manage')
      const patch = await parseBody(request, UsagePatchSchema)
      return write(['usage'], async (database) => {
        const current = ((await database.meta.get('usage'))?.value as object) ?? {}
        const next = { ...current, ...patch }
        await database.meta.put({ key: 'usage', value: next })
        return json(UsageReportSchema, await usageReport({ ...session, account: session.account }))
      })
    }),
  ),
  http.post(
    `${API}/usage/simulate`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const limits = PLAN_LIMITS[session.account.plan]
      return write(['usage', 'notifications'], async (database) => {
        await database.meta.put({
          key: 'usage',
          value: { used: { aiConversations: limits.aiConversations, emails: limits.emails }, capMode: 'soft', spendingCeiling: 50000 },
        })
        await database.notifications.put({
          id: localId('ntf'),
          accountId: session.account.id,
          kind: 'usage_threshold',
          params: { unit: 'aiConversations' },
          href: '/app/settings/usage',
          read: false,
          createdAt: iso(),
        })
        return json(UsageReportSchema, await usageReport(session))
      })
    }),
  ),
  http.get(
    `${API}/security`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin', 'staff'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const sessions = await (await db()).deviceSessions.toArray()
      const calendar = (await (await db()).connections.toArray()).some((item) => item.kind === 'google_calendar' && item.health === 'healthy')
      return json(SecuritySettingsSchema, {
        twoFactor: session.membership.role === 'owner' || session.membership.role === 'admin',
        signInAlerts: true,
        calendarConnected: calendar,
        sessions: sessions.map((item) => ({
          id: item.id,
          device: item.device,
          location: item.location,
          current: item.current,
          lastActiveAt: item.lastActiveAt,
        })),
      })
    }),
  ),
  http.post(
    `${API}/security/sessions/:id/revoke`,
    route(async ({ params }) => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      return write(['settings'], async (database) => {
        await database.deviceSessions.delete(String(params.id))
        const rows = await database.deviceSessions.toArray()
        return json(
          DeviceSessionListSchema,
          rows.map((item) => ({
            id: item.id,
            device: item.device,
            location: item.location,
            current: item.current,
            lastActiveAt: item.lastActiveAt,
          })),
        )
      })
    }),
  ),
  http.post(
    `${API}/data/export`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'account.delete')
      const body = await parseBody(request, DataExportWriteSchema)
      const database = await db()
      const lines = ['type,id']
      if (body.include.includes('contacts')) for (const row of await database.contacts.toArray()) lines.push(`contact,${row.id}`)
      if (body.include.includes('conversations')) for (const row of await database.conversations.toArray()) lines.push(`conversation,${row.id}`)
      if (body.include.includes('bookings')) for (const row of await database.appointments.toArray()) lines.push(`booking,${row.id}`)
      if (body.include.includes('reviews')) for (const row of await database.reviews.toArray()) lines.push(`review,${row.id}`)
      return json(DataExportSchema, { filename: `${session.account.slug}-export.csv`, csv: lines.join('\n') })
    }),
  ),
  http.post(
    `${API}/account/close`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'account.delete')
      const body = await parseBody(request, CloseAccountSchema)
      if (body.confirmation !== session.account.name) throw new MockHttpError('validation_failed', 'Type the business name to confirm.')
      return write(['session', 'banners'], async (database) => {
        await database.accounts.update(session.account.id, { state: 'cancelled' })
        await audit(session, 'account.closed', session.account.name)
        return json(BillingOverviewSchema, {
          plan: session.account.plan,
          state: 'cancelled',
          paymentMethod: '',
          taxId: '',
          billingEmail: session.user.email,
          nextInvoiceAt: null,
          entitlements: [],
        })
      })
    }),
  ),
  http.get(
    `${API}/audit`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'audit.view')
      const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
      const rows = (await (await db()).auditEvents.toArray())
        .filter((row) => `${row.actor} ${row.action} ${row.target}`.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(
        AuditEventListSchema,
        rows.map((row) => ({ id: row.id, actor: row.actor, action: row.action, target: row.target, createdAt: row.createdAt })),
      )
    }),
  ),
  http.get(
    `${API}/settings/api-keys`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      return json(ApiKeyListSchema, [
        { id: 'key_live', name: 'Live', lastUsedAt: iso(), scopes: ['contacts.read'] },
      ])
    }),
  ),
  http.get(
    `${API}/settings/webhooks`,
    route(async () => {
      const session = await loadSession()
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      return json(WebhookLogListSchema, [
        { id: 'wh_1', url: 'https://hooks.example.com/deskhand', status: 200, createdAt: iso() },
      ])
    }),
  ),
]
