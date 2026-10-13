import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AdminSessionSchema, BannerSchema, NavSummarySchema, pageOf, SessionSchema, TenantSummarySchema } from '@deskhand/schemas'
import { z } from 'zod'
import { devSettings } from './dev-settings'
import { handlers } from './handlers'
import { onChange } from './sync'

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
beforeEach(() => {
  devSettings().set({
    scenario: 'A',
    role: 'owner',
    adminPersona: 'support',
    network: 'fast',
    signedIn: true,
    adminSignedIn: true,
    impersonating: false,
    clockOffsetMs: 0,
  })
})

describe('tenant session and auth', () => {
  it('returns a contract-valid session for the selected role', async () => {
    devSettings().set({ role: 'manager' })
    const { status, body } = await call('/api/session')
    expect(status).toBe(200)
    const session = SessionSchema.parse(body)
    expect(session.account.name).toBe('Amaka Braids')
    expect(session.membership.role).toBe('manager')
  })

  it('returns the contract error shape with 401 when signed out', async () => {
    devSettings().set({ signedIn: false })
    const { status, body } = await call('/api/session')
    expect(status).toBe(401)
    expect(body.error.code).toBe('unauthenticated')
    expect(body.error.supportCode).toMatch(/^DH-/)
  })
})

describe('permissions are enforced by the mock, not only the UI', () => {
  it('refuses AI kill switch for staff and names the role that can', async () => {
    devSettings().set({ role: 'staff' })
    const { status, body } = await call('/api/account', { method: 'PATCH', json: { aiMode: 'paused' } })
    expect(status).toBe(403)
    expect(body.error.code).toBe('forbidden')
    expect(body.error.requiredRole).toBe('admin')
  })

  it('lets the owner pause AI, announces the change and surfaces the banner', async () => {
    const topics: string[][] = []
    const off = onChange((event) => topics.push(event.topics))
    const patched = await call('/api/account', { method: 'PATCH', json: { aiMode: 'paused' } })
    off()
    expect(patched.status).toBe(200)
    expect(topics.flat()).toContain('session')

    const banners = z.array(BannerSchema).parse((await call('/api/banners')).body)
    expect(banners.map((b) => b.kind)).toContain('ai_paused')

    await call('/api/account', { method: 'PATCH', json: { aiMode: 'on' } })
  })

  it('hides approvals in manual mode (FR-MA.7)', async () => {
    devSettings().set({ scenario: 'B' })
    const summary = NavSummarySchema.parse((await call('/api/nav-summary')).body)
    expect(summary.approvalsWaiting).toBe(0)
  })
})

describe('network simulation (FE-DOC 8.5)', () => {
  it('fails like a dropped connection when offline', async () => {
    devSettings().set({ network: 'offline' })
    await expect(fetch(`${BASE}/api/session`)).rejects.toThrow()
  })
})

describe('admin console', () => {
  it('masks personal data until a logged reveal with a reason', async () => {
    const page = pageOf(TenantSummarySchema)
    const masked = page.parse((await call('/api/admin/tenants?q=amaka')).body)
    expect(masked.items[0]?.ownerName).toBe('A•••• O••')

    const tooShort = await call('/api/admin/reveal', { method: 'POST', json: { field: 'tenant_pii', reason: 'because' } })
    expect(tooShort.status).toBe(422)
    expect(tooShort.body.error.fieldErrors.reason).toBeDefined()

    const revealed = await call('/api/admin/reveal', {
      method: 'POST',
      json: { field: 'tenant_pii', reason: 'Ticket 4821: missing booking' },
    })
    expect(revealed.status).toBe(200)
    expect(page.parse((await call('/api/admin/tenants?q=amaka')).body).items[0]?.ownerName).toBe('Amaka Obi')
    expect(AdminSessionSchema.parse((await call('/api/admin/session')).body).piiRevealedUntil).not.toBeNull()

    await call('/api/admin/reveal/end', { method: 'POST' })
  })

  it('reports an active support session', async () => {
    devSettings().set({ impersonating: true })
    const session = AdminSessionSchema.parse((await call('/api/admin/session')).body)
    expect(session.impersonation?.tenantName).toBe('Amaka Braids')
    expect(session.impersonation?.readOnly).toBe(true)
  })

  it('filters tenants by region', async () => {
    const page = pageOf(TenantSummarySchema).parse((await call('/api/admin/tenants?region=africa&limit=100')).body)
    expect(page.items.length).toBeGreaterThan(0)
    expect(page.items.every((t) => t.region === 'africa')).toBe(true)
    expect(page.total).toBeLessThan(400)
  })
})

describe('public pages', () => {
  it('serves any demo business, not only the selected scenario', async () => {
    const { status, body } = await call('/api/public/tenants/brixton-barbers')
    expect(status).toBe(200)
    expect(body.name).toBe('Brixton Barbers')
  })

  it('returns not_found for unknown businesses', async () => {
    const { status, body } = await call('/api/public/tenants/nope')
    expect(status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })
})
