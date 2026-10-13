import { http } from 'msw'
import { z } from 'zod'
import {
  ApprovalActionSchema,
  ApprovalQueueSchema,
  ApprovalSchema,
  AutonomyRaiseSchema,
  BulkApprovalSchema,
  ComplianceReportSchema,
  CreateEmployeeSchema,
  EmployeeListSchema,
  EmployeePatchSchema,
  EmployeeSchema,
  EmployeeVersionSchema,
  EvalListSchema,
  KnowledgeImportSchema,
  KnowledgeItemSchema,
  KnowledgeListSchema,
  KnowledgePatchSchema,
  KnowledgePreviewAskSchema,
  KnowledgePreviewSchema,
  KnowledgeWriteSchema,
  TrainingAddSchema,
  PublishEmployeeSchema,
  SandboxReplySchema,
  SandboxTurnSchema,
  TrainingListSchema,
  TranscriptListSchema,
  TranscriptRateSchema,
  TranscriptSampleSchema,
  autonomyAllowed,
  capAutonomy,
  canSeeArea,
  type Approval,
  type Employee,
  type KnowledgeItem,
  type Session,
  type TranscriptSample,
} from '@deskhand/schemas'
import { getMarketPack } from '@deskhand/config'
import { AiActionRecordSchema } from '@deskhand/schemas'
import { employeeWarnings, sandboxReply } from '../ai-engine'
import { now } from '../clock'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'
import { assertNoBlockingCompliance } from '../compliance-gate'

const API = '/api'

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function actor(session: Session) {
  return { kind: 'person' as const, id: session.user.id, name: session.user.name }
}

function hydrateEmployee(row: Employee): Employee {
  return {
    ...row,
    phoneSource: row.phoneSource ?? null,
    phoneNumber: row.phoneNumber ?? null,
    phoneStatus: row.phoneStatus ?? 'none',
    pronunciation: row.pronunciation ?? '',
  }
}

async function requireAiArea(session: Session) {
  if (!canSeeArea(session.membership.role, 'ai')) {
    throw new MockHttpError('forbidden', 'Your role cannot do this.')
  }
}

function bumpVersion(employee: Employee, _reason: string | null, session: Session): Employee {
  return { ...employee, version: employee.version + 1, createdBy: actor(session) }
}

async function saveVersion(database: Awaited<ReturnType<typeof db>>, before: Employee, summary: string, reason: string | null, session: Session) {
  await database.employeeVersions.add({
    id: localId('ver'),
    accountId: before.accountId,
    employeeId: before.id,
    number: before.version + 1,
    summary,
    reason,
    snapshot: before,
    createdAt: now().toISOString(),
    createdBy: actor(session),
  })
}

function defaultTools(): Employee['tools'] {
  return [
    { id: 'answer_faqs', enabled: true, autonomy: 'suggest' },
    { id: 'qualify_leads', enabled: true, autonomy: 'suggest' },
    { id: 'book', enabled: true, autonomy: 'approve' },
    { id: 'update_crm', enabled: true, autonomy: 'approve' },
    { id: 'send_payment_link', enabled: true, autonomy: 'approve' },
  ]
}

function applyCaps(employee: Employee): Employee {
  const languages = employee.languages.map((lang) => ({ ...lang, autonomy: capAutonomy(lang.tier, lang.autonomy) }))
  return { ...employee, languages }
}

function raisesAutonomy(before: Employee, patch: Partial<Employee>) {
  if (patch.tools) {
    for (const tool of patch.tools) {
      const prev = before.tools.find((item) => item.id === tool.id)
      if (prev && ['suggest', 'approve', 'autopilot'].indexOf(tool.autonomy) > ['suggest', 'approve', 'autopilot'].indexOf(prev.autonomy)) {
        return true
      }
    }
  }
  if (patch.languages) {
    for (const lang of patch.languages) {
      const prev = before.languages.find((item) => item.code === lang.code)
      if (prev && ['suggest', 'approve', 'autopilot'].indexOf(lang.autonomy) > ['suggest', 'approve', 'autopilot'].indexOf(prev.autonomy)) {
        return true
      }
    }
  }
  return false
}

function collections(items: KnowledgeItem[]) {
  const ids = ['profile', 'services', 'policies', 'faqs', 'locations', 'promotions', 'do_not_say'] as const
  const expected: Record<(typeof ids)[number], string[]> = {
    profile: ['About the business'],
    services: [],
    policies: ['Cancellation', 'Late arrival'],
    faqs: [],
    locations: ['Opening hours'],
    promotions: [],
    do_not_say: [],
  }
  return ids.map((id) => {
    const set = items.filter((item) => item.collection === id)
    const missing = (expected[id] ?? []).filter((title) => !set.some((item) => item.title.toLowerCase().includes(title.toLowerCase())))
    const verified = set.filter((item) => item.status === 'verified').length
    const coverage = set.length === 0 ? (missing.length ? 0 : 100) : Math.round((verified / Math.max(set.length + missing.length, 1)) * 100)
    return { id, coverage, missing }
  })
}

export const aiHandlers = [
  http.get(
    `${API}/employees`,
    route(async () => {
      const session = await loadSession()
      await requireAiArea(session)
      const database = await db()
      const items = await database.employees.toArray()
      return json(EmployeeListSchema, items.map(hydrateEmployee))
    }),
  ),

  http.post(
    `${API}/employees`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, CreateEmployeeSchema)
      const pack = getMarketPack(session.account.market)
      const languages = pack.conversationLanguages.map((lang) => ({
        code: lang.code,
        tier: lang.tier,
        autonomy: capAutonomy(lang.tier, 'suggest'),
      }))
      const employee: Employee = applyCaps({
        id: localId('emp'),
        accountId: session.account.id,
        locationId: session.locations[0]?.id ?? null,
        kind: input.kind,
        name: input.name,
        role: input.kind === 'voice' ? 'Inbound receptionist' : 'Receptionist',
        template: input.template,
        status: 'draft',
        tone: 'warm',
        greeting: `Hi, this is ${input.name}.`,
        signOff: input.name,
        disclosure: pack.complianceProfile.aiDisclosureRequired
          ? `Hi, I'm ${input.name}, an AI assistant for ${session.account.name}.`
          : `Hi, I'm ${input.name}.`,
        emoji: false,
        languages,
        channels: input.kind === 'voice' ? ['voice'] : ['whatsapp', 'webchat', 'email'],
        hours: 'business',
        afterHours: input.kind === 'voice' ? 'voicemail' : 'message',
        collectionIds: ['services', 'policies', 'faqs', 'locations'],
        neverSay: [],
        escalateTopics: ['anger', 'legal', 'medical', 'refunds', 'human requested'],
        tools: defaultTools(),
        discountLimit: null,
        handoffUserId: session.user.id,
        quietHours: true,
        killSwitched: false,
        conversationsThisMonth: 0,
        handoffRate: 0,
        costThisMonth: 0,
        currency: pack.currency,
        version: 1,
        warnings: [],
        voiceUseCase: input.kind === 'voice' ? (['inbound', 'after_hours', 'reminders', 'callback'].includes(input.template) ? (input.template as 'inbound') : 'inbound') : null,
        voiceId: input.kind === 'voice' ? 'ng-warm-f' : null,
        recordingEnabled: false,
        recordingNotice: input.kind === 'voice' ? 'This call may be recorded so the team can follow up.' : '',
        maxCallMinutes: 8,
        transferNumber: null,
        outboundAllowed: false,
        phoneSource: null,
        phoneNumber: null,
        phoneStatus: 'none',
        pronunciation: '',
        createdAt: now().toISOString(),
        createdBy: actor(session),
      })
      employee.warnings = employeeWarnings(employee, [])
      const suites = ['grounding', 'handoff', 'disclosure', 'opt_out', 'injection', 'policy'] as const
      await write(['employees'], async (d) => {
        await d.employees.add(employee)
        await d.employeeVersions.add({
          id: localId('ver'),
          accountId: employee.accountId,
          employeeId: employee.id,
          number: 1,
          summary: 'Created',
          reason: null,
          snapshot: employee,
          createdAt: employee.createdAt,
          createdBy: actor(session),
        })
        for (const lang of employee.languages) {
          for (const [index, suite] of suites.entries()) {
            await d.evalResults.add({
              id: localId('ev'),
              employeeId: employee.id,
              version: 1,
              language: lang.code,
              suite,
              passed: !(lang.tier === 'C' && suite === 'grounding'),
              score: lang.tier === 'A' ? 92 - index : lang.tier === 'B' ? 78 - index : 54 - index,
            })
          }
        }
      })
      return json(EmployeeSchema, employee, 201)
    }),
  ),

  http.get(
    `${API}/employees/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const employee = await (await db()).employees.get(String(params.id))
      if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
      return json(EmployeeSchema, hydrateEmployee(employee))
    }),
  ),

  http.patch(
    `${API}/employees/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const patch = await parseBody(request, EmployeePatchSchema)
      const database = await db()
      const before = await database.employees.get(String(params.id))
      if (!before) throw new MockHttpError('not_found', 'Employee not found.')
      if (patch.languages) {
        for (const lang of patch.languages) {
          if (!autonomyAllowed(lang.tier, lang.autonomy)) {
            throw new MockHttpError('validation_failed', 'This language cannot run on Autopilot.', {
              fieldErrors: { languages: ['Tier C languages stay on Suggest.'] },
            })
          }
        }
      }
      const nextTools = patch.tools ?? before.tools
      const nextLangs = patch.languages ?? before.languages
      const merged: Employee = applyCaps({
        ...before,
        ...patch,
        tools: nextTools,
        languages: nextLangs,
        reason: undefined,
      } as Employee)
      const knowledge = await database.knowledgeItems.toArray()
      merged.warnings = employeeWarnings(merged, knowledge)
      const needsReason = raisesAutonomy(before, merged)
      if (needsReason && !(patch.reason && patch.reason.trim().length >= 8)) {
        throw new MockHttpError('validation_failed', 'Give a reason to raise autonomy.', {
          fieldErrors: { reason: ['Required when raising autonomy'] },
        })
      }
      const toAutopilot =
        merged.tools.some((tool) => tool.autonomy === 'autopilot' && before.tools.find((item) => item.id === tool.id)?.autonomy !== 'autopilot') ||
        merged.languages.some(
          (lang) => lang.autonomy === 'autopilot' && before.languages.find((item) => item.code === lang.code)?.autonomy !== 'autopilot',
        )
      if (toAutopilot) await assertNoBlockingCompliance(session.account.id, session.account.market, 'autopilot')
      const bumped = bumpVersion(merged, patch.reason ?? null, session)
      await write(['employees'], async (d) => {
        await saveVersion(d, before, needsReason ? 'Autonomy raised' : 'Persona or rules updated', patch.reason ?? null, session)
        await d.employees.put({ ...bumped, version: before.version + 1 })
      })
      return json(EmployeeSchema, { ...bumped, version: before.version + 1 })
    }),
  ),

  http.post(
    `${API}/employees/:id/kill`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      let updated: Employee | undefined
      await write(['employees', 'nav-summary', 'home'], async (d) => {
        const employee = await d.employees.get(String(params.id))
        if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
        updated = { ...employee, killSwitched: true, status: 'paused' }
        await d.employees.put(updated)
      })
      return json(EmployeeSchema, updated!)
    }),
  ),

  http.post(
    `${API}/employees/:id/resume`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      let updated: Employee | undefined
      await write(['employees', 'nav-summary', 'home'], async (d) => {
        const employee = await d.employees.get(String(params.id))
        if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
        updated = { ...employee, killSwitched: false, status: employee.version >= 1 ? 'live' : 'draft' }
        if (updated.status === 'live' && employee.status === 'draft') updated.status = 'draft'
        if (employee.status === 'draft' || employee.status === 'testing' || employee.status === 'shadow') {
          updated.status = employee.status
        } else {
          updated.status = 'live'
        }
        await d.employees.put(updated)
      })
      return json(EmployeeSchema, updated!)
    }),
  ),

  http.post(
    `${API}/employees/:id/publish`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, PublishEmployeeSchema)
      const database = await db()
      const employee = await database.employees.get(String(params.id))
      if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
      if (employee.languages.some((lang) => lang.tier === 'C' && input.rollout === 'autopilot')) {
        throw new MockHttpError('validation_failed', 'A Tier C language cannot go live on Autopilot.', {
          fieldErrors: { rollout: ['Lower autonomy or remove the Tier C language.'] },
        })
      }
      if (input.rollout !== 'shadow') {
        await assertNoBlockingCompliance(
          session.account.id,
          session.account.market,
          input.rollout === 'autopilot' ? 'autopilot' : 'go_live',
        )
      }
      const evals = (await database.evalResults.where('employeeId').equals(employee.id).toArray()).filter((item) => item.language === 'en')
      if (evals.length && evals.some((item) => !item.passed)) {
        throw new MockHttpError('validation_failed', 'Evals must pass before go-live.')
      }
      const updated: Employee = { ...employee, status: input.rollout === 'shadow' ? 'shadow' : 'live' }
      await write(['employees'], async (d) => {
        await d.employees.put(updated)
      })
      return json(EmployeeSchema, updated)
    }),
  ),

  http.post(
    `${API}/employees/:id/duplicate`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const source = await (await db()).employees.get(String(params.id))
      if (!source) throw new MockHttpError('not_found', 'Employee not found.')
      const copy: Employee = {
        ...source,
        id: localId('emp'),
        name: `${source.name} copy`,
        status: 'draft',
        killSwitched: false,
        version: 1,
        conversationsThisMonth: 0,
        createdAt: now().toISOString(),
        createdBy: actor(session),
      }
      await write(['employees'], async (d) => {
        await d.employees.add(copy)
      })
      return json(EmployeeSchema, copy, 201)
    }),
  ),

  http.get(
    `${API}/employees/:id/versions`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const items = (await (await db()).employeeVersions.where('employeeId').equals(String(params.id)).toArray()).sort(
        (a, b) => b.number - a.number,
      )
      return json(zArrayVersions(), items)
    }),
  ),

  http.post(
    `${API}/employees/:id/versions/:number/rollback`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const database = await db()
      const version = (await database.employeeVersions.where('employeeId').equals(String(params.id)).toArray()).find(
        (item) => item.number === Number(params.number),
      )
      if (!version) throw new MockHttpError('not_found', 'Version not found.')
      const current = await database.employees.get(String(params.id))
      if (!current) throw new MockHttpError('not_found', 'Employee not found.')
      const restored: Employee = {
        ...version.snapshot,
        id: current.id,
        version: current.version + 1,
        createdAt: current.createdAt,
      }
      await write(['employees'], async (d) => {
        await saveVersion(d, current, `Rolled back to v${version.number}`, 'rollback', session)
        await d.employees.put(restored)
      })
      return json(EmployeeSchema, restored)
    }),
  ),

  http.post(
    `${API}/employees/:id/sandbox`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const input = await parseBody(request, SandboxTurnSchema)
      const database = await db()
      const employee = await database.employees.get(String(params.id))
      if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
      const knowledge = await database.knowledgeItems.toArray()
      const reply = sandboxReply(employee, knowledge, input.message, input.scenario, input.language ?? 'en')
      return json(SandboxReplySchema, reply)
    }),
  ),

  http.get(
    `${API}/employees/:id/evals`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const items = await (await db()).evalResults.where('employeeId').equals(String(params.id)).toArray()
      return json(EvalListSchema, items)
    }),
  ),

  http.get(
    `${API}/employees/:id/compliance`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const database = await db()
      const employee = await database.employees.get(String(params.id))
      if (!employee) throw new MockHttpError('not_found', 'Employee not found.')
      const knowledge = await database.knowledgeItems.toArray()
      const accountState = await database.complianceState.get(employee.accountId)
      const accountOk = Boolean(accountState?.disclosureVerified)
      const items = [
        { id: 'account_disclosure', ok: accountOk, blocking: true },
        { id: 'disclosure', ok: Boolean(employee.disclosure), blocking: true },
        { id: 'handoff', ok: Boolean(employee.handoffUserId), blocking: true },
        { id: 'scope', ok: true, blocking: true },
        { id: 'opt_out', ok: true, blocking: true },
        { id: 'tier_c', ok: !employee.languages.some((l) => l.tier === 'C' && l.autonomy === 'autopilot'), blocking: true },
        { id: 'prices', ok: !knowledge.some((k) => k.containsPrice && k.status !== 'verified' && employee.tools.find((t) => t.id === 'answer_faqs')?.autonomy === 'autopilot'), blocking: false },
        { id: 'recording', ok: employee.kind !== 'voice' || Boolean(employee.recordingNotice), blocking: employee.kind === 'voice' },
      ]
      return json(ComplianceReportSchema, { items, canGoLive: items.every((item) => item.ok || !item.blocking) })
    }),
  ),

  http.post(
    `${API}/employees/:id/autonomy`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, AutonomyRaiseSchema)
      const database = await db()
      const before = await database.employees.get(String(params.id))
      if (!before) throw new MockHttpError('not_found', 'Employee not found.')
      if (input.autonomy === 'autopilot') {
        await assertNoBlockingCompliance(session.account.id, session.account.market, 'autopilot')
      }
      const tools = before.tools.map((tool) => (input.toolId && tool.id === input.toolId ? { ...tool, autonomy: input.autonomy } : tool))
      const languages = before.languages.map((lang) => {
        if (input.language && lang.code === input.language) {
          if (!autonomyAllowed(lang.tier, input.autonomy)) {
            throw new MockHttpError('validation_failed', 'This language cannot run on Autopilot.', {
              fieldErrors: { autonomy: ['Tier C languages stay on Suggest.'] },
            })
          }
          return { ...lang, autonomy: input.autonomy }
        }
        return lang
      })
      const updated = { ...before, tools, languages, version: before.version + 1 }
      updated.warnings = employeeWarnings(updated, await database.knowledgeItems.toArray())
      await write(['employees'], async (d) => {
        await saveVersion(d, before, 'Autonomy raised', input.reason, session)
        await d.employees.put(updated)
      })
      return json(EmployeeSchema, updated)
    }),
  ),

  http.get(
    `${API}/knowledge`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const collection = new URL(request.url).searchParams.get('collection')
      const all = await (await db()).knowledgeItems.toArray()
      const items = all.filter((item) => !collection || item.collection === collection)
      return json(KnowledgeListSchema, { items, collections: collections(all) })
    }),
  ),

  http.post(
    `${API}/knowledge`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, KnowledgeWriteSchema)
      const item: KnowledgeItem = {
        id: localId('kn'),
        accountId: session.account.id,
        collection: input.collection,
        title: input.title,
        answer: input.answer,
        language: input.language,
        locationId: session.locations[0]?.id ?? null,
        status: 'verified',
        source: 'owner',
        pinned: input.pinned ?? {},
        autoTranslated: false,
        expiresAt: input.expiresAt ?? null,
        containsPrice: Boolean(input.containsPrice) || /(?:₦|ngn|\d[\d,]{2,})/i.test(input.answer),
        createdAt: now().toISOString(),
        createdBy: actor(session),
      }
      await write(['knowledge'], async (d) => {
        await d.knowledgeItems.add(item)
      })
      return json(KnowledgeItemSchema, item, 201)
    }),
  ),

  http.patch(
    `${API}/knowledge/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, KnowledgePatchSchema)
      let updated: KnowledgeItem | undefined
      await write(['knowledge', 'employees'], async (d) => {
        const item = await d.knowledgeItems.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Item not found.')
        updated = { ...item, ...input }
        await d.knowledgeItems.put(updated)
      })
      return json(KnowledgeItemSchema, updated!)
    }),
  ),

  http.post(
    `${API}/knowledge/:id/verify`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      let updated: KnowledgeItem | undefined
      await write(['knowledge'], async (d) => {
        const item = await d.knowledgeItems.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Item not found.')
        updated = { ...item, status: 'verified' }
        await d.knowledgeItems.put(updated)
      })
      return json(KnowledgeItemSchema, updated!)
    }),
  ),

  http.post(
    `${API}/knowledge/import`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const input = await parseBody(request, KnowledgeImportSchema)
      const fromPaste = input.paste?.trim()
      const fromFile = input.fileName
      const fromUrl = input.url
      const item: KnowledgeItem = {
        id: localId('kn'),
        accountId: session.account.id,
        collection: input.collection ?? 'faqs',
        title: fromFile ? `Uploaded: ${fromFile}` : fromUrl ? `Imported from ${fromUrl.replace(/^https?:\/\//, '').split('/')[0]}` : 'Pasted notes',
        answer: fromPaste ?? 'We take card, transfer and cash. Prices are confirmed in the salon.',
        language: 'en',
        locationId: null,
        status: 'unverified',
        source: 'import',
        pinned: {},
        autoTranslated: false,
        expiresAt: null,
        containsPrice: /₦|\d{3,}/.test(fromPaste ?? ''),
        createdAt: now().toISOString(),
        createdBy: actor(session),
      }
      await write(['knowledge'], async (d) => {
        await d.knowledgeItems.add(item)
      })
      return json(KnowledgeItemSchema, item, 201)
    }),
  ),

  http.post(
    `${API}/knowledge/preview`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const { question, language } = await parseBody(request, KnowledgePreviewAskSchema)
      const database = await db()
      const knowledge = await database.knowledgeItems.toArray()
      const employee = (await database.employees.toArray()).find((item) => item.kind === 'chat') ?? (await database.employees.toArray())[0]
      if (!employee) throw new MockHttpError('not_found', 'Create an AI employee to preview answers.')
      const reply = sandboxReply(employee, knowledge, question, undefined, language ?? 'en')
      const items = knowledge.filter((item) => reply.usedItemIds.includes(item.id))
      return json(KnowledgePreviewSchema, { ...reply, items })
    }),
  ),

  http.get(
    `${API}/knowledge/training`,
    route(async () => {
      const session = await loadSession()
      await requireAiArea(session)
      return json(TrainingListSchema, await (await db()).trainingInbox.toArray())
    }),
  ),

  http.post(
    `${API}/knowledge/training/:id/add`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.manage')
      const body = await parseBody(request, TrainingAddSchema)
      let created: KnowledgeItem | undefined
      await write(['knowledge', 'training'], async (d) => {
        const question = await d.trainingInbox.get(String(params.id))
        if (!question) throw new MockHttpError('not_found', 'Question not found.')
        created = {
          id: localId('kn'),
          accountId: session.account.id,
          collection: 'faqs',
          title: question.question,
          answer: body.answer?.trim() || question.draftAnswer,
          language: 'en',
          locationId: null,
          status: 'verified',
          source: 'training',
          pinned: {},
          autoTranslated: false,
          expiresAt: null,
          containsPrice: false,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await d.knowledgeItems.add(created)
        await d.trainingInbox.delete(question.id)
      })
      return json(KnowledgeItemSchema, created!)
    }),
  ),

  http.get(
    `${API}/approvals`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve', 'view')
      const status = new URL(request.url).searchParams.get('status') ?? 'pending'
      let items = (await (await db()).approvals.toArray()).filter((item) => (status === 'all' ? true : item.status === status))
      if (session.membership.role === 'staff') {
        const convos = await (await db()).conversations.toArray()
        const mine = new Set(convos.filter((c) => c.assignedUserId === session.user.id).map((c) => c.id))
        items = items.filter((item) => item.conversationId && mine.has(item.conversationId))
      }
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(ApprovalQueueSchema, { items, nextCursor: null, total: items.length })
    }),
  ),

  http.post(
    `${API}/approvals/:id/approve`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve')
      const input = await parseBody(request, ApprovalActionSchema)
      let updated: Approval | undefined
      await write(['approvals', 'nav-summary', 'home'], async (d) => {
        const item = await d.approvals.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Approval not found.')
        updated = { ...item, status: 'approved' as const, draft: input.body ?? item.draft }
        await d.approvals.put(updated)
      })
      if (!updated) throw new MockHttpError('not_found', 'Approval not found.')
      return json(ApprovalSchema, updated)
    }),
  ),

  http.post(
    `${API}/approvals/:id/reject`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve')
      const input = await parseBody(request, ApprovalActionSchema)
      if (!input.reason) throw new MockHttpError('validation_failed', 'A reason is required.', { fieldErrors: { reason: ['Required'] } })
      let updated: Approval | undefined
      await write(['approvals', 'nav-summary'], async (d) => {
        const item = await d.approvals.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Approval not found.')
        updated = { ...item, status: 'rejected' as const, rejectReason: input.reason ?? null }
        await d.approvals.put(updated)
      })
      if (!updated) throw new MockHttpError('not_found', 'Approval not found.')
      return json(ApprovalSchema, updated)
    }),
  ),

  http.post(
    `${API}/approvals/:id/snooze`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve')
      let updated: Approval | undefined
      await write(['approvals', 'nav-summary'], async (d) => {
        const item = await d.approvals.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Approval not found.')
        const until = new Date(now().getTime() + 60 * 60 * 1000).toISOString()
        updated = { ...item, status: 'snoozed' as const, snoozedUntil: until }
        await d.approvals.put(updated)
      })
      if (!updated) throw new MockHttpError('not_found', 'Approval not found.')
      return json(ApprovalSchema, updated)
    }),
  ),

  http.post(
    `${API}/approvals/bulk`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve')
      const input = await parseBody(request, BulkApprovalSchema)
      await write(['approvals', 'nav-summary'], async (d) => {
        for (const id of input.ids) {
          const item = await d.approvals.get(id)
          if (!item) continue
          await d.approvals.put({
            ...item,
            status: input.action === 'approve' ? 'approved' : 'rejected',
            rejectReason: input.action === 'reject' ? input.reason ?? 'Bulk reject' : item.rejectReason,
          })
        }
      })
      return json(ApprovalQueueSchema, { items: [], nextCursor: null, total: 0 })
    }),
  ),

  http.get(
    `${API}/ai-activity`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireAiArea(session)
      const url = new URL(request.url)
      const employeeId = url.searchParams.get('employeeId')
      let items = await (await db()).aiActions.orderBy('createdAt').reverse().toArray()
      if (employeeId) items = items.filter((item) => item.employeeId === employeeId)
      return json(z.array(AiActionRecordSchema), items.slice(0, 80))
    }),
  ),

  http.get(
    `${API}/transcripts`,
    route(async () => {
      const session = await loadSession()
      await requireAiArea(session)
      return json(TranscriptListSchema, await (await db()).transcriptSamples.toArray())
    }),
  ),

  http.post(
    `${API}/transcripts/:id/rate`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'ai.approve')
      const input = await parseBody(request, TranscriptRateSchema)
      let updated: TranscriptSample | undefined
      await write(['transcripts'], async (d) => {
        const item = await d.transcriptSamples.get(String(params.id))
        if (!item) throw new MockHttpError('not_found', 'Sample not found.')
        updated = { ...item, rating: input.rating, notes: input.notes ?? item.notes }
        await d.transcriptSamples.put(updated)
      })
      if (!updated) throw new MockHttpError('not_found', 'Sample not found.')
      return json(TranscriptSampleSchema, updated)
    }),
  ),
]

function zArrayVersions() {
  return EmployeeVersionSchema.array()
}
