import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ComplianceOverviewSchema, DsarQueueSchema, EmployeeListSchema } from '@deskhand/schemas'
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

describe('S8 compliance center (PRD 30, 8, FR-CC.1, FR-CC.3)', () => {
  it('changes the checklist and wording when the market pack changes', async () => {
    const ng = ComplianceOverviewSchema.parse((await call('/api/compliance/overview?market=NG')).body)
    const uk = ComplianceOverviewSchema.parse((await call('/api/compliance/overview?market=UK')).body)
    const us = ComplianceOverviewSchema.parse((await call('/api/compliance/overview?market=US')).body)
    expect(ng.items.map((item) => item.id)).toContain('regulator_register')
    expect(ng.items.map((item) => item.id)).not.toContain('marketing_opt_in')
    expect(uk.items.map((item) => item.id)).toContain('marketing_opt_in')
    expect(uk.items.map((item) => item.id)).not.toContain('regulator_register')
    expect(us.items.map((item) => item.id)).toContain('all_party')
    expect(us.dsrDays).toBe(45)
    expect(ng.dsrDays).toBe(30)
    expect(uk.wordingPreview).toMatch(/UK GDPR/)
    expect(ng.wordingPreview).toMatch(/Nigeria Data Protection/)
    expect(uk.wordingPreview).not.toEqual(ng.wordingPreview)
  })

  it('blocks Autopilot while a Blocking item is open, with a visible reason', async () => {
    const unverify = await call('/api/compliance/disclosure', { method: 'PATCH', json: { verified: false } })
    expect(unverify.status).toBe(200)
    expect(unverify.body.verified).toBe(false)
    const overview = ComplianceOverviewSchema.parse((await call('/api/compliance/overview')).body)
    expect(overview.blocking).toContain('disclosure')
    const list = await call('/api/employees')
    const ada = EmployeeListSchema.parse(list.body).find((item) => item.kind === 'chat')!
    const blocked = await call(`/api/employees/${ada.id}/autonomy`, {
      method: 'POST',
      json: { toolId: 'book', autonomy: 'autopilot', reason: 'Bookings have been accurate for 30 days' },
    })
    expect(blocked.status).toBe(422)
    expect(blocked.body.error.fieldErrors.compliance).toContain('disclosure')
    const goLive = await call(`/api/employees/${ada.id}/publish`, { method: 'POST', json: { rollout: 'suggest' } })
    expect(goLive.status).toBe(422)
    const verified = await call('/api/compliance/disclosure/verify', { method: 'POST', json: { channel: 'whatsapp', language: 'en' } })
    expect(verified.body.verified).toBe(true)
    const ok = await call(`/api/employees/${ada.id}/autonomy`, {
      method: 'POST',
      json: { toolId: 'book', autonomy: 'autopilot', reason: 'Bookings have been accurate for 30 days' },
    })
    expect(ok.status).toBe(200)
  })

  it('escalates a request that is nearing its deadline', async () => {
    const queue = DsarQueueSchema.parse((await call('/api/compliance/requests')).body)
    expect(queue.items.some((item) => item.escalate)).toBe(true)
    expect(queue.items.some((item) => item.overdue)).toBe(true)
    const overview = ComplianceOverviewSchema.parse((await call('/api/compliance/overview')).body)
    expect(overview.items.some((item) => item.escalate)).toBe(true)
  })

  it('keeps managers read-only on edits', async () => {
    devSettings().set({ role: 'manager' })
    const forbidden = await call('/api/compliance/disclosure', { method: 'PATCH', json: { verified: false } })
    expect(forbidden.status).toBe(403)
    const view = await call('/api/compliance/overview')
    expect(view.status).toBe(200)
  })
})
