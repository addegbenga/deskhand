import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PublicLandingSchema, ReportViewSchema, SitePageListSchema } from '@deskhand/schemas'
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

describe('S6 reports and pages (PRD 29.14, 29.6)', () => {
  it('puts a definition on every report number and changes cards with range and location', async () => {
    const week = ReportViewSchema.parse((await call('/api/reports/overview?range=7d')).body)
    const quarter = ReportViewSchema.parse((await call('/api/reports/overview?range=90d')).body)
    expect(week.cards.length).toBeGreaterThan(0)
    expect(week.cards.every((card) => card.definitionKey.length > 0)).toBe(true)
    expect(week.cards[0]!.value).not.toEqual(quarter.cards[0]!.value)
    const session = await call('/api/session')
    const locations = session.body.locations as { id: string }[]
    if (locations.length > 1) {
      const one = ReportViewSchema.parse((await call(`/api/reports/overview?range=90d&locationId=${locations[0]!.id}`)).body)
      const two = ReportViewSchema.parse((await call(`/api/reports/overview?range=90d&locationId=${locations[1]!.id}`)).body)
      expect(one.cards[0]!.value).not.toEqual(two.cards[0]!.value)
    }
  })

  it('blocks banned claims and serves a published page with consent and booking', async () => {
    const blocked = await call('/api/pages', { method: 'POST', json: { prompt: 'Guaranteed cheapest braids, 100% safe' } })
    expect(blocked.status).toBe(422)
    const pages = SitePageListSchema.parse((await call('/api/pages')).body)
    const live = pages.find((item) => item.status === 'published')!
    const pub = await call(`/api/public/pages/${live.slug}`)
    expect(pub.status).toBe(200)
    const landing = PublicLandingSchema.parse(pub.body)
    expect(landing.privacyHref).toContain('/privacy/')
    expect(landing.bookingSlug).toBeTruthy()
    expect(landing.page.blocks.some((block) => block.type === 'booking' || block.type === 'form')).toBe(true)
    const unpublished = await call(`/api/pages/${live.id}/unpublish`, { method: 'POST' })
    expect(unpublished.status).toBe(200)
    const gone = await call(`/api/public/pages/${live.slug}`)
    expect(gone.status).toBe(404)
  })
})
