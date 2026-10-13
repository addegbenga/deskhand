import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  EmployeeListSchema,
  EmployeeSchema,
  KnowledgeItemSchema,
  KnowledgeListSchema,
  KnowledgePreviewSchema,
  SandboxReplySchema,
  TrainingListSchema,
} from '@deskhand/schemas'
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

describe('AI employees (PRD 29.7–29.9, 9.3)', () => {
  it('refuses Autopilot on a Tier C language', async () => {
    const list = await call('/api/employees')
    expect(list.status).toBe(200)
    const ada = EmployeeListSchema.parse(list.body).find((item) => item.kind === 'chat')!
    const yo = ada.languages.find((lang) => lang.code === 'yo')
    expect(yo?.tier).toBe('C')
    const raised = await call(`/api/employees/${ada.id}/autonomy`, {
      method: 'POST',
      json: { language: 'yo', autonomy: 'autopilot', reason: 'Want faster Yoruba replies for the salon' },
    })
    expect(raised.status).toBe(422)
  })

  it('never states an unverified price in the sandbox', async () => {
    const list = await call('/api/employees')
    const ada = EmployeeListSchema.parse(list.body).find((item) => item.kind === 'chat')!
    const reply = await call(`/api/employees/${ada.id}/sandbox`, {
      method: 'POST',
      json: { message: 'How much are knotless braids?', scenario: 'price' },
    })
    expect(reply.status).toBe(200)
    const parsed = SandboxReplySchema.parse(reply.body)
    expect(parsed.text).not.toMatch(/35,?000/)
    expect(parsed.text.toLowerCase()).not.toContain('knotless')
    expect(parsed.blocked).toBe(true)
  })

  it('raising autonomy requires a reason and creates a new version', async () => {
    const list = await call('/api/employees')
    const ada = EmployeeListSchema.parse(list.body).find((item) => item.kind === 'chat')!
    const missing = await call(`/api/employees/${ada.id}`, {
      method: 'PATCH',
      json: { tools: ada.tools.map((tool) => (tool.id === 'book' ? { ...tool, autonomy: 'autopilot' } : tool)) },
    })
    expect(missing.status).toBe(422)
    const ok = await call(`/api/employees/${ada.id}`, {
      method: 'PATCH',
      json: {
        tools: ada.tools.map((tool) => (tool.id === 'book' ? { ...tool, autonomy: 'autopilot' } : tool)),
        reason: 'Bookings have been accurate for 30 days',
      },
    })
    expect(ok.status).toBe(200)
    const updated = EmployeeSchema.parse(ok.body)
    expect(updated.version).toBeGreaterThan(ada.version)
    const versions = await call(`/api/employees/${ada.id}/versions`)
    expect(versions.status).toBe(200)
    expect(versions.body.length).toBeGreaterThan(ada.version)
  })

  it('knowledge preview never states an unverified price and names the items used', async () => {
    const preview = await call('/api/knowledge/preview', {
      method: 'POST',
      json: { question: 'How much are knotless braids?' },
    })
    expect(preview.status).toBe(200)
    const parsed = KnowledgePreviewSchema.parse(preview.body)
    expect(parsed.text).not.toMatch(/35,?000/)
    expect(parsed.blocked).toBe(true)
    expect(parsed.items.every((item) => item.status === 'verified')).toBe(true)
  })

  it('imports land unverified in the chosen collection', async () => {
    const imported = await call('/api/knowledge/import', {
      method: 'POST',
      json: { collection: 'policies', paste: 'Late guests wait 15 minutes then we rebook.' },
    })
    expect(imported.status).toBe(201)
    const item = KnowledgeItemSchema.parse(imported.body)
    expect(item.status).toBe('unverified')
    expect(item.collection).toBe('policies')
    expect(item.source).toBe('import')
  })

  it('adds a training answer into the knowledge base', async () => {
    const inbox = TrainingListSchema.parse((await call('/api/knowledge/training')).body)
    const first = inbox[0]!
    const added = await call(`/api/knowledge/training/${first.id}/add`, {
      method: 'POST',
      json: { answer: 'We only work in the salon, not at hotels or homes.' },
    })
    expect(added.status).toBe(200)
    const item = KnowledgeItemSchema.parse(added.body)
    expect(item.answer).toContain('salon')
    expect(item.source).toBe('training')
    const after = KnowledgeListSchema.parse((await call('/api/knowledge?collection=faqs')).body)
    expect(after.items.some((row) => row.id === item.id)).toBe(true)
  })

  it('queues every approval kind from inbox, marketing, reputation and money tools', async () => {
    const queue = await call('/api/approvals?status=pending')
    expect(queue.status).toBe(200)
    const kinds = new Set((queue.body.items as { kind: string }[]).map((item) => item.kind))
    expect(kinds).toEqual(new Set(['reply', 'payment_link', 'post', 'review_reply', 'bulk', 'discount']))
  })

  it('chat wizard draft cannot go live on Autopilot while a Tier C language is served', async () => {
    const created = await call('/api/employees', {
      method: 'POST',
      json: { kind: 'chat', template: 'receptionist', name: 'Ngozi' },
    })
    expect(created.status).toBe(201)
    const employee = EmployeeSchema.parse(created.body)
    expect(employee.status).toBe('draft')
    expect(employee.languages.some((lang) => lang.tier === 'C')).toBe(true)
    const live = await call(`/api/employees/${employee.id}/publish`, { method: 'POST', json: { rollout: 'autopilot' } })
    expect(live.status).toBe(422)
  })

  it('voice number port stays in progress after identity documents', async () => {
    const created = await call('/api/employees', {
      method: 'POST',
      json: { kind: 'voice', template: 'inbound', name: 'Ada Voice Line' },
    })
    expect(created.status).toBe(201)
    const employee = EmployeeSchema.parse(created.body)
    expect(employee.phoneStatus).toBe('none')
    const patched = await call(`/api/employees/${employee.id}`, {
      method: 'PATCH',
      json: { phoneSource: 'port', phoneNumber: '+234 802 555 0101', phoneStatus: 'porting' },
    })
    expect(patched.status).toBe(200)
    expect(EmployeeSchema.parse(patched.body)).toMatchObject({
      kind: 'voice',
      phoneSource: 'port',
      phoneStatus: 'porting',
      phoneNumber: '+234 802 555 0101',
    })
  })

  it('kill switch pauses the employee immediately', async () => {
    const list = await call('/api/employees')
    const ada = EmployeeListSchema.parse(list.body).find((item) => item.kind === 'chat')!
    const killed = await call(`/api/employees/${ada.id}/kill`, { method: 'POST' })
    expect(killed.status).toBe(200)
    const after = EmployeeSchema.parse(killed.body)
    expect(after.killSwitched).toBe(true)
    expect(after.status).toBe('paused')
    const sandbox = await call(`/api/employees/${ada.id}/sandbox`, { method: 'POST', json: { message: 'Hi' } })
    const reply = SandboxReplySchema.parse(sandbox.body)
    expect(reply.blocked).toBe(true)
    expect(reply.text.toLowerCase()).toContain('paused')
  })
})
