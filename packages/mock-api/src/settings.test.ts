import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  AcceptInvitationSchema,
  BulkInviteResultSchema,
  ConnectionHubSchema,
  InvitationPreviewSchema,
  SessionSchema,
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

describe('S7 settings (PRD 29.15, 29.16, 12.4, 13)', () => {
  it('reports per-address invite results and lets the invitee join as staff', async () => {
    const sent = BulkInviteResultSchema.parse(
      (
        await call('/api/team/invites', {
          method: 'POST',
          json: { emails: 'ada.okonkwo@gmail.com, x@mailinator.com, not-an-email, amaka.obi@amakabraids.com', role: 'staff' },
        })
      ).body,
    )
    expect(sent.results).toEqual(
      expect.arrayContaining([
        { email: 'ada.okonkwo@gmail.com', result: 'sent' },
        { email: 'x@mailinator.com', result: 'blocked' },
        { email: 'not-an-email', result: 'invalid' },
        { email: 'amaka.obi@amakabraids.com', result: 'already_member' },
      ]),
    )
    const token = (await call('/api/team/invitations')).body.find((item: { email: string }) => item.email === 'ada.okonkwo@gmail.com').token
    const preview = InvitationPreviewSchema.parse((await call(`/api/invitations/${token}`)).body)
    expect(preview.role).toBe('staff')
    const accepted = await call(`/api/invitations/${token}/accept`, {
      method: 'POST',
      json: AcceptInvitationSchema.parse({ method: 'password', name: 'Ada Okonkwo', password: 'Correcthorse1', language: 'en', timezone: 'Africa/Lagos' }),
    })
    expect(accepted.status).toBe(200)
    expect(SessionSchema.parse(accepted.body.session).membership.role).toBe('staff')
  })

  it('shows an upgrade result when seats are gone and a usage cap', async () => {
    const emails = Array.from({ length: 12 }, (_, index) => `seat${index}@gmail.com`).join(',')
    const batch = BulkInviteResultSchema.parse((await call('/api/team/invites', { method: 'POST', json: { emails, role: 'staff' } })).body)
    expect(batch.results.some((item) => item.result === 'plan_limit')).toBe(true)
    const usage = await call('/api/usage')
    expect(usage.status).toBe(200)
    expect(usage.body.meters.some((meter: { alert: string }) => meter.alert === 'cap')).toBe(true)
  })

  it('fixes a broken connection and requires the business name to close', async () => {
    const hub = ConnectionHubSchema.parse((await call('/api/connections')).body)
    const email = hub.groups.flatMap((group) => group.cards).find((card) => card.kind === 'email')
    expect(email?.status).toBe('needs_attention')
    expect((await call('/api/connections/email/fix', { method: 'POST' })).status).toBe(200)
    const after = ConnectionHubSchema.parse((await call('/api/connections')).body)
    expect(after.groups.flatMap((group) => group.cards).find((card) => card.kind === 'email')?.status).toBe('connected')
    expect((await call('/api/account/close', { method: 'POST', json: { exportChoice: 'skip', confirmation: 'wrong' } })).status).toBe(422)
    expect((await call('/api/account/close', { method: 'POST', json: { exportChoice: 'now', confirmation: 'Amaka Braids' } })).status).toBe(200)
  })
})
