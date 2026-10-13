import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { CampaignCheckSchema, RecipeListSchema } from '@deskhand/schemas'
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

describe('S5 grow (PRD 29.10–29.13)', () => {
  it('shows campaign exclusions and why before send', async () => {
    const list = await call('/api/campaigns')
    expect(list.status).toBe(200)
    const draft = (list.body as { id: string; status: string }[]).find((item) => item.status === 'draft')!
    const check = await call(`/api/campaigns/${draft.id}/check`, { method: 'POST' })
    expect(check.status).toBe(200)
    const parsed = CampaignCheckSchema.parse(check.body)
    expect(parsed.excludedConsent).toBeGreaterThan(0)
    expect(parsed.excludedOptOut).toBeGreaterThan(0)
    expect(parsed.excludedQuietHours).toBeGreaterThan(0)
    expect(parsed.reasons.length).toBeGreaterThan(0)
    expect(parsed.canSend).toBe(true)
    const sent = await call(`/api/campaigns/${draft.id}/send`, { method: 'POST' })
    expect(sent.status).toBe(200)
    expect(sent.body.status).toBe('sent')
    expect(sent.body.delivered).toBeGreaterThan(0)
    expect(sent.body.bookings).toBeGreaterThan(0)
  })

  it('creates a pack template and schedules an approved planner post', async () => {
    const created = await call('/api/templates', {
      method: 'POST',
      json: { name: 'Pack offer', channel: 'whatsapp', body: 'Hi {{1}}, we have a chair this week.' },
    })
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('draft')
    const posts = await call('/api/planner')
    const approved = (posts.body as { id: string; status: string }[]).find((item) => item.status === 'approved')
    expect(approved).toBeTruthy()
    const scheduled = await call(`/api/planner/${approved!.id}`, {
      method: 'PATCH',
      json: { status: 'scheduled' },
    })
    expect(scheduled.status).toBe(200)
    expect(scheduled.body.status).toBe('scheduled')
  })

  it('blocks review-request wording that offers a reward', async () => {
    const blocked = await call('/api/review-settings', {
      method: 'PATCH',
      json: { wording: { en: 'Leave a review and get a free gift voucher' } },
    })
    expect(blocked.status).toBe(422)
    expect(blocked.body.error.fieldErrors.wording).toEqual(['reward'])
    const ok = await call('/api/review-settings', {
      method: 'PATCH',
      json: { wording: { en: 'We would love your honest review of your visit.' } },
    })
    expect(ok.status).toBe(200)
  })

  it('refuses a recipe test on a channel the contact has not agreed to', async () => {
    const recipes = RecipeListSchema.parse((await call('/api/recipes')).body)
    const recipe = recipes.find((item) => item.channels.includes('whatsapp'))!
    const denied = await call(`/api/recipes/${recipe.id}/test`, { method: 'POST', json: { contactId: 'con_A_6' } })
    expect(denied.status).toBe(422)
    const allowed = await call(`/api/recipes/${recipe.id}/test`, { method: 'POST', json: { contactId: 'con_A_1' } })
    expect(allowed.status).toBe(200)
    expect(allowed.body.run.testMode).toBe(true)
    expect(allowed.body.run.steps.some((step: { result: string }) => step.result === 'skipped_test')).toBe(true)
  })

  it('creates a pack recipe without sending until enabled', async () => {
    const created = await call('/api/recipes', { method: 'POST', json: { packKey: 'win_back', name: 'Quiet regulars' } })
    expect(created.status).toBe(201)
    expect(created.body.packKey).toBe('win_back')
    expect(created.body.enabled).toBe(false)
    expect(created.body.name).toBe('Quiet regulars')
    const patched = await call(`/api/recipes/${created.body.id}`, {
      method: 'PATCH',
      json: { channels: ['whatsapp', 'email'], stopOnBook: true },
    })
    expect(patched.status).toBe(200)
    expect(patched.body.channels).toEqual(['whatsapp', 'email'])
  })

  it('lists reviews with source and unanswered filter (PRD 29.12)', async () => {
    const all = await call('/api/reviews')
    expect(all.status).toBe(200)
    expect(all.body.length).toBeGreaterThan(2)
    expect(all.body.some((item: { source: string }) => item.source === 'google')).toBe(true)
    const unanswered = await call('/api/reviews?status=unanswered')
    expect(unanswered.body.every((item: { status: string }) => item.status !== 'replied')).toBe(true)
    const google = await call('/api/reviews?source=google')
    expect(google.body.every((item: { source: string }) => item.source === 'google')).toBe(true)
    const insights = await call('/api/review-insights')
    expect(insights.status).toBe(200)
    expect(insights.body.unanswered).toBeGreaterThan(0)
    expect(insights.body.staff.length).toBeGreaterThan(0)
  })
})
