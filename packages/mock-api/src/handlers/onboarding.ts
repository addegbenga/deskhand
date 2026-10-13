import { http } from 'msw'
import { z } from 'zod'
import { getIndustryPack } from '@deskhand/config'
import {
  BusinessProfileSchema,
  CalendarConnectSchema,
  CalendarSetupSchema,
  ChannelKindSchema,
  ComplianceSetupSchema,
  EmailDomainSchema,
  EmployeeChoiceSchema,
  FaqItemSchema,
  GoalSchema,
  HandoffSchema,
  ImportRequestSchema,
  ImportResultSchema,
  InterviewTopicSchema,
  ONBOARDING_STEPS,
  OnboardingStepSchema,
  OnboardingViewSchema,
  SandboxChatReplySchema,
  SandboxChatSchema,
  SandboxRunRequestSchema,
  SandboxScriptSchema,
  SandboxVerdictSchema,
  ServiceItemSchema,
  SimpleConnectSchema,
  StepSaveSchema,
  TestMessageSchema,
  WhatsAppConnectSchema,
  type Account,
  type Milestone,
  type OnboardingState,
  type Service,
  type ServiceItem,
  type Session,
} from '@deskhand/schemas'
import { now } from '../clock'
import type { MockDb } from '../db'
import { json, MockHttpError, parseBody, parseData, pause, requireCapability, route } from '../http'
import { parseLink } from '../onboarding/parser'
import { chatReply, runScript } from '../onboarding/sandbox'
import {
  computeGates,
  connectionRecords,
  dnsRecords,
  installPack,
  knowledgeReport,
  localId,
  refreshTemplates,
  updateMilestones,
} from '../onboarding/state'
import { consentText, disclosureText, privacyLaw } from '../onboarding/wording'
import { db } from '../store'
import { notifyChange } from '../sync'
import { loadSession } from './tenant'

const API = '/api/onboarding'
const TOPICS = ['onboarding', 'session', 'banners', 'nav-summary', 'appointments']

type Ctx = { session: Session; database: MockDb; state: OnboardingState; account: Account; iso: string }

async function loadState(database: MockDb, accountId: string) {
  const state = await database.onboarding.get(accountId)
  if (!state) throw new MockHttpError('not_found', 'Setup has not started for this account.')
  return state
}

async function buildView(ctx: Ctx, newMilestones: Milestone[] = []) {
  const { database, state, account } = ctx
  const memberships = await database.memberships.toArray()
  const users = await database.users.bulkGet(memberships.filter((m) => m.role !== 'readonly').map((m) => m.userId))
  return json(OnboardingViewSchema, {
    state,
    gates: computeGates(state),
    knowledge: knowledgeReport(state),
    newMilestones,
    bookingPageHref: `/b/${account.slug}`,
    wording: {
      disclosure: disclosureText(state.profile.name, state.employee.name),
      consent: consentText(state.profile.name, account.market),
      privacyLaw: privacyLaw(account.market),
    },
    team: users.filter(Boolean).map((u) => ({ id: u!.id, name: u!.name, email: u!.email, phone: u!.phone })),
  })
}

async function context(): Promise<Ctx> {
  const session = await loadSession()
  const database = await db()
  const state = await loadState(database, session.account.id)
  return { session, database, state, account: { ...session.account }, iso: now().toISOString() }
}

/** Keep the bookable catalog in step with confirmed knowledge services so adding one in Business settings actually books. */
async function syncBookableServices(database: MockDb, ctx: Ctx, staffUserIds: string[]) {
  const locationId = ctx.session.locations[0]?.id
  if (!locationId) return
  const items = ctx.state.knowledge.services.filter((item: ServiceItem) => item.name.trim())
  const existing = (await database.services.toArray()).filter((row) => row.accountId === ctx.account.id)
  const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row]))
  let order = existing.length
  for (const item of items) {
    const name = item.name.trim()
    const found = byName.get(name.toLowerCase())
    if (found) {
      await database.services.update(found.id, {
        name,
        durationMinutes: item.durationMin,
        price: item.price ?? found.price,
        visible: item.verified ? true : found.visible,
      })
      continue
    }
    const row: Service = {
      id: localId('svc'),
      accountId: ctx.account.id,
      locationId,
      name,
      description: name,
      durationMinutes: item.durationMin,
      bufferMinutes: 15,
      price: item.price ?? 0,
      currency: ctx.state.profile.currency,
      depositAmount: 0,
      staffUserIds,
      capacity: 1,
      visible: item.verified,
      order: order++,
      instantBook: true,
      createdAt: ctx.iso,
      createdBy: { kind: 'person', id: ctx.session.user.id, name: ctx.session.user.name },
    }
    await database.services.add(row)
    byName.set(name.toLowerCase(), row)
  }
}

/** Every change goes through here: validate the role, apply, refresh simulators, track milestones, persist. */
async function mutate(fn: (ctx: Ctx) => void | Promise<void>) {
  const ctx = await context()
  requireCapability(ctx.session, 'connections.manage')
  await fn(ctx)
  refreshTemplates(ctx.state, now().getTime())
  const fresh = updateMilestones(ctx.state, ctx.account, ctx.iso)
  ctx.state.updatedAt = ctx.iso
  const { database, state, account } = ctx
  const staffUserIds = (await database.staffProfiles.toArray())
    .filter((row) => row.accountId === account.id)
    .map((row) => row.userId)
  await database.transaction('rw', [database.onboarding, database.accounts, database.connections, database.services], async () => {
    await database.onboarding.put(state)
    await database.accounts.put(account)
    await database.connections.where('accountId').equals(account.id).delete()
    await database.connections.bulkPut(connectionRecords(state))
    await syncBookableServices(database, ctx, staffUserIds.length ? staffUserIds : [ctx.session.user.id])
  })
  notifyChange(TOPICS)
  return buildView(ctx, fresh)
}

function nextStep(step: OnboardingState['currentStep'], state: OnboardingState) {
  const order = ONBOARDING_STEPS
  let index = order.indexOf(step) + 1
  // Manual only skips the knowledge interview (PRD 15.21).
  while (order[index] === 'knowledge' && state.employee.mode === 'manual') index += 1
  return order[Math.min(index, order.length - 1)]!
}

const ImportedItemsSchema = z.object({ imported: ImportResultSchema.shape.found.pick({ services: true, faqs: true }).optional() })

const KnowledgePatchSchema = z.object({
  services: z.array(ServiceItemSchema).optional(),
  faqs: z.array(FaqItemSchema).optional(),
  answers: z.partialRecord(InterviewTopicSchema, z.string()).optional(),
  manual: z.boolean().optional(),
})

const CompliancePatchSchema = ComplianceSetupSchema.pick({
  legalName: true,
  registeredAddress: true,
  aiDisclosure: true,
  disclosureText: true,
  consentText: true,
  consentConfirmed: true,
  privacyPolicy: true,
})
  .partial()
  .extend({ acceptTerms: z.boolean().optional(), acceptDpa: z.boolean().optional() })

function applyStep(ctx: Ctx, step: OnboardingState['currentStep'], data: Record<string, unknown> | undefined) {
  const { state, account } = ctx
  if (!data) return
  switch (step) {
    case 'profile': {
      const profile = parseData(data, BusinessProfileSchema)
      const { imported } = parseData(data, ImportedItemsSchema)
      state.profile = profile
      account.name = profile.name
      account.industry = profile.industry
      // Items read from the owner's own page go in first, so the pack never duplicates them. Both need confirming.
      const known = new Set(state.knowledge.services.map((s) => s.name.toLowerCase()))
      for (const service of imported?.services ?? []) {
        if (known.has(service.name.toLowerCase())) continue
        state.knowledge.services.push({ ...service, id: localId('svc'), source: 'import', verified: false })
      }
      const questions = new Set(state.knowledge.faqs.map((f) => f.question.toLowerCase()))
      for (const faq of imported?.faqs ?? []) {
        if (questions.has(faq.question.toLowerCase())) continue
        state.knowledge.faqs.push({ ...faq, id: localId('faq'), source: 'import', verified: false })
      }
      installPack(state, profile.industry)
      return
    }
    case 'goals':
      state.goals = parseData(data, z.object({ goals: z.array(GoalSchema) })).goals
      return
    case 'knowledge': {
      const patch = parseData(data, KnowledgePatchSchema)
      if (patch.services) state.knowledge.services = patch.services
      if (patch.faqs) state.knowledge.faqs = patch.faqs
      if (patch.answers) state.knowledge.answers = { ...state.knowledge.answers, ...patch.answers }
      if (patch.manual) state.employee.mode = 'manual'
      return
    }
    case 'channels':
      state.channels.selected = parseData(data, z.object({ selected: z.array(ChannelKindSchema) })).selected
      return
    case 'services': {
      const patch = parseData(
        data,
        z.object({ services: z.array(ServiceItemSchema), calendar: CalendarSetupSchema.pick({ staff: true, deferred: true }) }),
      )
      state.knowledge.services = patch.services
      state.calendar = { ...state.calendar, ...patch.calendar }
      return
    }
    case 'employee': {
      const employee = parseData(data, EmployeeChoiceSchema)
      state.employee = employee
      if (employee.mode === 'ai') state.skippedSteps = state.skippedSteps.filter((s) => s !== 'knowledge')
      return
    }
    case 'compliance': {
      const { acceptTerms, acceptDpa, ...patch } = parseData(data, CompliancePatchSchema)
      state.compliance = { ...state.compliance, ...patch }
      if (acceptTerms !== undefined) state.compliance.termsAcceptedAt = acceptTerms ? ctx.iso : null
      if (acceptDpa !== undefined) state.compliance.dpaAcceptedAt = acceptDpa ? ctx.iso : null
      return
    }
    case 'launch':
      return
  }
}

export const onboardingHandlers = [
  http.get(
    API,
    route(async () => {
      const ctx = await context()
      if (refreshTemplates(ctx.state, now().getTime())) {
        const fresh = updateMilestones(ctx.state, ctx.account, ctx.iso)
        await ctx.database.onboarding.put(ctx.state)
        await ctx.database.accounts.put(ctx.account)
        notifyChange(['session'])
        return buildView(ctx, fresh)
      }
      return buildView(ctx)
    }),
  ),

  http.put(
    `${API}/steps/:step`,
    route(async ({ params, request }) => {
      const step = OnboardingStepSchema.safeParse(params.step)
      if (!step.success) throw new MockHttpError('not_found', 'Unknown step.')
      const body = await parseBody(request, StepSaveSchema)
      return mutate((ctx) => {
        applyStep(ctx, step.data, body.data)
        const { state } = ctx
        if (body.complete && !state.completedSteps.includes(step.data)) {
          state.completedSteps.push(step.data)
          state.skippedSteps = state.skippedSteps.filter((s) => s !== step.data)
        }
        if (body.skip && !state.skippedSteps.includes(step.data)) state.skippedSteps.push(step.data)
        if (body.complete || body.skip) {
          const next = nextStep(step.data, state)
          // Going back to fix an earlier step never moves the resume point backwards.
          if (ONBOARDING_STEPS.indexOf(next) > ONBOARDING_STEPS.indexOf(state.currentStep)) state.currentStep = next
        }
      })
    }),
  ),

  http.post(
    `${API}/import`,
    route(async ({ request }) => {
      const { url } = await parseBody(request, ImportRequestSchema)
      const ctx = await context()
      requireCapability(ctx.session, 'connections.manage')
      await pause(1200)
      return json(ImportResultSchema, parseLink(url, ctx.account.market, ctx.state.profile.city))
    }),
  ),

  http.post(
    `${API}/channels/whatsapp`,
    route(async ({ request }) => {
      const body = await parseBody(request, WhatsAppConnectSchema)
      return mutate(({ state, iso }) => {
        const pack = getIndustryPack(state.profile.industry)
        state.channels.whatsapp = {
          number: body.number,
          displayName: body.displayName,
          templates: pack.templates.map((t) => ({ ...t, status: 'pending' as const, submittedAt: iso })),
          connectedAt: iso,
        }
        if (!state.channels.selected.includes('whatsapp')) state.channels.selected.push('whatsapp')
      })
    }),
  ),

  http.post(
    `${API}/channels/email/managed`,
    route(async () =>
      mutate(({ state, account, iso }) => {
        state.channels.email = {
          mode: 'managed',
          address: `${account.slug}@mail.deskhand.app`,
          domain: null,
          records: [],
          verifyAttempts: 0,
          connectedAt: iso,
        }
        if (!state.channels.selected.includes('email')) state.channels.selected.push('email')
      }),
    ),
  ),

  http.post(
    `${API}/channels/email/domain`,
    route(async ({ request }) => {
      const body = await parseBody(request, EmailDomainSchema)
      const domain = body.domain.toLowerCase()
      return mutate(({ state }) => {
        state.channels.email = {
          mode: 'domain',
          address: `${body.address.replace(/@.*$/, '')}@${domain}`,
          domain,
          records: dnsRecords(domain),
          verifyAttempts: 0,
          connectedAt: null,
        }
        if (!state.channels.selected.includes('email')) state.channels.selected.push('email')
      })
    }),
  ),

  /** DNS simulator: the first check finds SPF and DKIM, the second finds everything (records take time to spread). */
  http.post(
    `${API}/channels/email/verify`,
    route(async () => {
      await pause(900)
      return mutate(({ state, iso }) => {
        const email = state.channels.email
        if (!email || email.mode !== 'domain') throw new MockHttpError('conflict', 'Add a domain first.')
        email.verifyAttempts += 1
        email.records = email.records.map((r) =>
          email.verifyAttempts >= 2 || r.purpose === 'spf' || r.purpose === 'dkim' ? { ...r, status: 'verified' as const } : r,
        )
        if (email.records.every((r) => r.status === 'verified')) email.connectedAt ??= iso
      })
    }),
  ),

  http.post(
    `${API}/channels/:kind`,
    route(async ({ params, request }) => {
      const kind = z.enum(['webchat', 'messenger', 'instagram', 'sms']).safeParse(params.kind)
      if (!kind.success) throw new MockHttpError('not_found', 'Unknown channel.')
      const { value } = await parseBody(request, SimpleConnectSchema)
      return mutate(({ state, iso }) => {
        if (kind.data === 'webchat') {
          state.channels.webchat = { placement: value === 'website' ? 'website' : 'booking_page', connectedAt: iso }
        }
        if (kind.data === 'messenger') state.channels.messenger = { page: value, connectedAt: iso }
        if (kind.data === 'instagram') state.channels.instagram = { handle: value, connectedAt: iso }
        if (kind.data === 'sms') state.channels.sms = { sender: value, connectedAt: iso }
        if (!state.channels.selected.includes(kind.data)) state.channels.selected.push(kind.data)
      })
    }),
  ),

  http.delete(
    `${API}/channels/:kind`,
    route(async ({ params }) => {
      const kind = z.enum(['whatsapp', 'email', 'webchat', 'messenger', 'instagram', 'sms']).safeParse(params.kind)
      if (!kind.success) throw new MockHttpError('not_found', 'Unknown channel.')
      return mutate(({ state }) => {
        state.channels[kind.data] = null
      })
    }),
  ),

  http.post(
    `${API}/calendar`,
    route(async ({ request }) => {
      const body = await parseBody(request, CalendarConnectSchema)
      return mutate(({ state }) => {
        state.calendar = { ...state.calendar, provider: body.provider, account: body.account, deferred: false }
      })
    }),
  ),

  http.delete(
    `${API}/calendar`,
    route(async () =>
      mutate(({ state }) => {
        state.calendar = { ...state.calendar, provider: null, account: null }
      }),
    ),
  ),

  http.post(
    `${API}/sandbox/run`,
    route(async ({ request }) => {
      const { scripts } = await parseBody(request, SandboxRunRequestSchema)
      await pause(Math.min(400 * scripts.length, 1600))
      return mutate(({ state, account, session, database, iso }) =>
        sandboxContext(database, state, account, session).then((sandbox) => {
          for (const script of scripts) {
            const run = runScript(script, sandbox, iso)
            state.launch.sandbox = [...state.launch.sandbox.filter((r) => r.script !== script), run]
          }
        }),
      )
    }),
  ),

  http.post(
    `${API}/sandbox/:script/verdict`,
    route(async ({ params, request }) => {
      const script = SandboxScriptSchema.safeParse(params.script)
      if (!script.success) throw new MockHttpError('not_found', 'Unknown test.')
      const { verdict } = await parseBody(request, SandboxVerdictSchema)
      return mutate(({ state }) => {
        state.launch.sandbox = state.launch.sandbox.map((r) => (r.script === script.data ? { ...r, verdict } : r))
      })
    }),
  ),

  http.post(
    `${API}/sandbox/verdicts`,
    route(async () =>
      mutate(({ state }) => {
        state.launch.sandbox = state.launch.sandbox.map((r) => (r.verdict === null ? { ...r, verdict: 'right' as const } : r))
      }),
    ),
  ),

  http.post(
    `${API}/sandbox/chat`,
    route(async ({ request }) => {
      const { message } = await parseBody(request, SandboxChatSchema)
      const ctx = await context()
      requireCapability(ctx.session, 'connections.manage')
      await pause(500)
      const sandbox = await sandboxContext(ctx.database, ctx.state, ctx.account, ctx.session)
      return json(SandboxChatReplySchema, chatReply(message, sandbox, ctx.iso))
    }),
  ),

  http.post(
    `${API}/test-message`,
    route(async ({ request }) => {
      const body = await parseBody(request, TestMessageSchema)
      await pause(700)
      return mutate(({ state, iso }) => {
        state.launch.testMessage = { channel: body.channel, to: body.to, sentAt: iso }
      })
    }),
  ),

  http.post(
    `${API}/handoff`,
    route(async ({ request }) => {
      const body = await parseBody(request, HandoffSchema)
      return mutate(({ state }) => {
        state.launch.handoff = { ...body, confirmedAt: null }
      })
    }),
  ),

  http.post(
    `${API}/handoff/confirm`,
    route(async () =>
      mutate(({ state, iso }) => {
        if (!state.launch.handoff) throw new MockHttpError('conflict', 'Choose who receives handoffs first.')
        state.launch.handoff = { ...state.launch.handoff, confirmedAt: iso }
      }),
    ),
  ),

  /** Go-live: blocked with the failing gates until every one is green (PRD 6.2). */
  http.post(
    `${API}/go-live`,
    route(async () =>
      mutate(({ state, account, iso }) => {
        refreshTemplates(state, now().getTime())
        const blocking = computeGates(state).filter((g) => g.status === 'blocking')
        if (blocking.length) {
          throw new MockHttpError('validation_failed', 'Some go-live checks are not done yet.', {
            fieldErrors: { gates: blocking.map((g) => g.id) },
          })
        }
        state.liveAt = iso
        if (!state.completedSteps.includes('launch')) state.completedSteps.push('launch')
        account.aiMode = state.employee.mode === 'ai' ? 'suggest_only' : 'manual'
      }),
    ),
  ),
]

async function sandboxContext(database: MockDb, state: OnboardingState, account: Account, session: Session) {
  const location = await database.locations.where('accountId').equals(account.id).first()
  const handoffUser = state.launch.handoff ? await database.users.get(state.launch.handoff.userId) : null
  const person = handoffUser ?? session.user
  return { state, account, locale: location?.locale ?? 'en', ownerName: person.name.split(' ')[0] ?? person.name }
}
