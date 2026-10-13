import 'fake-indexeddb/auto'
import { setupServer } from 'msw/node'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  ImportResultSchema,
  InvitationPreviewSchema,
  LoginResultSchema,
  OnboardingViewSchema,
  OutboxMessageSchema,
  SandboxScriptSchema,
  SignupSchema,
  type OnboardingView,
} from '@deskhand/schemas'
import { z } from 'zod'
import { getAuthDb } from './auth-db'
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

const post = (path: string, json: unknown = {}) => call(path, { method: 'POST', json })
const view = (body: unknown): OnboardingView => OnboardingViewSchema.parse(body)
const fieldErrors = (body: unknown) => (body as { error: { fieldErrors?: Record<string, string[]> } }).error.fieldErrors ?? {}

const START = {
  method: 'email',
  email: 'tolu@tolusnails.ng',
  password: 'Nails2026!',
  country: 'NG',
  acceptTerms: true,
  confirmAdultBusiness: true,
  marketingOptIn: false,
}

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterAll(() => server.close())
beforeEach(async () => {
  devSettings().set({ scenario: 'A', role: 'owner', userId: null, network: 'instant', signedIn: true, clockOffsetMs: 0 })
  const auth = getAuthDb()
  await Promise.all([auth.meta.clear(), auth.signups.clear(), auth.credentials.clear(), auth.outbox.clear(), auth.resets.clear(), auth.attempts.clear()])
  await resetScenario('E')
  await resetScenario('A')
})

async function signUpToWorkspace() {
  expect((await post('/api/auth/signup', START)).status).toBe(200)
  await post('/api/auth/signup/verify', { code: '123456' })
  await call('/api/auth/signup', { method: 'PATCH', json: { aboutYou: { name: 'Tolu Bakare', role: 'owner', teamSize: '2_5', heardFrom: 'instagram' } } })
  const business = await call('/api/auth/signup', {
    method: 'PATCH',
    json: { business: { businessName: "Tolu's Nails", industry: 'salon', link: 'tolusnails.ng', city: 'Ibadan', timezone: 'Africa/Lagos', currency: 'NGN' } },
  })
  const signup = SignupSchema.parse(business.body)
  await call('/api/auth/signup', { method: 'PATCH', json: { plan: 'starter' } })
  return post('/api/auth/signup/complete', { slug: signup.suggestedSlug })
}

describe('sign-up', () => {
  it('goes from the first screen to a new workspace at onboarding step 2', async () => {
    const wrong = await post('/api/auth/signup', START).then(() => post('/api/auth/signup/verify', { code: '000000' }))
    expect(wrong.status).toBe(422)
    expect(fieldErrors(wrong.body).code).toEqual(['wrong_code'])
    expect(SignupSchema.parse((await call('/api/auth/signup')).body).attemptsLeft).toBe(4)
    await call('/api/auth/signup', { method: 'DELETE' })
    await getAuthDb().signups.clear()

    const done = await signUpToWorkspace()
    expect(done.status).toBe(200)
    const result = LoginResultSchema.parse(done.body)
    expect(result.next).toBe('/onboarding/profile')
    expect(result.session.account).toMatchObject({ name: "Tolu's Nails", slug: 'tolus-nails', market: 'NG', state: 'trial', aiMode: 'manual' })
    expect(result.session.user.name).toBe('Tolu Bakare')
    expect(devSettings().scenario).toBe('E')

    const onboarding = view((await call('/api/onboarding')).body)
    expect(onboarding.state.currentStep).toBe('profile')
    expect(onboarding.state.profile.link).toBe('tolusnails.ng')
  })

  it('resumes where the person left off', async () => {
    await post('/api/auth/signup', START)
    await post('/api/auth/signup/verify', { code: '482913' })
    const resumed = SignupSchema.parse((await call('/api/auth/signup')).body)
    expect(resumed.step).toBe('about_you')
    expect(resumed.email).toBe(START.email)
  })

  it('blocks disposable, taken and weak sign-ups, and waitlists countries without a market pack', async () => {
    expect(fieldErrors((await post('/api/auth/signup', { ...START, email: 'x@mailinator.com' })).body).email).toEqual(['disposable_email'])
    const taken = await post('/api/auth/signup', { ...START, email: 'amaka.obi@amakabraids.com' })
    expect(taken.status).toBe(409)
    expect(fieldErrors(taken.body).email).toEqual(['email_taken'])
    expect(fieldErrors((await post('/api/auth/signup', { ...START, password: 'short' })).body).password).toEqual(['weak_password'])
    const waitlist = await post('/api/auth/signup', { ...START, country: 'CA' })
    expect(SignupSchema.parse(waitlist.body).step).toBe('waitlist')
  })

  it('rate-limits code resends and puts the code in the demo mailbox', async () => {
    await post('/api/auth/signup', START)
    expect((await post('/api/auth/signup/resend')).status).toBe(429)
    const outbox = z.array(OutboxMessageSchema).parse((await call(`/api/dev/outbox?to=${START.email}`)).body)
    expect(outbox[0]).toMatchObject({ kind: 'verify_code', code: '123456' })
  })

  it('flags a business website that already has an account', async () => {
    const { body } = await call('/api/auth/business-check?link=https://amakabraids.com')
    expect(body).toEqual({ match: 'Amaka Braids' })
  })
})

describe('login and recovery', () => {
  it('signs seeded people in to their own business and role', async () => {
    devSettings().set({ signedIn: false })
    const { status, body } = await post('/api/auth/login', { method: 'password', email: 'Funke.Adebayo@amakabraids.com', password: 'anything' })
    expect(status).toBe(200)
    const result = LoginResultSchema.parse(body)
    expect(result.session.user.name).toBe('Funke Adebayo')
    expect(result.session.membership.role).toBe('manager')
    expect(result.next).toBe('/app/home')
  })

  it('checks real passwords and locks after 5 failures', async () => {
    await signUpToWorkspace()
    devSettings().set({ signedIn: false })
    for (let i = 0; i < 4; i += 1) {
      const attempt = await post('/api/auth/login', { method: 'password', email: START.email, password: 'Wrong-pass1' })
      expect(fieldErrors(attempt.body).password).toEqual(['wrong_credentials'])
    }
    await post('/api/auth/login', { method: 'password', email: START.email, password: 'Wrong-pass1' })
    const locked = await post('/api/auth/login', { method: 'password', email: START.email, password: START.password })
    expect(locked.status).toBe(429)
    expect(fieldErrors(locked.body).email).toEqual(['locked'])
  })

  it('resets a password through the emailed link', async () => {
    expect((await post('/api/auth/forgot', { email: 'amaka.obi@amakabraids.com' })).status).toBe(204)
    expect((await post('/api/auth/forgot', { email: 'nobody@example.com' })).status).toBe(204)
    const [mail] = z.array(OutboxMessageSchema).parse((await call('/api/dev/outbox?to=amaka.obi@amakabraids.com')).body)
    const token = new URL(mail!.href!, BASE).searchParams.get('token')!
    expect((await call(`/api/auth/reset/${token}`)).status).toBe(200)
    expect((await post('/api/auth/reset', { token, password: 'Braids-2026' })).status).toBe(204)
    expect(devSettings().signedIn).toBe(false)
    expect((await post('/api/auth/reset', { token, password: 'Braids-2027' })).status).toBe(422)
    expect((await post('/api/auth/login', { method: 'password', email: 'amaka.obi@amakabraids.com', password: 'old-guess' })).status).toBe(422)
    expect((await post('/api/auth/login', { method: 'password', email: 'amaka.obi@amakabraids.com', password: 'Braids-2026' })).status).toBe(200)
  })
})

describe('invitations', () => {
  it('lets an invited person join with their role and notifies the team', async () => {
    devSettings().set({ signedIn: false })
    const preview = InvitationPreviewSchema.parse((await call('/api/invitations/join-amaka-braids')).body)
    expect(preview).toMatchObject({ status: 'pending', role: 'staff', businessName: 'Amaka Braids', inviterName: 'Amaka Obi', existingUser: false })
    const accepted = await post('/api/invitations/join-amaka-braids/accept', {
      method: 'password',
      name: 'Ngozi Eze',
      password: 'Lekki-2026',
      language: 'en',
      timezone: 'Africa/Lagos',
    })
    const result = LoginResultSchema.parse(accepted.body)
    expect(result.session.user.name).toBe('Ngozi Eze')
    expect(result.session.membership.role).toBe('staff')
    expect(result.session.locations).toHaveLength(1)
    const again = InvitationPreviewSchema.parse((await call('/api/invitations/join-amaka-braids')).body)
    expect(again.status).toBe('accepted')
  })

  it('shows expired and revoked invitations without letting them be used', async () => {
    expect(InvitationPreviewSchema.parse((await call('/api/invitations/expired-invite')).body).status).toBe('expired')
    expect(InvitationPreviewSchema.parse((await call('/api/invitations/revoked-invite')).body).status).toBe('revoked')
    expect((await post('/api/invitations/expired-invite/accept', { method: 'google', language: 'en', timezone: 'Africa/Lagos' })).status).toBe(409)
    expect((await call('/api/invitations/nope')).status).toBe(404)
  })
})

describe('onboarding', () => {
  beforeEach(() => devSettings().set({ scenario: 'E', role: 'owner', userId: null }))

  const step = (name: string, json: unknown) => call(`/api/onboarding/steps/${name}`, { method: 'PUT', json })

  async function profileFromImport() {
    const imported = ImportResultSchema.parse((await post('/api/onboarding/import', { url: 'https://ifecakes.ng' })).body)
    expect(imported.suggestedIndustry).toBe('bakery')
    const current = view((await call('/api/onboarding')).body).state.profile
    const found = imported.found
    const profile = {
      ...current,
      name: found.name ?? current.name,
      description: found.description ?? '',
      descriptionSource: 'import',
      address: found.address ?? '',
      phone: found.phone ?? '',
      hours: found.hours ?? current.hours,
      tone: found.tone ?? current.tone,
      industry: imported.suggestedIndustry,
    }
    return { imported, result: view((await step('profile', { data: profile, complete: true })).body) }
  }

  it('reaches go-live in Suggest mode, with every gate blocking until it is satisfied', async () => {
    const { imported, result: afterProfile } = await profileFromImport()
    expect(afterProfile.state.currentStep).toBe('goals')
    expect(afterProfile.state.knowledge.packId).toBe('bakery')
    expect(afterProfile.state.knowledge.services.every((s) => s.price === null && !s.verified)).toBe(true)

    await step('goals', { data: { goals: ['reply_faster', 'more_bookings'] }, complete: true })

    const services = imported.found.services.map((s, i) => ({ ...s, id: `svc_${i}`, source: 'import', verified: true }))
    const faqs = afterProfile.state.knowledge.faqs.map((f) => ({ ...f, verified: true }))
    const knowledge = view(
      (await step('knowledge', { data: { services, faqs, answers: { cancellation: 'Cancel 48 hours before.', location: 'Opposite Yaba market' } }, complete: true })).body,
    )
    expect(knowledge.gates.find((g) => g.id === 'knowledge')?.status).toBe('done')
    expect(knowledge.state.milestoneAt.profile_complete).toBeDefined()
    expect(knowledge.state.milestoneAt.ai_taught).toBeDefined()

    await post('/api/onboarding/channels/webchat', { value: 'booking_page' })
    const whatsapp = view((await post('/api/onboarding/channels/whatsapp', { businessPortfolio: 'Ife Cakes', number: '+234 803 412 7781', displayName: 'Ife Cakes' })).body)
    expect(whatsapp.state.channels.whatsapp?.templates.every((t) => t.status === 'pending')).toBe(true)
    expect(whatsapp.newMilestones).toEqual([])
    expect(whatsapp.state.milestoneAt.first_channel_live).toBeDefined()

    await step('employee', { data: { mode: 'ai', name: 'Ada', tone: 'playful' }, complete: true })

    const blocked = await post('/api/onboarding/go-live')
    expect(blocked.status).toBe(422)
    expect(fieldErrors(blocked.body).gates).toEqual(['templates', 'compliance', 'sandbox', 'handoff'])

    devSettings().set({ clockOffsetMs: 60_000 })
    const approved = view((await call('/api/onboarding')).body)
    expect(approved.gates.find((g) => g.id === 'templates')?.status).toBe('done')

    await step('compliance', {
      data: {
        legalName: 'Ife Cakes Enterprises',
        disclosureText: approved.wording.disclosure,
        consentText: approved.wording.consent,
        consentConfirmed: true,
        privacyPolicy: { kind: 'generated', url: '/privacy/ife-cakes' },
        acceptTerms: true,
        acceptDpa: true,
      },
      complete: true,
    })

    const run = view((await post('/api/onboarding/sandbox/run', { scripts: SandboxScriptSchema.options })).body)
    expect(run.state.launch.sandbox).toHaveLength(10)
    const price = run.state.launch.sandbox.find((r) => r.script === 'price')!
    expect(price.reply).toContain('₦35,000')
    expect(run.state.launch.sandbox.find((r) => r.script === 'off_topic')?.replyKind).toBe('refusal')
    expect(run.state.launch.sandbox.find((r) => r.script === 'angry')?.replyKind).toBe('handoff')
    expect(run.gates.find((g) => g.id === 'sandbox')?.status).toBe('blocking')
    await post('/api/onboarding/sandbox/verdicts')

    const owner = run.team[0]!
    await post('/api/onboarding/handoff', { userId: owner.id, channel: 'email' })
    const ready = view((await post('/api/onboarding/handoff/confirm')).body)
    expect(ready.gates.filter((g) => g.status === 'blocking')).toEqual([])

    const live = view((await post('/api/onboarding/go-live')).body)
    expect(live.state.liveAt).not.toBeNull()
    expect(live.newMilestones).toContain('ai_live')
    const session = await call('/api/session')
    expect((session.body as { account: { aiMode: string } }).account.aiMode).toBe('suggest_only')
  })

  it('reaches go-live on the Manual only path without any AI step', async () => {
    await profileFromImport()
    await step('goals', { data: { goals: ['more_bookings'] }, complete: true })
    const skipped = view((await step('knowledge', { data: { manual: true }, skip: true })).body)
    expect(skipped.state.employee.mode).toBe('manual')
    expect(skipped.state.currentStep).toBe('channels')

    await post('/api/onboarding/channels/email/domain', { domain: 'ifecakes.ng', address: 'hello' })
    const first = view((await post('/api/onboarding/channels/email/verify')).body)
    expect(first.state.channels.email?.records.filter((r) => r.status === 'verified')).toHaveLength(2)
    expect(first.gates.find((g) => g.id === 'channel')?.status).toBe('blocking')
    const second = view((await post('/api/onboarding/channels/email/verify')).body)
    expect(second.gates.find((g) => g.id === 'channel')?.status).toBe('done')

    const gates = view(
      (await step('compliance', {
        data: { legalName: 'Ife Cakes', consentText: second.wording.consent, consentConfirmed: true, privacyPolicy: { kind: 'link', url: 'https://ifecakes.ng/privacy' }, acceptTerms: true, acceptDpa: true },
        complete: true,
      })).body,
    ).gates
    expect(Object.fromEntries(gates.map((g) => [g.id, g.status]))).toEqual({
      channel: 'done',
      templates: 'not_needed',
      knowledge: 'not_needed',
      compliance: 'done',
      sandbox: 'not_needed',
      handoff: 'not_needed',
    })
    const live = await post('/api/onboarding/go-live')
    expect(live.status).toBe(200)
    expect(view(live.body).state.milestoneAt.ai_live).toBeUndefined()
  })

  it('installs the industry pack once, however often the profile is saved', async () => {
    const { result } = await profileFromImport()
    const again = view((await step('profile', { data: result.state.profile, complete: true })).body)
    expect(again.state.knowledge.services).toHaveLength(result.state.knowledge.services.length)
  })

  it('keeps setup to people who can manage connections', async () => {
    devSettings().set({ role: 'manager' })
    const denied = await post('/api/onboarding/channels/webchat', { value: 'website' })
    expect(denied.status).toBe(403)
  })
})
