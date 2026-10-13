import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { DEFAULT_TENANT_BRAND_COLOR, getMarketPack, marketForCountry } from '@deskhand/config'
import {
  AboutBusinessSchema,
  AboutYouSchema,
  AcceptInvitationSchema,
  can,
  EmailOnlySchema,
  InvitationPreviewSchema,
  LoginResultSchema,
  LoginSchema,
  OutboxMessageSchema,
  ResetPasswordSchema,
  ResetTokenSchema,
  SignupCompleteSchema,
  SignupPlanSchema,
  SignupSchema,
  SignupStartSchema,
  SlugCheckSchema,
  SlugSchema,
  VerifyCodeSchema,
  type Account,
  type AuthFieldError,
  type Invitation,
  type Location,
  type Membership,
  type OutboxMessage,
  type Signup,
  type User,
} from '@deskhand/schemas'
import { getAuthDb, hashPassword, randomToken, type SignupRecord } from '../auth-db'
import { DAY, HOUR, MINUTE, now } from '../clock'
import { TABLES, SEED_VERSION, type MockDb } from '../db'
import { devSettings } from '../dev-settings'
import { json, MockHttpError, parseBody, parseData, route } from '../http'
import { createOnboardingState } from '../onboarding/state'
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from '../scenarios'
import { ensureSeeded } from '../store'
import { notifyChange } from '../sync'
import { loadSession } from './tenant'

const API = '/api/auth'
const CODE_TTL = 10 * MINUTE
const RESEND_AFTER = 60_000
const MAX_ATTEMPTS = 5
const LOCKOUT = 15 * MINUTE
/** Fresh sign-ups land in scenario E, the "just signed up" slot. Resetting E restores the seeded business. */
export const SIGNUP_SCENARIO: ScenarioId = 'E'
/** Mock rule: any six-digit code works except this one, which simulates a typo. */
const WRONG_CODE = '000000'
const DEMO_CODE = '123456'
const DISPOSABLE = ['mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'yopmail.com', 'trashmail.com']

function fieldError(field: string, code: AuthFieldError, status: 'validation_failed' | 'conflict' | 'rate_limited' = 'validation_failed'): never {
  throw new MockHttpError(status, code, { fieldErrors: { [field]: [code] } })
}

/** Same rule as the strength meter: 8+ characters and at least two of lower, upper, digit, symbol. */
export function passwordStrong(password: string | undefined) {
  if (!password || password.length < 8) return false
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length
  return classes >= 2
}

const iso = (offset = 0) => new Date(now().getTime() + offset).toISOString()

async function availableDbs(): Promise<{ id: ScenarioId; db: MockDb }[]> {
  const ids = SCENARIO_IDS.filter((id) => SCENARIOS[id].available)
  return Promise.all(ids.map(async (id) => ({ id, db: await ensureSeeded(id) })))
}

type Identity = { scenario: ScenarioId; user: User; passwordHash: string | null }

/** Finds a person by email: password records first, then seeded people (who accept any password). */
async function findIdentity(email: string): Promise<Identity | null> {
  const lower = email.toLowerCase()
  const credential = await getAuthDb().credentials.get(lower)
  if (credential) {
    const database = await ensureSeeded(credential.scenario)
    const user = await database.users.get(credential.userId)
    if (user) return { scenario: credential.scenario, user, passwordHash: credential.passwordHash }
  }
  for (const { id, db } of await availableDbs()) {
    const user = await db.users.where('email').equalsIgnoreCase(lower).first()
    if (user) return { scenario: id, user, passwordHash: null }
  }
  return null
}

async function sendMail(message: Omit<OutboxMessage, 'id' | 'createdAt'>) {
  await getAuthDb().outbox.put({ ...message, id: randomToken(12), createdAt: iso() })
  notifyChange(['outbox'])
}

async function pendingSignup(): Promise<SignupRecord | null> {
  const auth = getAuthDb()
  const pointer = await auth.meta.get('pendingSignup')
  if (!pointer?.value) return null
  return (await auth.signups.get(pointer.value)) ?? null
}

async function requireSignup(): Promise<SignupRecord> {
  const signup = await pendingSignup()
  if (!signup) throw new MockHttpError('not_found', 'No sign-up in progress.')
  return signup
}

function publicSignup(record: SignupRecord): Signup {
  return SignupSchema.parse(record)
}

async function saveSignup(record: SignupRecord) {
  await getAuthDb().signups.put(record)
  notifyChange(['signup'])
  return json(SignupSchema, publicSignup(record))
}

async function slugTaken(slug: string) {
  for (const { db } of await availableDbs()) {
    if (await db.accounts.where('slug').equals(slug).first()) return true
  }
  return false
}

function slugify(name: string) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'my-business'
  )
}

async function uniqueSlug(base: string) {
  let candidate = slugify(base)
  for (let n = 2; await slugTaken(candidate); n += 1) candidate = `${slugify(base).slice(0, 36)}-${n}`
  return candidate
}

/** Where a person lands after signing in: unfinished setup goes back to the wizard for people who can do it. */
async function nextPath(database: MockDb, membership: Membership) {
  const state = await database.onboarding.toCollection().first()
  if (state && !state.liveAt && can(membership.role, 'connections.manage')) return `/onboarding/${state.currentStep}`
  return '/app/home'
}

async function signInAs(scenario: ScenarioId, userId: string) {
  const database = await ensureSeeded(scenario)
  const membership = await database.memberships.where('userId').equals(userId).first()
  if (!membership) throw new MockHttpError('forbidden', 'You are not a member of this business yet.')
  devSettings().set({ scenario, role: membership.role, userId, signedIn: true })
  notifyChange(['*'])
  return json(LoginResultSchema, { session: await loadSession(), next: await nextPath(database, membership) })
}

async function checkPassword(identity: Identity, password: string | undefined) {
  if (!password) return false
  if (identity.passwordHash === null) return true
  return identity.passwordHash === (await hashPassword(password))
}

async function registerFailure(email: string) {
  const attempts = getAuthDb().attempts
  const record = (await attempts.get(email)) ?? { email, failures: 0, lockedUntil: null }
  record.failures += 1
  if (record.failures >= MAX_ATTEMPTS) {
    record.lockedUntil = iso(LOCKOUT)
    record.failures = 0
  }
  await attempts.put(record)
}

async function createWorkspace(signup: SignupRecord, slug: string) {
  const business = signup.business!
  const aboutYou = signup.aboutYou!
  const market = signup.market!
  const pack = getMarketPack(market)
  const database = await ensureSeeded(SIGNUP_SCENARIO)
  const created = iso()
  const userId = `usr_${randomToken(10)}`
  const accountId = `acc_${slug}`
  const user: User = { id: userId, name: aboutYou.name, email: signup.email.toLowerCase(), phone: null, locale: 'en', createdAt: created }
  const account: Account = {
    id: accountId,
    name: business.businessName,
    slug,
    industry: business.industry,
    market,
    region: pack.defaultRegion,
    state: 'trial',
    plan: signup.plan ?? 'starter',
    aiMode: 'manual',
    trialEndsAt: iso(14 * DAY),
    graceEndsAt: null,
    suspensionReason: null,
    milestones: [],
    brandColor: DEFAULT_TENANT_BRAND_COLOR,
    showPoweredBy: true,
    createdAt: created,
    createdBy: { kind: 'person', id: userId, name: aboutYou.name },
  }
  const location: Location = {
    id: `loc_${slug}_1`,
    accountId,
    name: business.city,
    city: business.city,
    address: '',
    timezone: business.timezone,
    currency: business.currency,
    locale: pack.locale,
    market,
    phone: '',
    createdAt: created,
    createdBy: { kind: 'person', id: userId },
  }
  const membership: Membership = { id: `mem_${userId}`, accountId, userId, role: 'owner', locationIds: [], title: 'Owner' }
  const onboarding = createOnboardingState({ account, location, owner: user, link: business.link, iso: created })

  await database.transaction('rw', [database.meta, ...TABLES.map((name) => database.table(name))], async () => {
    for (const name of TABLES) await database.table(name).clear()
    await database.accounts.put(account)
    await database.locations.put(location)
    await database.users.put(user)
    await database.memberships.put(membership)
    await database.onboarding.put(onboarding)
    await database.meta.bulkPut([
      { key: 'seededAt', value: created },
      { key: 'seedVersion', value: SEED_VERSION },
      { key: 'createdBySignup', value: true },
    ])
  })
  if (signup.passwordHash) {
    await getAuthDb().credentials.put({ email: user.email, passwordHash: signup.passwordHash, scenario: SIGNUP_SCENARIO, userId })
  }
  return userId
}

async function findInvitation(token: string): Promise<{ scenario: ScenarioId; db: MockDb; invitation: Invitation } | null> {
  for (const { id, db } of await availableDbs()) {
    const invitation = await db.invitations.where('token').equals(token).first()
    if (invitation) return { scenario: id, db, invitation }
  }
  return null
}

function invitationStatus(invitation: Invitation) {
  if (invitation.status === 'pending' && new Date(invitation.expiresAt).getTime() < now().getTime()) return 'expired' as const
  return invitation.status
}

export const authHandlers = [
  http.get(
    `${API}/signup`,
    route(async () => json(SignupSchema, publicSignup(await requireSignup()))),
  ),

  http.delete(
    `${API}/signup`,
    route(async () => {
      await getAuthDb().meta.put({ key: 'pendingSignup', value: null })
      notifyChange(['signup'])
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/signup`,
    route(async ({ request }) => {
      const body = await parseBody(request, SignupStartSchema)
      const email = body.email.trim().toLowerCase()
      if (DISPOSABLE.includes(email.split('@')[1] ?? '')) fieldError('email', 'disposable_email')
      if (await findIdentity(email)) fieldError('email', 'email_taken', 'conflict')
      if (body.method === 'email' && !passwordStrong(body.password)) fieldError('password', 'weak_password')
      const market = marketForCountry(body.country)
      const google = body.method === 'google'
      const record: SignupRecord = {
        id: `sgn_${randomToken(10)}`,
        step: !market ? 'waitlist' : google ? 'about_you' : 'verify',
        method: body.method,
        email,
        country: body.country.toUpperCase(),
        market,
        codeSentAt: google || !market ? null : iso(),
        resendAvailableAt: google || !market ? null : iso(RESEND_AFTER),
        codeExpiresAt: google || !market ? null : iso(CODE_TTL),
        attemptsLeft: MAX_ATTEMPTS,
        aboutYou: null,
        business: null,
        plan: null,
        suggestedSlug: null,
        createdAt: iso(),
        passwordHash: body.password ? await hashPassword(body.password) : null,
        name: body.name ?? null,
        marketingOptIn: body.marketingOptIn,
        termsAcceptedAt: iso(),
        code: google ? null : DEMO_CODE,
        attribution: Object.fromEntries(Object.entries(body.attribution ?? {}).filter(([, v]) => v)) as Record<string, string>,
      }
      await getAuthDb().meta.put({ key: 'pendingSignup', value: record.id })
      if (record.step === 'verify') await sendMail({ to: email, kind: 'verify_code', code: DEMO_CODE, href: null })
      return saveSignup(record)
    }),
  ),

  http.post(
    `${API}/signup/verify`,
    route(async ({ request }) => {
      const signup = await requireSignup()
      const { code } = await parseBody(request, VerifyCodeSchema)
      if (signup.step !== 'verify') return json(SignupSchema, publicSignup(signup))
      if (signup.attemptsLeft <= 0) fieldError('code', 'too_many_attempts')
      if (!signup.codeExpiresAt || new Date(signup.codeExpiresAt).getTime() < now().getTime()) fieldError('code', 'code_expired')
      if (code === WRONG_CODE) {
        signup.attemptsLeft -= 1
        await getAuthDb().signups.put(signup)
        fieldError('code', signup.attemptsLeft <= 0 ? 'too_many_attempts' : 'wrong_code')
      }
      return saveSignup({ ...signup, step: 'about_you', code: null })
    }),
  ),

  http.post(
    `${API}/signup/resend`,
    route(async () => {
      const signup = await requireSignup()
      if (signup.resendAvailableAt && new Date(signup.resendAvailableAt).getTime() > now().getTime()) {
        throw new MockHttpError('rate_limited', 'Please wait before asking for another code.')
      }
      await sendMail({ to: signup.email, kind: 'verify_code', code: DEMO_CODE, href: null })
      return saveSignup({
        ...signup,
        code: DEMO_CODE,
        codeSentAt: iso(),
        resendAvailableAt: iso(RESEND_AFTER),
        codeExpiresAt: iso(CODE_TTL),
        attemptsLeft: MAX_ATTEMPTS,
      })
    }),
  ),

  http.patch(
    `${API}/signup`,
    route(async ({ request }) => {
      const signup = await requireSignup()
      if (signup.step === 'verify' || signup.step === 'waitlist') throw new MockHttpError('conflict', 'Verify your email first.')
      const raw = await parseBody(
        request,
        z.object({ aboutYou: z.unknown().optional(), business: z.unknown().optional(), plan: z.unknown().optional() }),
      )
      if (raw.aboutYou !== undefined) {
        const aboutYou = parseData(raw.aboutYou, AboutYouSchema)
        return saveSignup({ ...signup, aboutYou, step: signup.step === 'about_you' ? 'business' : signup.step })
      }
      if (raw.business !== undefined) {
        const business = parseData(raw.business, AboutBusinessSchema)
        const suggestedSlug = await uniqueSlug(business.businessName)
        return saveSignup({ ...signup, business, suggestedSlug, step: signup.step === 'business' ? 'plan' : signup.step })
      }
      const { plan } = parseData({ plan: raw.plan }, SignupPlanSchema)
      return saveSignup({ ...signup, plan, step: 'done' })
    }),
  ),

  http.get(
    `${API}/slug-check`,
    route(async ({ request }) => {
      const slug = new URL(request.url).searchParams.get('slug') ?? ''
      const valid = SlugSchema.safeParse(slug).success
      const taken = valid && (await slugTaken(slug))
      return json(SlugCheckSchema, { slug, available: valid && !taken, suggestion: taken ? await uniqueSlug(slug) : null })
    }),
  ),

  /** Duplicate detection on the business website (FR-REG.2). */
  http.get(
    `${API}/business-check`,
    route(async ({ request }) => {
      const link = (new URL(request.url).searchParams.get('link') ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (link.length < 4) return json(z.object({ match: z.string().nullable() }), { match: null })
      for (const { db } of await availableDbs()) {
        const account = await db.accounts.toCollection().first()
        if (account && link.includes(account.slug.replace(/-/g, ''))) {
          return json(z.object({ match: z.string().nullable() }), { match: account.name })
        }
      }
      return json(z.object({ match: z.string().nullable() }), { match: null })
    }),
  ),

  http.post(
    `${API}/signup/complete`,
    route(async ({ request }) => {
      const signup = await requireSignup()
      if (signup.step !== 'done' || !signup.business || !signup.aboutYou || !signup.market) {
        throw new MockHttpError('conflict', 'Finish the earlier steps first.')
      }
      const { slug } = await parseBody(request, SignupCompleteSchema)
      if (await slugTaken(slug)) fieldError('slug', 'slug_taken', 'conflict')
      const userId = await createWorkspace(signup, slug)
      await getAuthDb().meta.put({ key: 'pendingSignup', value: null })
      await getAuthDb().signups.delete(signup.id)
      return signInAs(SIGNUP_SCENARIO, userId)
    }),
  ),

  http.post(
    `${API}/login`,
    route(async ({ request }) => {
      const body = await parseBody(request, LoginSchema)
      const email = body.email.trim().toLowerCase()
      const attempt = await getAuthDb().attempts.get(email)
      if (attempt?.lockedUntil && new Date(attempt.lockedUntil).getTime() > now().getTime()) {
        fieldError('email', 'locked', 'rate_limited')
      }
      const identity = await findIdentity(email)
      if (!identity) fieldError('email', 'no_account')
      if (body.method === 'password' && !(await checkPassword(identity, body.password))) {
        await registerFailure(email)
        fieldError('password', 'wrong_credentials')
      }
      await getAuthDb().attempts.delete(email)
      return signInAs(identity.scenario, identity.user.id)
    }),
  ),

  http.post(
    `${API}/magic-link`,
    route(async ({ request }) => {
      const { email } = await parseBody(request, EmailOnlySchema)
      const identity = await findIdentity(email)
      if (identity) {
        const token = `ml_${randomToken()}`
        await getAuthDb().resets.put({ token, email: identity.user.email, expiresAt: iso(15 * MINUTE), used: false })
        await sendMail({ to: email.toLowerCase(), kind: 'magic_link', code: null, href: `/login?magic=${token}` })
      }
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/magic-link/consume`,
    route(async ({ request }) => {
      const { token } = await parseBody(request, z.object({ token: z.string() }))
      const record = await getAuthDb().resets.get(token)
      if (!record || record.used || new Date(record.expiresAt).getTime() < now().getTime()) fieldError('token', 'link_expired')
      await getAuthDb().resets.put({ ...record, used: true })
      const identity = await findIdentity(record.email)
      if (!identity) fieldError('token', 'link_expired')
      return signInAs(identity.scenario, identity.user.id)
    }),
  ),

  http.post(
    `${API}/forgot`,
    route(async ({ request }) => {
      const { email } = await parseBody(request, EmailOnlySchema)
      const identity = await findIdentity(email)
      if (identity) {
        const token = `rs_${randomToken()}`
        await getAuthDb().resets.put({ token, email: identity.user.email, expiresAt: iso(HOUR), used: false })
        await sendMail({ to: email.toLowerCase(), kind: 'reset_link', code: null, href: `/forgot?token=${token}` })
      }
      // Same answer whether or not the address exists, so the form can't be used to discover accounts.
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/reset/:token`,
    route(async ({ params }) => {
      const record = await getAuthDb().resets.get(String(params.token))
      if (!record || !record.token.startsWith('rs_')) throw new MockHttpError('not_found', 'This link is not valid.')
      if (record.used || new Date(record.expiresAt).getTime() < now().getTime()) fieldError('token', 'link_expired')
      return json(ResetTokenSchema, { email: record.email, expiresAt: record.expiresAt })
    }),
  ),

  http.post(
    `${API}/reset`,
    route(async ({ request }) => {
      const { token, password } = await parseBody(request, ResetPasswordSchema)
      const record = await getAuthDb().resets.get(token)
      if (!record || record.used || new Date(record.expiresAt).getTime() < now().getTime()) fieldError('token', 'link_expired')
      if (!passwordStrong(password)) fieldError('password', 'weak_password')
      const identity = await findIdentity(record.email)
      if (!identity) fieldError('token', 'link_expired')
      await getAuthDb().credentials.put({
        email: identity.user.email.toLowerCase(),
        passwordHash: await hashPassword(password),
        scenario: identity.scenario,
        userId: identity.user.id,
      })
      await getAuthDb().resets.put({ ...record, used: true })
      await getAuthDb().attempts.delete(record.email)
      // Resetting a password signs out every other session (PRD 27.3).
      devSettings().set({ signedIn: false })
      notifyChange(['session'])
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    '/api/invitations/:token',
    route(async ({ params }) => {
      const found = await findInvitation(String(params.token))
      if (!found) throw new MockHttpError('not_found', 'This invitation does not exist.')
      const { db, invitation } = found
      const account = (await db.accounts.get(invitation.accountId))!
      const inviter = await db.users.get(invitation.invitedBy)
      const locations = await db.locations.bulkGet(invitation.locationIds)
      const firstLocation = await db.locations.where('accountId').equals(account.id).first()
      const existing = await findIdentity(invitation.email)
      return json(InvitationPreviewSchema, {
        token: invitation.token,
        status: invitationStatus(invitation),
        email: invitation.email,
        role: invitation.role,
        businessName: account.name,
        inviterName: inviter?.name ?? account.name,
        note: invitation.note,
        locationNames: locations.filter(Boolean).map((l) => l!.name),
        expiresAt: invitation.expiresAt,
        existingUser: Boolean(existing),
        timezone: firstLocation?.timezone ?? getMarketPack(account.market).defaultTimezone,
      })
    }),
  ),

  http.post(
    '/api/invitations/:token/accept',
    route(async ({ params, request }) => {
      const found = await findInvitation(String(params.token))
      if (!found) throw new MockHttpError('not_found', 'This invitation does not exist.')
      const { scenario, db, invitation } = found
      if (invitationStatus(invitation) !== 'pending') throw new MockHttpError('conflict', 'This invitation can no longer be used.')
      const body = await parseBody(request, AcceptInvitationSchema)
      const email = invitation.email.toLowerCase()
      const existing = await findIdentity(email)
      let user: User
      if (body.method === 'existing') {
        if (!existing) fieldError('password', 'no_account')
        if (!(await checkPassword(existing, body.password))) fieldError('password', 'wrong_credentials')
        user = existing.user
      } else {
        if (body.method === 'password') {
          if (!body.name || body.name.trim().length < 2) fieldError('name', 'required')
          if (!passwordStrong(body.password)) fieldError('password', 'weak_password')
        }
        const name = body.name?.trim() || email.split('@')[0]!.replace(/[._]/g, ' ')
        user = { id: `usr_${randomToken(10)}`, name, email, phone: null, locale: body.language, createdAt: iso() }
      }
      const joined = iso()
      await db.transaction('rw', [db.users, db.memberships, db.invitations, db.notifications], async () => {
        if (!(await db.users.get(user.id))) await db.users.put(user)
        await db.memberships.put({
          id: `mem_${user.id}`,
          accountId: invitation.accountId,
          userId: user.id,
          role: invitation.role,
          locationIds: invitation.locationIds,
          title: '',
        })
        await db.invitations.put({ ...invitation, status: 'accepted' })
        await db.notifications.put({
          id: `ntf_join_${user.id}`,
          accountId: invitation.accountId,
          kind: 'member_joined',
          params: { name: user.name, role: invitation.role },
          href: '/app/settings/team',
          read: false,
          createdAt: joined,
        })
      })
      if (body.method === 'password' && body.password) {
        await getAuthDb().credentials.put({ email, passwordHash: await hashPassword(body.password), scenario, userId: user.id })
      }
      return signInAs(scenario, user.id)
    }),
  ),

  /** Mock-only: the demo mailbox, so a demo can open codes and links that would arrive by email. */
  http.get(
    '/api/dev/outbox',
    route(async ({ request }) => {
      const to = (new URL(request.url).searchParams.get('to') ?? '').toLowerCase()
      const messages = await getAuthDb().outbox.where('to').equals(to).reverse().sortBy('createdAt')
      return json(z.array(OutboxMessageSchema), messages.slice(0, 5))
    }),
  ),
]
