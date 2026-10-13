import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  PreferenceCenterSchema,
  PublicFormPageSchema,
  PublicLinkResolveSchema,
  PublicPaymentPageSchema,
  PublicReviewLandingSchema,
  WidgetBootstrapSchema,
  WidgetSessionSchema,
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

describe('S9 public surfaces (PRD 11.4–11.9)', () => {
  it('turns a widget visitor with a phone number into a contact', async () => {
    const boot = WidgetBootstrapSchema.parse((await call('/api/public/widget/amaka-braids')).body)
    expect(boot.config.greeting.length).toBeGreaterThan(0)
    expect(boot.config.requireConsent).toBe(true)
    expect(boot.session.consented).toBe(false)
    const visitorId = boot.session.visitorId
    const blocked = await call('/api/public/widget/amaka-braids/messages', {
      method: 'POST',
      json: { visitorId, body: 'Hi' },
    })
    expect(blocked.status).toBe(422)
    const granted = await call('/api/public/widget/amaka-braids/consent', {
      method: 'POST',
      json: { visitorId, granted: true },
    })
    expect(granted.status).toBe(200)
    expect(WidgetSessionSchema.parse(granted.body).consented).toBe(true)
    const identified = await call('/api/public/widget/amaka-braids/identify', {
      method: 'POST',
      json: { visitorId, name: 'Kemi Ajayi', phone: '+234 803 111 2222' },
    })
    expect(identified.status).toBe(200)
    const session = WidgetSessionSchema.parse(identified.body)
    expect(session.contactId).toBeTruthy()
    const chat = await call('/api/public/widget/amaka-braids/messages', {
      method: 'POST',
      json: { visitorId, body: 'Can I book knotless braids tomorrow?' },
    })
    expect(chat.status).toBe(200)
    const thread = WidgetSessionSchema.parse(chat.body)
    expect(thread.messages.some((item) => item.role === 'ai' || item.role === 'system')).toBe(true)
    expect(thread.messages.some((item) => item.cards.length > 0)).toBe(true)
    const again = WidgetBootstrapSchema.parse((await call(`/api/public/widget/amaka-braids?visitorId=${visitorId}`)).body)
      .session
    expect(again.messages.some((item) => item.cards.length > 0)).toBe(true)
    const contacts = await call('/api/contacts?q=Kemi')
    expect(contacts.status).toBe(200)
    expect(JSON.stringify(contacts.body)).toContain('Kemi')
    const record = await call(`/api/contacts/${session.contactId}`)
    expect(record.status).toBe(200)
    expect(
      record.body.contact.consents.some((row: { channel: string; status: string }) => row.channel === 'webchat' && row.status === 'granted'),
    ).toBe(true)
  })

  it('never filters the review landing by sentiment', async () => {
    const { status, body } = await call('/api/public/reviews/amaka-braids')
    expect(status).toBe(200)
    const page = PublicReviewLandingSchema.parse(body)
    expect(page.googleHref).toContain('http')
    expect(JSON.stringify(page)).not.toMatch(/sentiment|star|promoter|detractor/i)
  })

  it('submits a live form as a lead', async () => {
    const form = PublicFormPageSchema.parse((await call('/api/public/forms/frm_A_lead')).body)
    expect(form.form.status).toBe('live')
    const submitted = await call('/api/public/forms/frm_A_lead/submit', {
      method: 'POST',
      json: {
        answers: { name: 'Tolu Bello', phone: '+234 809 444 5555', visit: 'Yes', consent: 'yes' },
      },
    })
    expect(submitted.status).toBe(200)
    expect(submitted.body.contactId).toBeTruthy()
  })

  it('pays an open payment link', async () => {
    const page = PublicPaymentPageSchema.parse((await call('/api/public/pay/plink_A_1')).body)
    expect(page.status).toBe('open')
    const paid = await call('/api/public/pay/plink_A_1', { method: 'POST', json: { method: 'card' } })
    expect(paid.status).toBe(200)
    expect(paid.body.status).toBe('paid')
  })

  it('resolves a link hub and records WhatsApp QR clicks', async () => {
    const hub = PublicLinkResolveSchema.parse((await call('/api/public/l/amaka-braids')).body)
    expect(hub.kind).toBe('hub')
    if (hub.kind === 'hub') expect(hub.hub.buttons.some((item) => item.id === 'book')).toBe(true)
    const before = await call('/api/links')
    const bio = (before.body as { code: string; clicks: number }[]).find((item) => item.code === 'BIO')!
    const go = PublicLinkResolveSchema.parse((await call('/api/public/l/BIO')).body)
    expect(go.kind).toBe('track')
    const after = await call('/api/links')
    const next = (after.body as { code: string; clicks: number }[]).find((item) => item.code === 'BIO')!
    expect(next.clicks).toBe(bio.clicks + 1)
  })

  it('writes preference changes to the contact and accepts a privacy request', async () => {
    const prefs = PreferenceCenterSchema.parse((await call('/api/public/preferences/pref-amaka-braids')).body)
    expect(prefs.channels.length).toBeGreaterThan(0)
    const patched = await call('/api/public/preferences/pref-amaka-braids', {
      method: 'PATCH',
      json: { unsubscribeAll: true },
    })
    expect(patched.status).toBe(200)
    expect(PreferenceCenterSchema.parse(patched.body).optedOut).toBe(true)
    const created = await call('/api/public/privacy/amaka-braids', {
      method: 'POST',
      json: { type: 'access', name: 'Kemi Ajayi', email: 'kemi@example.com' },
    })
    expect(created.status).toBe(200)
    const verified = await call('/api/public/privacy/amaka-braids/verify', {
      method: 'POST',
      json: { requestId: created.body.requestId, code: '123456' },
    })
    expect(verified.body.verified).toBe(true)
  })
})
