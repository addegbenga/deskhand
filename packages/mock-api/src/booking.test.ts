import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  AppointmentSchema,
  CalendarPayloadSchema,
  ConversationPageSchema,
  HoldResponseSchema,
  LeadListSchema,
  PipelineBoardSchema,
  PublicBookingPageSchema,
  SlotListSchema,
  TaskPageSchema,
  TaskSchema,
} from '@deskhand/schemas'
import { HOLD_MS } from './clock'
import { devSettings } from './dev-settings'
import { handlers } from './handlers'
import { resetScenario } from './store'

const BASE = 'http://localhost'
const server = setupServer(...handlers)

async function call(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init
  const response = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: json === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: json === undefined ? undefined : JSON.stringify(json),
  })
  const body = response.status === 204 ? null : await response.json()
  return { status: response.status, body }
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(async () => {
  devSettings().set({
    scenario: 'A',
    role: 'owner',
    adminPersona: 'support',
    network: 'instant',
    signedIn: true,
    adminSignedIn: true,
    impersonating: false,
    clockOffsetMs: 0,
    userId: null,
  })
  await resetScenario('A')
})

describe('pipeline and calendar (PRD 29.4, 29.5)', () => {
  it('returns a board with stages and opportunities', async () => {
    const { status, body } = await call('/api/pipeline')
    expect(status).toBe(200)
    const board = PipelineBoardSchema.parse(body)
    expect(board.stages.length).toBeGreaterThan(3)
    expect(board.items.length).toBeGreaterThan(0)
  })

  it('filters leads and pipeline by search query', async () => {
    const leads = LeadListSchema.parse((await call('/api/leads')).body)
    const name = leads[0]!.contactName
    const fragment = name.slice(0, Math.min(4, name.length)).toLowerCase()
    const filteredLeads = LeadListSchema.parse((await call(`/api/leads?q=${encodeURIComponent(fragment)}`)).body)
    expect(filteredLeads.length).toBeGreaterThan(0)
    expect(
      filteredLeads.every((item) =>
        [item.contactName, item.source, item.assignedName, item.status].join(' ').toLowerCase().includes(fragment),
      ),
    ).toBe(true)
    const miss = LeadListSchema.parse((await call('/api/leads?q=zzzz-no-such-lead')).body)
    expect(miss).toEqual([])

    const board = PipelineBoardSchema.parse((await call('/api/pipeline')).body)
    const dealName = board.items[0]!.contactName
    const dealFragment = dealName.slice(0, Math.min(4, dealName.length)).toLowerCase()
    const filteredBoard = PipelineBoardSchema.parse(
      (await call(`/api/pipeline?q=${encodeURIComponent(dealFragment)}`)).body,
    )
    expect(filteredBoard.items.length).toBeGreaterThan(0)
    expect(
      filteredBoard.items.every((item) =>
        [item.contactName, item.source, item.assignedName, item.stageName, item.nextTask]
          .join(' ')
          .toLowerCase()
          .includes(dealFragment),
      ),
    ).toBe(true)
  })

  it('keeps leads distinct from opportunities until qualified', async () => {
    const before = PipelineBoardSchema.parse((await call('/api/pipeline')).body)
    const leads = await call('/api/leads')
    expect(leads.status).toBe(200)
    const list = leads.body as { id: string; opportunityId: string | null; status: string }[]
    expect(list.length).toBeGreaterThan(before.items.length)
    const open = list.find((item) => !item.opportunityId && item.status !== 'disqualified')
    expect(open).toBeTruthy()
    const created = await call(`/api/leads/${open!.id}/qualify`, { method: 'POST', json: {} })
    expect(created.status).toBe(201)
    expect(created.body.opportunityId).toBeTruthy()
    const after = PipelineBoardSchema.parse((await call('/api/pipeline')).body)
    expect(after.items.length).toBe(before.items.length + 1)
  })

  it('lists calendar appointments in the location timezone payload', async () => {
    const { status, body } = await call('/api/calendar')
    expect(status).toBe(200)
    const cal = CalendarPayloadSchema.parse(body)
    expect(cal.timezone).toBeTruthy()
    expect(cal.appointments.length).toBeGreaterThan(0)
    expect(cal.services.length).toBeGreaterThan(0)
  })

  it('creates a bookable service', async () => {
    const before = CalendarPayloadSchema.parse((await call('/api/calendar')).body)
    const created = await call('/api/services', {
      method: 'POST',
      json: { name: 'Silk press add-on', durationMinutes: 45, price: 8000 },
    })
    expect(created.status).toBe(201)
    expect(created.body.name).toBe('Silk press add-on')
    const after = CalendarPayloadSchema.parse((await call('/api/calendar')).body)
    expect(after.services.length).toBe(before.services.length + 1)
  })
})

describe('tasks (PRD 29.18)', () => {
  it('creates a task linked to a conversation and resolves the contact', async () => {
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all')).body)
    const conversation = page.items[0]!
    const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    const created = await call('/api/tasks', {
      method: 'POST',
      json: { title: 'Reply about Saturday', dueAt, linkedKind: 'conversation', linkedId: conversation.id },
    })
    expect(created.status).toBe(201)
    const task = TaskSchema.parse(created.body)
    expect(task.linkedKind).toBe('conversation')
    expect(task.linkedId).toBe(conversation.id)
    expect(task.contactId).toBe(conversation.contactId)
    expect(task.contactName).toBeTruthy()
  })

  it('filters tasks by linked kind', async () => {
    const listed = TaskPageSchema.parse((await call('/api/tasks?view=team&linkedKind=booking')).body)
    expect(listed.items.length).toBeGreaterThan(0)
    expect(listed.items.every((task) => task.linkedKind === 'booking')).toBe(true)
  })

  it('creates a task on the selected location and returns it by id', async () => {
    const board = PipelineBoardSchema.parse((await call('/api/pipeline')).body)
    const locationId = board.items[0]!.locationId
    const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
    const created = await call('/api/tasks', {
      method: 'POST',
      json: { title: 'Location scoped follow-up', dueAt, locationId },
    })
    expect(created.status).toBe(201)
    const task = TaskSchema.parse(created.body)
    expect(task.locationId).toBe(locationId)
    const listed = TaskPageSchema.parse((await call(`/api/tasks?view=team&locationId=${locationId}`)).body)
    expect(listed.items.some((item) => item.id === task.id)).toBe(true)
    const fetched = await call(`/api/tasks/${task.id}`)
    expect(fetched.status).toBe(200)
    expect(TaskSchema.parse(fetched.body).title).toBe('Location scoped follow-up')
  })

  it('uses an open related task as pipeline nextTask', async () => {
    const tasks = TaskPageSchema.parse((await call('/api/tasks?view=team&linkedKind=opportunity')).body)
    const dealTask = tasks.items[0]
    expect(dealTask).toBeTruthy()
    const board = PipelineBoardSchema.parse((await call('/api/pipeline')).body)
    const item = board.items.find((row) => row.id === dealTask!.linkedId)
    expect(item?.nextTask).toBeTruthy()
    const team = TaskPageSchema.parse((await call('/api/tasks?view=team')).body)
    expect(team.items.some((task) => !task.done && task.title === item!.nextTask && (task.linkedId === item!.id || task.contactId === item!.contactId))).toBe(
      true,
    )
  })
})

describe('public booking (PRD 11.2)', () => {
  it('two holds on the same slot cannot both succeed', async () => {
    const page = await call('/api/public/booking/amaka-braids')
    expect(page.status).toBe(200)
    const parsed = PublicBookingPageSchema.parse(page.body)
    const service = parsed.services[0]!
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const slots = await call(`/api/public/booking/amaka-braids/slots?date=${tomorrow}&serviceId=${service.id}`)
    expect(slots.status).toBe(200)
    const list = SlotListSchema.parse(slots.body)
    expect(list.length).toBeGreaterThan(0)
    const slot = list[0]!
    const first = await call('/api/public/booking/hold', {
      method: 'POST',
      json: { slug: 'amaka-braids', serviceId: service.id, staffUserId: slot.staffUserId, startsAt: slot.startsAt },
    })
    expect(first.status).toBe(200)
    HoldResponseSchema.parse(first.body)
    const second = await call('/api/public/booking/hold', {
      method: 'POST',
      json: { slug: 'amaka-braids', serviceId: service.id, staffUserId: slot.staffUserId, startsAt: slot.startsAt },
    })
    expect(second.status).toBe(409)
  })

  it('releases a held slot after the timer', async () => {
    const page = PublicBookingPageSchema.parse((await call('/api/public/booking/amaka-braids')).body)
    const service = page.services[0]!
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const list = SlotListSchema.parse((await call(`/api/public/booking/amaka-braids/slots?date=${tomorrow}&serviceId=${service.id}`)).body)
    const slot = list[0]!
    const held = await call('/api/public/booking/hold', {
      method: 'POST',
      json: { slug: 'amaka-braids', serviceId: service.id, staffUserId: slot.staffUserId, startsAt: slot.startsAt },
    })
    expect(held.status).toBe(200)
    devSettings().set({ clockOffsetMs: HOLD_MS + 1000 })
    const again = await call('/api/public/booking/hold', {
      method: 'POST',
      json: { slug: 'amaka-braids', serviceId: service.id, staffUserId: slot.staffUserId, startsAt: slot.startsAt },
    })
    expect(again.status).toBe(200)
  })

  it('confirming a hold creates an appointment the calendar can see', async () => {
    const page = PublicBookingPageSchema.parse((await call('/api/public/booking/amaka-braids')).body)
    const service = page.services.find((s) => s.depositAmount === 0) ?? page.services[0]!
    const tomorrow = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const list = SlotListSchema.parse((await call(`/api/public/booking/amaka-braids/slots?date=${tomorrow}&serviceId=${service.id}`)).body)
    const slot = list[0]!
    const held = HoldResponseSchema.parse(
      (
        await call('/api/public/booking/hold', {
          method: 'POST',
          json: { slug: 'amaka-braids', serviceId: service.id, staffUserId: slot.staffUserId, startsAt: slot.startsAt },
        })
      ).body,
    )
    const booked = await call('/api/public/booking/confirm', {
      method: 'POST',
      json: {
        slug: 'amaka-braids',
        token: held.token,
        firstName: 'Ngozi',
        lastName: 'Test',
        phone: '+234 801 000 0099',
        marketing: false,
        serviceConsent: true,
        source: 'page',
      },
    })
    expect(booked.status).toBe(200)
    const cal = CalendarPayloadSchema.parse((await call('/api/calendar')).body)
    expect(cal.appointments.some((a) => a.contactName.includes('Ngozi'))).toBe(true)
  })
})

describe('reschedule (PRD 29.5 / 11.2)', () => {
  it('moving a booking in the calendar changes public availability', async () => {
    const cal = CalendarPayloadSchema.parse((await call('/api/calendar')).body)
    const appointment = cal.appointments.find((a) => a.status === 'booked')
    expect(appointment).toBeTruthy()
    const service = cal.services.find((s) => s.id === appointment!.serviceId) ?? cal.services[0]!
    let slot: { startsAt: string; staffUserId: string } | undefined
    for (let day = 1; day <= 10 && !slot; day++) {
      const date = new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      const list = SlotListSchema.parse((await call(`/api/slots?date=${date}&serviceId=${service.id}`)).body)
      slot = list.find((s) => s.staffUserId === appointment!.staffUserId) ?? list[0]
    }
    expect(slot).toBeTruthy()
    const moved = await call(`/api/appointments/${appointment!.id}`, {
      method: 'PATCH',
      json: { startsAt: slot!.startsAt, staffUserId: slot!.staffUserId },
    })
    expect(moved.status).toBe(200)
    AppointmentSchema.parse(moved.body)
    const date = slot!.startsAt.slice(0, 10)
    const publicSlots = SlotListSchema.parse(
      (await call(`/api/public/booking/amaka-braids/slots?date=${date}&serviceId=${service.id}`)).body,
    )
    const clash = publicSlots.find((s) => s.startsAt === slot!.startsAt && s.staffUserId === slot!.staffUserId)
    expect(clash === undefined || clash.remaining < service.capacity).toBe(true)
  })
})

describe('waitlist (PRD 11.2)', () => {
  it('records a public waitlist join when no slot is taken', async () => {
    const page = PublicBookingPageSchema.parse((await call('/api/public/booking/amaka-braids')).body)
    const joined = await call('/api/public/booking/waitlist', {
      method: 'POST',
      json: { slug: 'amaka-braids', serviceId: page.services[0]!.id, name: 'Ada Obi', phone: '+234 803 555 0101' },
    })
    expect(joined.status).toBe(200)
    expect(joined.body.name).toBe('Ada Obi')
  })
})
