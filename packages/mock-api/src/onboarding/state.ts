import { EMPLOYEE_NAMES, getIndustryPack, getMarketPack, LEGAL_VERSIONS, samplePrice } from '@deskhand/config'
import {
  REQUIRED_SANDBOX_SCRIPTS,
  SandboxScriptSchema,
  type Account,
  type ChannelKind,
  type DayHours,
  type Gate,
  type Industry,
  type KnowledgeReport,
  type Location,
  type Milestone,
  type OnboardingState,
  type User,
} from '@deskhand/schemas'
import type { ConnectionRecord } from '../db'
import { disclosureText, consentText } from './wording'

export const TEMPLATE_REVIEW_MS = 20_000
export const MIN_FAQS = 3
export const MIN_SANDBOX = 10

export const DEFAULT_HOURS: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  open: day !== 0,
  from: '09:00',
  to: '18:00',
}))

let counter = 0
export function localId(prefix: string) {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

export function asIndustry(value: string): Industry {
  const known: Industry[] = ['salon', 'barber', 'clinic', 'real_estate', 'bakery', 'restaurant', 'gym', 'school', 'home_services', 'general']
  return known.includes(value as Industry) ? (value as Industry) : 'general'
}

export function createOnboardingState({
  account,
  location,
  owner,
  link,
  iso,
}: {
  account: Account
  location: Location
  owner: User
  link: string
  iso: string
}): OnboardingState {
  const market = getMarketPack(account.market)
  return {
    accountId: account.id,
    currentStep: 'profile',
    completedSteps: [],
    skippedSteps: [],
    profile: {
      name: account.name,
      industry: asIndustry(account.industry),
      link,
      description: '',
      descriptionSource: null,
      address: location.address,
      city: location.city,
      phone: '',
      timezone: location.timezone,
      currency: location.currency,
      languages: [market.conversationLanguages[0]!.code],
      hours: DEFAULT_HOURS,
      tone: 'warm',
    },
    goals: [],
    knowledge: { services: [], faqs: [], answers: {}, packId: null },
    channels: { selected: [], whatsapp: null, email: null, webchat: null, messenger: null, instagram: null, sms: null },
    calendar: { provider: null, account: null, deferred: false, staff: [{ id: owner.id, name: owner.name }] },
    employee: { mode: null, name: EMPLOYEE_NAMES[account.market][0]!, tone: 'warm' },
    compliance: {
      legalName: '',
      registeredAddress: '',
      aiDisclosure: true,
      disclosureText: '',
      consentText: '',
      consentConfirmed: false,
      privacyPolicy: null,
      termsAcceptedAt: null,
      dpaAcceptedAt: null,
      termsVersion: LEGAL_VERSIONS.terms,
      dpaVersion: LEGAL_VERSIONS.dpa,
    },
    launch: { sandbox: [], testMessage: null, handoff: null },
    milestoneAt: {},
    startedAt: iso,
    updatedAt: iso,
    liveAt: null,
  }
}

/** Installs the industry pack's services and FAQs. Idempotent: matching names are never added twice (PRD 10.3). */
export function installPack(state: OnboardingState, industry: Industry) {
  const pack = getIndustryPack(industry)
  const serviceNames = new Set(state.knowledge.services.map((s) => s.name.toLowerCase()))
  const faqQuestions = new Set(state.knowledge.faqs.map((f) => f.question.toLowerCase()))
  for (const service of pack.services) {
    if (serviceNames.has(service.name.toLowerCase())) continue
    state.knowledge.services.push({
      id: localId('svc'),
      name: service.name,
      durationMin: service.durationMin,
      price: service.sampleUsd === 0 ? 0 : null,
      source: 'pack',
      verified: service.sampleUsd === 0,
    })
  }
  for (const faq of pack.faqs) {
    if (faqQuestions.has(faq.question.toLowerCase())) continue
    state.knowledge.faqs.push({ id: localId('faq'), question: faq.question, answer: faq.answer, source: 'pack', verified: false })
  }
  state.knowledge.packId = pack.id
}

/** A finished setup for the seeded businesses that are already live. */
export function completedOnboarding({
  account,
  location,
  owner,
  channels,
  employeeName,
  iso,
}: {
  account: Account
  location: Location
  owner: User
  channels: ChannelKind[]
  employeeName: string | null
  iso: string
}): OnboardingState {
  const state = createOnboardingState({ account, location, owner, link: `${account.slug.replace(/-/g, '')}.com`, iso })
  const pack = getIndustryPack(state.profile.industry)
  installPack(state, state.profile.industry)
  state.knowledge.services = state.knowledge.services.map((service) => {
    const sample = pack.services.find((s) => s.name === service.name)?.sampleUsd ?? 0
    return { ...service, price: sample === 0 ? 0 : samplePrice(sample, account.market), verified: true }
  })
  state.knowledge.faqs = state.knowledge.faqs.map((faq) => ({ ...faq, verified: true }))
  state.knowledge.answers = { ...pack.answers, location: location.address }
  state.profile.phone = location.phone
  state.goals = ['reply_faster', 'more_bookings', 'collect_reviews']
  const manual = employeeName === null
  state.employee = { mode: manual ? 'manual' : 'ai', name: employeeName ?? state.employee.name, tone: 'warm' }
  state.channels.selected = channels
  if (channels.includes('whatsapp')) {
    state.channels.whatsapp = {
      number: location.phone,
      displayName: account.name,
      templates: pack.templates.map((t) => ({ ...t, status: 'approved' as const, submittedAt: iso })),
      connectedAt: iso,
    }
  }
  if (channels.includes('email')) {
    const domain = `${account.slug.replace(/-/g, '')}.com`
    state.channels.email = { mode: 'domain', address: `hello@${domain}`, domain, records: dnsRecords(domain).map((r) => ({ ...r, status: 'verified' as const })), verifyAttempts: 1, connectedAt: iso }
  }
  if (channels.includes('webchat')) state.channels.webchat = { placement: 'website', connectedAt: iso }
  if (channels.includes('sms')) state.channels.sms = { sender: location.phone, connectedAt: iso }
  if (channels.includes('instagram')) state.channels.instagram = { handle: `@${account.slug.replace(/-/g, '')}`, connectedAt: iso }
  state.calendar = { ...state.calendar, provider: 'google', account: owner.email }
  state.compliance = {
    ...state.compliance,
    legalName: `${account.name} Ltd`,
    registeredAddress: location.address,
    aiDisclosure: !manual,
    disclosureText: manual ? '' : disclosureText(account.name, employeeName ?? ''),
    consentText: consentText(account.name, account.market),
    consentConfirmed: true,
    privacyPolicy: { kind: 'generated', url: `/privacy/${account.slug}` },
    termsAcceptedAt: iso,
    dpaAcceptedAt: iso,
  }
  if (!manual) {
    state.launch.sandbox = SandboxScriptSchema.options.map((script) => ({
      script,
      customer: '',
      reply: '',
      replyKind: 'answer',
      sources: [],
      verdict: 'right',
      ranAt: iso,
    }))
  }
  state.launch.handoff = { userId: owner.id, channel: 'email', confirmedAt: iso }
  state.completedSteps = ['profile', 'goals', 'knowledge', 'channels', 'services', 'employee', 'compliance', 'launch']
  state.currentStep = 'launch'
  state.liveAt = iso
  return state
}

export function connectedChannels(state: OnboardingState): ChannelKind[] {
  const { channels } = state
  const list: ChannelKind[] = []
  if (channels.whatsapp) list.push('whatsapp')
  if (channels.email?.connectedAt) list.push('email')
  if (channels.webchat) list.push('webchat')
  if (channels.messenger) list.push('messenger')
  if (channels.instagram) list.push('instagram')
  if (channels.sms) list.push('sms')
  return list
}

/** WhatsApp review is simulated: submitted templates are approved after a short delay. */
export function refreshTemplates(state: OnboardingState, nowMs: number): boolean {
  let changed = false
  for (const template of state.channels.whatsapp?.templates ?? []) {
    if (template.status === 'pending' && nowMs - new Date(template.submittedAt).getTime() >= TEMPLATE_REVIEW_MS) {
      template.status = 'approved'
      changed = true
    }
  }
  return changed
}

export function dnsRecords(domain: string) {
  const key = domain.replace(/[^a-z0-9]/gi, '').slice(0, 8).toLowerCase()
  return [
    { type: 'TXT' as const, host: '@', value: 'v=spf1 include:_spf.mail.deskhand.app ~all', purpose: 'spf' as const, status: 'pending' as const },
    { type: 'CNAME' as const, host: 'dh1._domainkey', value: `dh1.${key}.dkim.deskhand.app`, purpose: 'dkim' as const, status: 'pending' as const },
    { type: 'CNAME' as const, host: 'bounce', value: 'bounces.mail.deskhand.app', purpose: 'return_path' as const, status: 'pending' as const },
    { type: 'TXT' as const, host: '_dmarc', value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`, purpose: 'dmarc' as const, status: 'pending' as const },
  ]
}

export function knowledgeReport(state: OnboardingState): KnowledgeReport {
  const { services, faqs, answers } = state.knowledge
  const servicesReady = services.filter((s) => s.price !== null && s.verified).length
  const faqsReady = faqs.filter((f) => f.verified && f.answer.trim()).length
  const hoursSet = state.profile.hours.some((h) => h.open)
  const locationSet = Boolean(state.profile.address.trim() || answers.location?.trim())
  const answered = (Object.keys(answers) as (keyof typeof answers)[]).filter((topic) => answers[topic]?.trim())
  const gaps: string[] = []
  if (services.length === 0) gaps.push('services')
  else if (servicesReady < services.length) gaps.push('prices')
  if (!hoursSet) gaps.push('hours')
  if (!locationSet) gaps.push('location')
  if (faqsReady < MIN_FAQS) gaps.push('faqs')
  for (const topic of ['cancellation', 'payment', 'never_promise'] as const) {
    if (!answers[topic]?.trim()) gaps.push(topic)
  }
  return { servicesTotal: services.length, servicesReady, faqsReady, hoursSet, locationSet, answered, gaps }
}

export function computeGates(state: OnboardingState): Gate[] {
  const manual = state.employee.mode === 'manual'
  const gates: Gate[] = []
  const connected = connectedChannels(state)
  gates.push({
    id: 'channel',
    status: connected.length > 0 ? 'done' : 'blocking',
    step: 'channels',
    missing: connected.length > 0 ? [] : [{ key: 'gates.missing.channel', params: {} }],
  })

  const templates = state.channels.whatsapp?.templates ?? []
  const pending = templates.filter((t) => t.status !== 'approved').length
  gates.push({
    id: 'templates',
    status: !state.channels.whatsapp ? 'not_needed' : pending === 0 ? 'done' : 'blocking',
    step: 'channels',
    missing: state.channels.whatsapp && pending > 0 ? [{ key: 'gates.missing.templates', params: { count: pending } }] : [],
  })

  const report = knowledgeReport(state)
  const knowledgeMissing: Gate['missing'] = []
  if (report.servicesTotal === 0) knowledgeMissing.push({ key: 'gates.missing.services', params: {} })
  else if (report.servicesReady < report.servicesTotal) {
    knowledgeMissing.push({ key: 'gates.missing.prices', params: { count: report.servicesTotal - report.servicesReady } })
  }
  if (!report.hoursSet) knowledgeMissing.push({ key: 'gates.missing.hours', params: {} })
  if (!report.locationSet) knowledgeMissing.push({ key: 'gates.missing.location', params: {} })
  if (report.faqsReady < MIN_FAQS) knowledgeMissing.push({ key: 'gates.missing.faqs', params: { count: MIN_FAQS - report.faqsReady } })
  gates.push({
    id: 'knowledge',
    status: manual ? 'not_needed' : knowledgeMissing.length ? 'blocking' : 'done',
    step: 'knowledge',
    missing: manual ? [] : knowledgeMissing,
  })

  const c = state.compliance
  const complianceMissing: Gate['missing'] = []
  if (!c.legalName.trim()) complianceMissing.push({ key: 'gates.missing.legalName', params: {} })
  if (!manual && (!c.aiDisclosure || !c.disclosureText.trim())) complianceMissing.push({ key: 'gates.missing.disclosure', params: {} })
  if (!c.consentConfirmed || !c.consentText.trim()) complianceMissing.push({ key: 'gates.missing.consent', params: {} })
  if (!c.privacyPolicy) complianceMissing.push({ key: 'gates.missing.privacy', params: {} })
  if (!c.termsAcceptedAt || !c.dpaAcceptedAt) complianceMissing.push({ key: 'gates.missing.terms', params: {} })
  gates.push({ id: 'compliance', status: complianceMissing.length ? 'blocking' : 'done', step: 'compliance', missing: complianceMissing })

  const passed = new Set(state.launch.sandbox.filter((r) => r.verdict === 'right').map((r) => r.script))
  const sandboxMissing: Gate['missing'] = []
  if (passed.size < MIN_SANDBOX) sandboxMissing.push({ key: 'gates.missing.sandbox', params: { count: MIN_SANDBOX - passed.size } })
  for (const script of REQUIRED_SANDBOX_SCRIPTS) {
    if (!passed.has(script)) sandboxMissing.push({ key: 'gates.missing.sandboxRequired', params: { script } })
  }
  gates.push({
    id: 'sandbox',
    status: manual ? 'not_needed' : sandboxMissing.length ? 'blocking' : 'done',
    step: 'launch',
    missing: manual ? [] : sandboxMissing,
  })

  const handoffDone = Boolean(state.launch.handoff?.confirmedAt)
  gates.push({
    id: 'handoff',
    status: manual ? 'not_needed' : handoffDone ? 'done' : 'blocking',
    step: 'launch',
    missing: manual || handoffDone ? [] : [{ key: 'gates.missing.handoff', params: {} }],
  })
  return gates
}

/** Activation milestones reached by the current setup (PRD 6.4). Returns the ones reached just now. */
export function updateMilestones(state: OnboardingState, account: Account, iso: string): Milestone[] {
  const report = knowledgeReport(state)
  const gates = computeGates(state)
  const reached: Milestone[] = []
  if (state.completedSteps.includes('profile') && report.servicesReady > 0) reached.push('profile_complete')
  if (connectedChannels(state).length > 0) reached.push('first_channel_live')
  if (state.employee.mode !== 'manual' && gates.find((g) => g.id === 'knowledge')?.status === 'done') reached.push('ai_taught')
  if (state.liveAt && state.employee.mode === 'ai') reached.push('ai_live')
  const fresh = reached.filter((m) => !account.milestones.includes(m))
  for (const milestone of fresh) state.milestoneAt[milestone] = iso
  account.milestones = [...account.milestones, ...fresh]
  return fresh
}

/** Mirrors connected channels into the connections table so the shell, banners and Connections hub see them. */
export function connectionRecords(state: OnboardingState): ConnectionRecord[] {
  const records: ConnectionRecord[] = connectedChannels(state).map((kind) => ({
    id: `cxn_${state.accountId}_${kind}`,
    accountId: state.accountId,
    kind: kind as ConnectionRecord['kind'],
    health: 'healthy',
    problem: null,
  }))
  if (state.calendar.provider) {
    records.push({ id: `cxn_${state.accountId}_calendar`, accountId: state.accountId, kind: 'google_calendar', health: 'healthy', problem: null })
  }
  return records
}
