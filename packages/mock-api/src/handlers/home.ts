import { http, HttpResponse } from 'msw'
import {
  HomeDashboardSchema,
  type AttentionCard,
  type HomeDashboard,
  type HomeMetric,
  type Session,
} from '@deskhand/schemas'
import { DAY, MINUTE, now } from '../clock'
import { json, route } from '../http'
import { SCENARIOS } from '../scenarios'
import { currentScenario, db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

function inScope(session: Session, locationId: string | null) {
  const allowed = new Set(session.locations.map((l) => l.id))
  return (id: string) => allowed.has(id) && (!locationId || id === locationId)
}

function spark(seed: number[]) {
  return seed
}

export const homeHandlers = [
  http.get(
    `${API}/home`,
    route(async ({ request }) => {
      const session = await loadSession()
      const url = new URL(request.url)
      const range = (url.searchParams.get('range') as HomeDashboard['range'] | null) ?? 'month'
      const locationId = url.searchParams.get('locationId')
      const scoped = inScope(session, locationId)
      const staff = session.membership.role === 'staff'
      const readonly = session.membership.role === 'readonly'
      const database = await db()
      const conversations = (await database.conversations.toArray()).filter(
        (c) => scoped(c.locationId) && (!staff || c.assignedUserId === session.user.id),
      )
      const contacts = (await database.contacts.toArray()).filter(
        (c) => scoped(c.locationId) && (!staff || c.assignedUserId === session.user.id),
      )
      const approvals = (await database.approvals.where('status').equals('pending').toArray()).filter((a) => scoped(a.locationId))
      const appointments = (await database.appointments.toArray()).filter(
        (a) => scoped(a.locationId) && (!staff || a.staffUserId === session.user.id),
      )
      const tasks = (await database.tasks.toArray()).filter(
        (t) => scoped(t.locationId) && (!staff || t.assignedUserId === session.user.id) && !t.done,
      )
      const reviews = (await database.reviews.toArray()).filter((r) => scoped(r.locationId))
      const payments = (await database.payments.toArray()).filter((p) => scoped(p.locationId) && p.status === 'paid')
      const connections = await database.connections.toArray()
      const suggestions = session.account.aiMode === 'manual' || session.account.aiMode === 'off'
        ? []
        : (await database.suggestions.toArray()).filter((s) => !s.dismissed)
      const aiActivity =
        session.account.aiMode === 'manual' || session.account.aiMode === 'off'
          ? []
          : (await database.aiActions.orderBy('createdAt').reverse().limit(20).toArray())

      const t0 = now().getTime()
      const startOfDay = new Date(t0)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = startOfDay.getTime() + DAY

      const unanswered = conversations.filter((c) => c.lastDirection === 'inbound' && c.status !== 'closed' && t0 - new Date(c.lastInboundAt).getTime() > 15 * MINUTE)
      const needsHuman = conversations.filter((c) => c.status === 'needs_human')
      const wait = needsHuman[0] ? Math.round((t0 - new Date(needsHuman[0].lastInboundAt).getTime()) / MINUTE) : 0

      const attention: AttentionCard[] = []
      if (!readonly) {
        if (approvals.length && session.account.aiMode !== 'manual' && session.account.aiMode !== 'off') {
          attention.push({ id: 'approvals', kind: 'approvals', count: approvals.length, href: '/app/ai/approvals', params: {} })
        }
        if (needsHuman.length) {
          attention.push({ id: 'needs_human', kind: 'needs_human', count: needsHuman.length, waitMinutes: wait, href: '/app/inbox?view=needs_human', params: {} })
        }
        if (unanswered.length) {
          attention.push({ id: 'unanswered', kind: 'unanswered', count: unanswered.length, href: '/app/inbox?view=all', params: {} })
        }
        const negative = reviews.filter((r) => r.status === 'needs_reply' && r.rating <= 2)
        if (negative.length) attention.push({ id: 'negative_review', kind: 'negative_review', count: negative.length, href: '/app/reputation/reviews', params: {} })
        for (const connection of connections.filter((c) => c.health !== 'healthy')) {
          attention.push({
            id: `cxn_${connection.id}`,
            kind: 'broken_connection',
            count: 1,
            href: '/app/connections',
            params: { connection: connection.kind, problem: connection.problem ?? '' },
          })
        }
        const rejected = (await database.templates.where('status').equals('rejected').toArray()).length
        if (rejected) attention.push({ id: 'rejected_template', kind: 'rejected_template', count: rejected, href: '/app/marketing/templates', params: {} })
        if (SCENARIOS[currentScenario()].troubles?.complianceBlocking) {
          attention.push({ id: 'compliance', kind: 'compliance', count: 1, href: '/app/compliance/overview', params: {} })
        }
      }

      const today = readonly
        ? []
        : [
            ...appointments
              .filter((a) => {
                const at = new Date(a.startsAt).getTime()
                return at >= startOfDay.getTime() && at < endOfDay
              })
              .map((a) => ({
                id: a.id,
                kind: a.noshowRisk ? ('noshow_risk' as const) : ('booking' as const),
                at: a.startsAt,
                title: a.service,
                staffName: a.staffName,
                contactName: a.contactName,
                href: '/app/bookings',
              })),
            ...tasks
              .filter((t) => {
                const at = new Date(t.dueAt).getTime()
                return at >= startOfDay.getTime() && at < endOfDay
              })
              .map((t) => ({
                id: t.id,
                kind: 'task' as const,
                at: t.dueAt,
                title: t.title,
                staffName: null,
                contactName: t.contactName,
                href: '/app/tasks',
              })),
          ].sort((a, b) => a.at.localeCompare(b.at))

      const leads = contacts.filter((c) => t0 - new Date(c.createdAt).getTime() < 30 * DAY).length
      const booked = appointments.length
      const revenue = payments.reduce((sum, p) => sum + p.amount, 0)
      const rating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
      const responseMin = conversations.length ? 6 : 0

      const results: HomeMetric[] = [
        { id: 'leads', value: leads, previous: Math.max(0, leads - 8), sparkline: spark([12, 14, 11, 16, 15, 18, 17, leads]), unit: 'count' },
        { id: 'response_time', value: responseMin, previous: responseMin + 3, sparkline: spark([14, 12, 11, 9, 8, 7, 6, responseMin]), unit: 'minutes' },
        { id: 'bookings', value: booked, previous: Math.max(0, booked - 2), sparkline: spark([4, 5, 4, 6, 5, 7, 6, booked]), unit: 'count' },
        { id: 'revenue', value: revenue, previous: Math.round(revenue * 0.82), sparkline: spark([0.6, 0.7, 0.65, 0.8, 0.75, 0.9, 0.85, 1].map((n) => Math.round(n * revenue))), unit: 'money' },
        { id: 'reviews', value: Math.round(rating * 10) / 10, previous: Math.max(1, rating - 0.2), sparkline: spark([4.2, 4.3, 4.1, 4.4, 4.5, 4.4, 4.6, rating]), unit: 'rating' },
      ]

      const connected = connections.filter((c) => ['whatsapp', 'webchat', 'email', 'sms', 'instagram'].includes(c.kind)).map((c) => c.kind as HomeDashboard['connectedChannels'][number])

      return json(HomeDashboardSchema, {
        attention,
        today,
        results,
        aiActivity: readonly ? [] : aiActivity,
        suggestions: readonly ? [] : suggestions,
        demoData: contacts.length > 0,
        connectedChannels: connected,
        range,
      })
    }),
  ),

  http.post(
    `${API}/home/suggestions/:id/dismiss`,
    route(async ({ params }) => {
      await loadSession()
      await write(['home'], (database) => database.suggestions.update(String(params.id), { dismissed: true }))
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/home/suggestions/:id/accept`,
    route(async ({ params }) => {
      await loadSession()
      await write(['home'], (database) => database.suggestions.update(String(params.id), { dismissed: true }))
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]

