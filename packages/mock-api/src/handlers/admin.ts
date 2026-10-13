import { Faker, base, en } from '@faker-js/faker'
import { http, HttpResponse } from 'msw'
import {
  ADMIN_PERSONAS,
  AdminOverviewSchema,
  AdminSessionSchema,
  DataRegionSchema,
  MarketCodeSchema,
  pageOf,
  RevealRequestSchema,
  RevealResponseSchema,
  TenantSummarySchema,
  type AccountState,
  type AdminSession,
  type Impersonation,
  type MarketCode,
  type TenantSummary,
} from '@deskhand/schemas'
import { getMarketPack } from '@deskhand/config'
import { DAY, HOUR, MINUTE, now } from '../clock'
import { devSettings } from '../dev-settings'
import { json, MockHttpError, parseBody, route } from '../http'
import { SCENARIOS } from '../scenarios'
import { notifyChange } from '../sync'

const ADMIN_NAMES: Record<(typeof ADMIN_PERSONAS)[number], string> = {
  support: 'Bola Akin',
  success: 'Grace Mwangi',
  compliance: 'Oluwaseun Dada',
  finance: 'Thandi Nkosi',
  ai_quality: 'Ravi Patel',
  pack_author: 'Amara Diallo',
  market_manager: 'Kofi Asante',
  sre: 'Lena Fischer',
  trust_safety: 'Musa Bello',
  leadership: 'Dex Okafor',
}

const REVEAL_MS = 15 * MINUTE
const SUPPORT_SESSION_MS = HOUR

/** In-memory server state for this page load: the reveal window and when the support session started. */
let revealedUntil = 0
let impersonationStartedAt: number | null = null

function impersonation(): Impersonation | null {
  if (!devSettings().impersonating) {
    impersonationStartedAt = null
    return null
  }
  impersonationStartedAt ??= now().getTime()
  const scenario = SCENARIOS[devSettings().scenario]
  return {
    tenantId: `acc_${scenario.slug}`,
    tenantName: scenario.business,
    startedAt: new Date(impersonationStartedAt).toISOString(),
    endsAt: new Date(impersonationStartedAt + SUPPORT_SESSION_MS).toISOString(),
    readOnly: true,
  }
}

function piiRevealed() {
  return revealedUntil > now().getTime()
}

function adminSession(): AdminSession {
  if (!devSettings().adminSignedIn) throw new MockHttpError('unauthenticated', 'Please sign in with SSO.')
  const persona = devSettings().adminPersona
  const name = ADMIN_NAMES[persona]
  return {
    id: `adm_${persona}`,
    name,
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@deskhand.internal`,
    persona,
    piiRevealedUntil: piiRevealed() ? new Date(revealedUntil).toISOString() : null,
    impersonation: impersonation(),
  }
}

const maskWord = (word: string) => (word.length <= 1 ? word : `${word[0]}${'•'.repeat(Math.min(word.length - 1, 4))}`)

/** PII is masked server-side so it never reaches the browser without a logged reveal. */
function maskTenant(tenant: TenantSummary): TenantSummary {
  if (piiRevealed()) return tenant
  const [local = '', domain = ''] = tenant.ownerEmail.split('@')
  const tld = domain.slice(domain.lastIndexOf('.'))
  return {
    ...tenant,
    ownerName: tenant.ownerName.split(' ').map(maskWord).join(' '),
    ownerEmail: `${maskWord(local)}@•••${tld}`,
  }
}

let tenants: TenantSummary[] | null = null

/** 400 tenants across markets (FE-DOC 8.2, admin dataset). Generated once per page load. */
function adminTenants(): TenantSummary[] {
  if (tenants) return tenants
  const faker = new Faker({ locale: [en, base] })
  faker.seed(400)
  const markets: MarketCode[] = ['NG', 'NG', 'NG', 'GH', 'KE', 'ZA', 'UK', 'UK', 'US']
  const states: AccountState[] = ['active', 'active', 'active', 'active', 'trial', 'trial', 'past_due', 'trial_expired', 'cancelled', 'suspended']
  const industries = ['salon', 'clinic', 'barber', 'real_estate', 'restaurant', 'gym', 'school']
  const base0 = Date.UTC(2026, 9, 11)
  const scenarioTenants: TenantSummary[] = Object.values(SCENARIOS)
    .filter((s) => s.available)
    .map((s) => ({
      id: `acc_${s.slug}`,
      name: s.business,
      ownerName: s.team.owner,
      ownerEmail: `${s.team.owner.toLowerCase().replace(/[^a-z]+/g, '.')}@${s.slug.replace(/-/g, '')}.com`,
      market: s.market,
      region: getMarketPack(s.market).defaultRegion,
      industry: s.industry,
      state: s.state,
      plan: s.plan,
      healthScore: s.troubles ? 31 : s.volume === 'empty' ? 48 : 82,
      createdAt: new Date(base0 - 120 * DAY).toISOString(),
    }))
  const generated = Array.from({ length: 400 - scenarioTenants.length }, (_, index): TenantSummary => {
    const market = faker.helpers.arrayElement(markets)
    const ownerName = faker.person.fullName()
    const industry = faker.helpers.arrayElement(industries)
    const name = `${faker.person.lastName()} ${faker.helpers.arrayElement({ salon: ['Braids', 'Beauty', 'Hair Studio'], clinic: ['Dental', 'Clinic', 'Physio'], barber: ['Barbers', 'Cuts'], real_estate: ['Realty', 'Homes'], restaurant: ['Kitchen', 'Grill'], gym: ['Fitness', 'Gym'], school: ['Academy', 'Tutors'] }[industry]!)}`
    return {
      id: `acc_gen_${index + 1}`,
      name,
      ownerName,
      ownerEmail: faker.internet.email({ firstName: ownerName.split(' ')[0] }).toLowerCase(),
      market,
      region: getMarketPack(market).defaultRegion,
      industry,
      state: faker.helpers.arrayElement(states),
      plan: faker.helpers.arrayElement(['starter', 'starter', 'growth', 'pro'] as const),
      healthScore: faker.number.int({ min: 12, max: 98 }),
      createdAt: new Date(base0 - faker.number.int({ min: 1, max: 300 }) * DAY).toISOString(),
    }
  })
  tenants = [...scenarioTenants, ...generated]
  return tenants
}

const auditLog: { at: string; actor: string; action: string; reason: string }[] = []

export const adminHandlers = [
  http.get('/api/admin/session', route(() => json(AdminSessionSchema, adminSession()))),

  http.post(
    '/api/admin/auth/sign-in',
    route(() => {
      devSettings().set({ adminSignedIn: true })
      return json(AdminSessionSchema, adminSession())
    }),
  ),

  http.post(
    '/api/admin/auth/sign-out',
    route(() => {
      devSettings().set({ adminSignedIn: false, impersonating: false })
      revealedUntil = 0
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    '/api/admin/overview',
    route(({ request }) => {
      adminSession()
      const region = DataRegionSchema.safeParse(new URL(request.url).searchParams.get('region'))
      const all = adminTenants().filter((t) => !region.success || t.region === region.data)
      const byState: Partial<Record<AccountState, number>> = {}
      const byMarket: Partial<Record<MarketCode, number>> = {}
      for (const t of all) {
        byState[t.state] = (byState[t.state] ?? 0) + 1
        byMarket[t.market] = (byMarket[t.market] ?? 0) + 1
      }
      const recent = [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map(maskTenant)
      return json(AdminOverviewSchema, { total: all.length, byState, byMarket, recent })
    }),
  ),

  http.get(
    '/api/admin/tenants',
    route(({ request }) => {
      adminSession()
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const market = MarketCodeSchema.safeParse(url.searchParams.get('market'))
      const region = DataRegionSchema.safeParse(url.searchParams.get('region'))
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 25), 100)
      const cursor = Number(url.searchParams.get('cursor') ?? 0)
      const filtered = adminTenants().filter(
        (t) =>
          (!q || `${t.name} ${t.ownerName} ${t.ownerEmail} ${t.id}`.toLowerCase().includes(q)) &&
          (!market.success || t.market === market.data) &&
          (!region.success || t.region === region.data),
      )
      const items = filtered.slice(cursor, cursor + limit).map(maskTenant)
      const next = cursor + limit < filtered.length ? String(cursor + limit) : null
      return json(pageOf(TenantSummarySchema), { items, nextCursor: next, total: filtered.length })
    }),
  ),

  http.post(
    '/api/admin/reveal',
    route(async ({ request }) => {
      const session = adminSession()
      const body = await parseBody(request, RevealRequestSchema)
      revealedUntil = now().getTime() + REVEAL_MS
      auditLog.unshift({ at: now().toISOString(), actor: session.id, action: `reveal:${body.field}`, reason: body.reason })
      notifyChange(['admin-session', 'admin-tenants'])
      return json(RevealResponseSchema, { revealedUntil: new Date(revealedUntil).toISOString() })
    }),
  ),

  http.post(
    '/api/admin/reveal/end',
    route(() => {
      adminSession()
      revealedUntil = 0
      notifyChange(['admin-session', 'admin-tenants'])
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    '/api/admin/impersonation/end',
    route(() => {
      adminSession()
      devSettings().set({ impersonating: false })
      notifyChange(['admin-session'])
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
