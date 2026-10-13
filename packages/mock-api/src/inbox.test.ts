import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  ContactPageSchema,
  ConversationPageSchema,
  ConversationThreadSchema,
  HomeDashboardSchema,
  MessageSchema,
} from '@deskhand/schemas'
import { z } from 'zod'
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

describe('home (PRD 29.1)', () => {
  it('returns attention, today, results and AI activity for scenario A', async () => {
    const { status, body } = await call('/api/home')
    expect(status).toBe(200)
    const home = HomeDashboardSchema.parse(body)
    expect(home.results.length).toBe(5)
    expect(home.aiActivity.length).toBeGreaterThan(0)
    expect(home.attention.length).toBeGreaterThan(0)
  })

  it('hides AI activity in manual mode', async () => {
    devSettings().set({ scenario: 'B' })
    await resetScenario('B')
    const home = HomeDashboardSchema.parse((await call('/api/home')).body)
    expect(home.aiActivity).toEqual([])
    expect(home.suggestions).toEqual([])
  })
})

describe('inbox (PRD 29.2)', () => {
  it('filters the list by channel', async () => {
    const all = ConversationPageSchema.parse((await call('/api/conversations?view=all&limit=50')).body)
    const channel = all.items.find((item) => item.channel === 'whatsapp')?.channel ?? 'whatsapp'
    const filtered = ConversationPageSchema.parse((await call(`/api/conversations?view=all&channel=${channel}&limit=50`)).body)
    expect(filtered.items.length).toBeGreaterThan(0)
    expect(filtered.items.every((item) => item.channel === channel)).toBe(true)
    expect(filtered.tags.length).toBeGreaterThan(0)
  })

  it('lists conversations and opens a thread', async () => {
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all')).body)
    expect(page.items.length).toBeGreaterThan(0)
    const id = page.items[0]!.id
    const thread = ConversationThreadSchema.parse((await call(`/api/conversations/${id}`)).body)
    expect(thread.messages.length).toBeGreaterThan(0)
  })

  it('records missing channel consent so a send can go through', async () => {
    const pages = await Promise.all(
      (['all', 'waiting', 'needs_human', 'ai_handled', 'closed'] as const).map((view) =>
        call(`/api/conversations?view=${view}&limit=50`).then((r) => ConversationPageSchema.parse(r.body)),
      ),
    )
    const ids = [...new Set(pages.flatMap((page) => page.items.map((item) => item.id)))]
    const threads = await Promise.all(ids.map((id) => call(`/api/conversations/${id}`).then((r) => ConversationThreadSchema.parse(r.body))))
    const blocked = threads.find((thread) => thread.sendBlock?.reason === 'consent_missing')
    expect(blocked).toBeTruthy()
    const granted = await call(`/api/contacts/${blocked!.contact.id}/consent`, {
      method: 'POST',
      json: { channel: blocked!.conversation.channel, status: 'granted' },
    })
    expect(granted.status).toBe(200)
    const again = ConversationThreadSchema.parse((await call(`/api/conversations/${blocked!.conversation.id}`)).body)
    expect(again.sendBlock).toBeNull()
  })

  it('blocks send when the contact opted out', async () => {
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all&limit=50')).body)
    const opted = page.items.find((item) => item.contactName)
    const threads = await Promise.all(
      page.items.slice(0, 15).map((item) => call(`/api/conversations/${item.id}`).then((r) => ConversationThreadSchema.parse(r.body))),
    )
    const blocked = threads.find((thread) => thread.contact.optedOut)
    expect(blocked).toBeTruthy()
    const sent = await call(`/api/conversations/${blocked!.conversation.id}/messages`, { method: 'POST', json: { body: 'Hi' } })
    expect(sent.status).toBe(422)
    expect(sent.body.error.fieldErrors.send).toContain('opted_out')
    void opted
  })

  it('requires a template when the WhatsApp window is closed', async () => {
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all&limit=50')).body)
    const closed = page.items.find((item) => item.channel === 'whatsapp' && !item.windowOpen)
    expect(closed).toBeTruthy()
    const sent = await call(`/api/conversations/${closed!.id}/messages`, { method: 'POST', json: { body: 'Hi there' } })
    expect(sent.status).toBe(422)
    expect(sent.body.error.fieldErrors.send).toContain('window_closed')
    const templates = z.array(z.object({ id: z.string(), status: z.string() })).parse((await call('/api/templates')).body)
    const approved = templates.find((item) => item.status === 'approved')
    const ok = await call(`/api/conversations/${closed!.id}/messages`, { method: 'POST', json: { templateId: approved!.id } })
    expect(ok.status).toBe(201)
    MessageSchema.parse(ok.body)
  })

  it('lets a person send when AI is off (FR-MA.1)', async () => {
    devSettings().set({ scenario: 'B' })
    await resetScenario('B')
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all')).body)
    const open = page.items.find((item) => item.status !== 'closed') ?? page.items[0]!
    const sent = await call(`/api/conversations/${open.id}/messages`, { method: 'POST', json: { body: 'See you at 10am' } })
    expect(sent.status).toBe(201)
    expect(MessageSchema.parse(sent.body).authorKind).toBe('person')
  })

  it('refuses send for read-only', async () => {
    devSettings().set({ role: 'readonly' })
    const page = ConversationPageSchema.parse((await call('/api/conversations?view=all')).body)
    const sent = await call(`/api/conversations/${page.items[0]!.id}/messages`, { method: 'POST', json: { body: 'Hi' } })
    expect(sent.status).toBe(403)
  })
})

describe('contacts (PRD 29.3)', () => {
  it('creates, lists and finds duplicates', async () => {
    const created = await call('/api/contacts', { method: 'POST', json: { firstName: 'Ada', lastName: 'Test', phone: '+234 800 000 0000' } })
    expect(created.status).toBe(201)
    const page = ContactPageSchema.parse((await call('/api/contacts?q=Ada')).body)
    expect(page.items.some((c) => c.lastName === 'Test')).toBe(true)
    const dups = z.array(z.object({ reason: z.string(), contacts: z.array(z.object({ id: z.string() })) })).parse((await call('/api/duplicates')).body)
    expect(dups.length).toBeGreaterThan(0)
  })

  it('imports with consent attestation and supports undo', async () => {
    const csv = 'firstName,lastName,phone,email\nBola,Ade,+234 801 222 3333,bola@example.com\n'
    const job = await call('/api/imports', { method: 'POST', json: { csv, attested: true, mapping: {} } })
    expect(job.status).toBe(201)
    expect(job.body.createdCount).toBe(1)
    const undone = await call(`/api/imports/${job.body.id}/undo`, { method: 'POST' })
    expect(undone.status).toBe(204)
  })

  it('refuses export for staff', async () => {
    devSettings().set({ role: 'staff' })
    const { status } = await call('/api/exports/contacts')
    expect(status).toBe(403)
  })

  it('filters contacts and applies a smart list', async () => {
    const wa = ContactPageSchema.parse((await call('/api/contacts?source=whatsapp&limit=50')).body)
    expect(wa.items.length).toBeGreaterThan(0)
    expect(wa.items.every((c) => c.sourceLabel === 'whatsapp')).toBe(true)
    const lists = z.array(z.object({ id: z.string(), name: z.string() })).parse((await call('/api/smart-lists')).body)
    const vip = lists.find((list) => list.name === 'VIP')
    expect(vip).toBeTruthy()
    const filtered = ContactPageSchema.parse((await call(`/api/contacts?listId=${vip!.id}&limit=50`)).body)
    expect(filtered.items.length).toBeGreaterThan(0)
    expect(filtered.items.every((c) => c.tags.includes('VIP'))).toBe(true)
    const created = await call('/api/smart-lists', { method: 'POST', json: { name: 'Form leads', filters: { source: 'form' } } })
    expect(created.status).toBe(201)
  })

  it('groups contacts under a company', async () => {
    const companies = z.array(z.object({ id: z.string(), name: z.string(), contactCount: z.number() })).parse((await call('/api/companies')).body)
    expect(companies.length).toBeGreaterThan(0)
    expect(companies[0]!.contactCount).toBeGreaterThan(0)
    const detail = z
      .object({ company: z.object({ name: z.string() }), contacts: z.array(z.object({ id: z.string(), companyId: z.string().nullable() })) })
      .parse((await call(`/api/companies/${companies[0]!.id}`)).body)
    expect(detail.contacts.every((c) => c.companyId === companies[0]!.id)).toBe(true)
    const created = await call('/api/companies', { method: 'POST', json: { name: 'Test Co' } })
    expect(created.status).toBe(201)
  })
})
