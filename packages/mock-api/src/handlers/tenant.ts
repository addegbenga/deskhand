import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  AccountPatchSchema,
  AccountSchema,
  BannerSchema,
  LocationPatchSchema,
  LocationSchema,
  MarketCodeSchema,
  MarketPackSchema,
  NavSummarySchema,
  NotificationSchema,
  SearchResultSchema,
  SessionSchema,
  type Banner,
  type Session,
} from '@deskhand/schemas'
import { getMarketPack } from '@deskhand/config'
import { DAY, now } from '../clock'
import { devSettings } from '../dev-settings'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { SCENARIOS } from '../scenarios'
import { currentScenario, db, write } from '../store'

const API = '/api'

export async function loadSession(): Promise<Session> {
  if (!devSettings().signedIn) throw new MockHttpError('unauthenticated', 'Please sign in.')
  const database = await db()
  const account = await database.accounts.toCollection().first()
  const { role, userId } = devSettings()
  const signedInAs = userId ? await database.memberships.where('userId').equals(userId).first() : undefined
  // The toolbar role is a "view as" switch: a new account only has its owner, viewed in the chosen role.
  const match =
    signedInAs?.role === role ? signedInAs : await database.memberships.where('role').equals(role).first()
  const fallback = match ? undefined : await database.memberships.toCollection().first()
  const membership = match ?? (fallback ? { ...fallback, role } : undefined)
  if (!account || !membership) throw new MockHttpError('unauthenticated', 'Please sign in.')
  const user = await database.users.get(membership.userId)
  if (!user) throw new MockHttpError('unauthenticated', 'Please sign in.')
  const all = await database.locations.toArray()
  const locations = membership.locationIds.length ? all.filter((l) => membership.locationIds.includes(l.id)) : all
  return { account, membership, user, locations }
}

function locationFilter(url: URL, session: Session) {
  const requested = url.searchParams.get('locationId')
  const allowed = new Set(session.locations.map((l) => l.id))
  return (locationId: string) => allowed.has(locationId) && (!requested || requested === locationId)
}

function daysUntil(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now().getTime()) / DAY))
}

export const tenantHandlers = [
  http.get(
    `${API}/session`,
    route(async () => json(SessionSchema, await loadSession())),
  ),

  http.post(
    `${API}/auth/sign-in`,
    route(async () => {
      devSettings().set({ signedIn: true })
      return json(SessionSchema, await loadSession())
    }),
  ),

  http.post(
    `${API}/auth/sign-out`,
    route(async () => {
      devSettings().set({ signedIn: false })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/nav-summary`,
    route(async ({ request }) => {
      const session = await loadSession()
      const database = await db()
      const inScope = locationFilter(new URL(request.url), session)
      const staffOnly = session.membership.role === 'staff'
      const conversations = (await database.conversations.toArray()).filter(
        (c) => inScope(c.locationId) && (!staffOnly || c.assignedUserId === session.user.id),
      )
      const approvals = (await database.approvals.where('status').equals('pending').toArray()).filter((a) =>
        inScope(a.locationId),
      )
      const unreadNotifications = await database.notifications.filter((n) => !n.read).count()
      const aiVisible = !['manual'].includes(session.account.aiMode)
      return json(NavSummarySchema, {
        unreadConversations: conversations.filter((c) => c.unreadCount > 0).length,
        approvalsWaiting: aiVisible && session.membership.role !== 'readonly' ? approvals.length : 0,
        unreadNotifications,
      })
    }),
  ),

  http.get(
    `${API}/notifications`,
    route(async () => {
      await loadSession()
      const database = await db()
      const items = await database.notifications.orderBy('createdAt').reverse().toArray()
      return json(z.array(NotificationSchema), items)
    }),
  ),

  http.post(
    `${API}/notifications/:id/read`,
    route(async ({ params }) => {
      await loadSession()
      await write(['notifications', 'nav-summary'], (database) =>
        database.notifications.update(String(params.id), { read: true }),
      )
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/notifications/read-all`,
    route(async () => {
      await loadSession()
      await write(['notifications', 'nav-summary'], (database) =>
        database.notifications.toCollection().modify({ read: true }),
      )
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/banners`,
    route(async () => {
      const session = await loadSession()
      const database = await db()
      const { account } = session
      const banners: Banner[] = []
      const billing = (kind: Banner['kind'], severity: Banner['severity'], params: Banner['params'] = {}) =>
        banners.push({ id: kind, kind, severity, params, fixHref: '/app/settings/billing', fixCapability: 'billing.manage' })

      if (account.state === 'trial') billing('trial', 'info', { days: daysUntil(account.trialEndsAt) })
      if (account.state === 'trial_expired') billing('trial_expired', 'danger')
      if (account.state === 'past_due') billing('past_due', 'attention', { days: daysUntil(account.graceEndsAt) })
      if (account.state === 'cancelled') billing('cancelled', 'attention')
      if (account.state === 'paused') billing('paused', 'info')
      if (account.state === 'suspended') {
        banners.push({ id: 'suspended', kind: 'suspended', severity: 'danger', params: {}, fixHref: null, fixCapability: null })
      }
      if (account.aiMode === 'paused') {
        banners.push({ id: 'ai_paused', kind: 'ai_paused', severity: 'attention', params: {}, fixHref: null, fixCapability: 'ai.manage' })
      }
      for (const connection of await database.connections.toArray()) {
        if (connection.health === 'healthy') continue
        banners.push({
          id: `connection_${connection.id}`,
          kind: 'connection_broken',
          severity: connection.health === 'broken' ? 'danger' : 'attention',
          params: { connection: connection.kind, problem: connection.problem ?? 'unknown' },
          fixHref: '/app/connections',
          fixCapability: 'connections.manage',
        })
      }
      const troubles = SCENARIOS[currentScenario()].troubles
      if (troubles?.templateRejected) {
        banners.push({
          id: 'template_rejected',
          kind: 'template_rejected',
          severity: 'attention',
          params: { template: troubles.templateRejected },
          fixHref: '/app/marketing/templates',
          fixCapability: 'connections.manage',
        })
      }
      if (troubles?.complianceBlocking) {
        banners.push({
          id: 'compliance_blocking',
          kind: 'compliance_blocking',
          severity: 'danger',
          params: {},
          fixHref: '/app/compliance/overview',
          fixCapability: 'compliance.manage',
        })
      }
      return json(z.array(BannerSchema), banners)
    }),
  ),

  http.get(
    `${API}/search`,
    route(async ({ request }) => {
      const session = await loadSession()
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      if (q.length < 2) return json(SearchResultSchema, { contacts: [] })
      const inScope = locationFilter(url, session)
      const staffOnly = session.membership.role === 'staff'
      const database = await db()
      const contacts = await database.contacts
        .filter((c) => {
          if (!inScope(c.locationId)) return false
          if (staffOnly && c.assignedUserId !== session.user.id) return false
          const haystack = `${c.firstName} ${c.lastName} ${c.phone ?? ''} ${c.email ?? ''}`.toLowerCase()
          return haystack.includes(q)
        })
        .limit(6)
        .toArray()
      return json(SearchResultSchema, { contacts })
    }),
  ),

  http.patch(
    `${API}/account`,
    route(async ({ request }) => {
      const session = await loadSession()
      const patch = await parseBody(request, AccountPatchSchema)
      if (patch.aiMode) requireCapability(session, 'ai.manage')
      if (patch.plan || patch.state) requireCapability(session, 'billing.manage')
      await write(['session', 'banners', 'nav-summary'], (database) => database.accounts.update(session.account.id, patch))
      const updated = await (await db()).accounts.get(session.account.id)
      return json(AccountSchema, updated!)
    }),
  ),

  http.patch(
    `${API}/locations/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(request, LocationPatchSchema)
      const location = session.locations.find((item) => item.id === String(params.id))
      if (!location) throw new MockHttpError('not_found', 'Location not found.')
      await write(['session', 'appointments', 'slots', 'public-booking', 'home'], (database) =>
        database.locations.update(location.id, { timezone: patch.timezone }),
      )
      const updated = await (await db()).locations.get(location.id)
      return json(LocationSchema, updated!)
    }),
  ),

  http.get(
    `${API}/markets/:code`,
    route(({ params }) => {
      const code = MarketCodeSchema.safeParse(params.code)
      if (!code.success) throw new MockHttpError('not_found', 'Market not found.')
      return json(MarketPackSchema, getMarketPack(code.data))
    }),
  ),
]
