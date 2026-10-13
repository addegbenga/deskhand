import { http } from 'msw'
import {
  AccessReviewSchema,
  AiGovernanceSchema,
  AiIncidentWriteSchema,
  AuditEventListSchema,
  ComplianceOverviewSchema,
  ConsentCenterSchema,
  DataGovernancePatchSchema,
  DataGovernanceSchema,
  DisclosureCenterSchema,
  DisclosurePatchSchema,
  DisclosureVerifySchema,
  DsarActionSchema,
  DsarPreviewSchema,
  DsarQueueSchema,
  DsarWriteSchema,
  LegalAcceptSchema,
  LegalCenterSchema,
  MarketCodeSchema,
  RecordingCenterSchema,
  RecordingPatchSchema,
  ReconsentWriteSchema,
  SupportAccessActionSchema,
  SuppressionWriteSchema,
  can,
  canSeeArea,
  type Session,
} from '@deskhand/schemas'
import { getMarketPack, LEGAL_VERSIONS, PRIVACY_LAW } from '@deskhand/config'
import { consentText, disclosureText } from '../onboarding/wording'
import { now } from '../clock'
import { blockingIds, computeChecklist, ownerDoesKeys, productDoesKeys, slaFor } from '../compliance-rules'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'
import type { ComplianceStateRecord } from '../db'

const API = '/api'

function iso() {
  return now().toISOString()
}

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function requireView(session: Session) {
  if (!canSeeArea(session.membership.role, 'compliance')) {
    throw new MockHttpError('forbidden', 'Your role cannot do this.', { requiredRole: 'manager' })
  }
}

function requireManage(session: Session) {
  requireCapability(session, 'compliance.manage')
}

async function audit(session: Session, action: string, target: string) {
  const database = await db()
  await database.auditEvents.put({
    id: localId('aud'),
    accountId: session.account.id,
    actor: session.user.name,
    action,
    target,
    createdAt: iso(),
  })
}

async function loadState(accountId: string): Promise<ComplianceStateRecord> {
  const row = await (await db()).complianceState.get(accountId)
  if (!row) throw new MockHttpError('not_found', 'Compliance state missing.')
  return row
}

function previewMarket(url: URL, session: Session) {
  const raw = url.searchParams.get('market')
  if (!raw) return { code: session.account.market, preview: false }
  const parsed = MarketCodeSchema.safeParse(raw)
  if (!parsed.success) return { code: session.account.market, preview: false }
  return { code: parsed.data, preview: parsed.data !== session.account.market }
}

export const complianceHandlers = [
  http.get(
    `${API}/compliance/overview`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireView(session)
      const { code, preview } = previewMarket(new URL(request.url), session)
      const pack = getMarketPack(code)
      const state = await loadState(session.account.id)
      const dsars = await (await db()).dsarRequests.toArray()
      const items = computeChecklist(pack, state, dsars)
      const blocking = blockingIds(items)
      const done = items.filter((row) => row.status === 'done').length
      const alerts = [
        ...items.filter((row) => row.escalate).map((row) => ({ id: row.id, kind: 'dsr_deadline' as const, href: row.fixHref })),
        ...blocking.map((id) => ({ id, kind: 'blocking' as const, href: '/app/compliance/overview' })),
      ]
      return json(ComplianceOverviewSchema, {
        market: code,
        preview,
        law: PRIVACY_LAW[code],
        regulator: pack.complianceProfile.regulator,
        productDoes: productDoesKeys(),
        ownerDoes: ownerDoesKeys(pack),
        readiness: items.length ? Math.round((done / items.length) * 100) : 100,
        blocking,
        items,
        alerts,
        wordingPreview: consentText(session.account.name, code),
        dsrDays: pack.complianceProfile.dsrDays,
      })
    }),
  ),

  http.get(
    `${API}/compliance/disclosure`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const state = await loadState(session.account.id)
      const onboarding = await (await db()).onboarding.get(session.account.id)
      return json(DisclosureCenterSchema, {
        byLanguage: Object.entries(state.disclosureByLang).map(([language, text]) => ({ language, text })),
        verified: state.disclosureVerified,
        lastTest: state.lastDisclosureTest,
        storedNotice: state.storedNotice,
        privacyUrl: '',
        legalName: onboarding?.compliance.legalName || session.account.name,
        privacyEmail: session.user.email,
      })
    }),
  ),

  http.patch(
    `${API}/compliance/disclosure`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const patch = await parseBody(request, DisclosurePatchSchema)
      const state = await loadState(session.account.id)
      const language = patch.language ?? 'en'
      const next: ComplianceStateRecord = {
        ...state,
        disclosureByLang: patch.text ? { ...state.disclosureByLang, [language]: patch.text } : state.disclosureByLang,
        disclosureVerified: patch.verified ?? state.disclosureVerified,
      }
      if (patch.text) next.disclosureVerified = false
      await write(['compliance'], async (d) => {
        await d.complianceState.put(next)
      })
      await audit(session, 'disclosure.updated', language)
      return json(DisclosureCenterSchema, {
        byLanguage: Object.entries(next.disclosureByLang).map(([lang, text]) => ({ language: lang, text })),
        verified: next.disclosureVerified,
        lastTest: next.lastDisclosureTest,
        storedNotice: next.storedNotice,
        privacyUrl: '',
        legalName: session.account.name,
        privacyEmail: session.user.email,
      })
    }),
  ),

  http.post(
    `${API}/compliance/disclosure/verify`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const input = await parseBody(request, DisclosureVerifySchema)
      const state = await loadState(session.account.id)
      const text = state.disclosureByLang[input.language] ?? Object.values(state.disclosureByLang)[0] ?? ''
      const appeared = /AI|assistant/i.test(text)
      const next: ComplianceStateRecord = {
        ...state,
        disclosureVerified: appeared,
        lastDisclosureTest: { at: iso(), channel: input.channel, language: input.language, appeared },
      }
      await write(['compliance'], async (d) => {
        await d.complianceState.put(next)
      })
      await audit(session, appeared ? 'disclosure.verified' : 'disclosure.verify_failed', `${input.channel}/${input.language}`)
      return json(DisclosureCenterSchema, {
        byLanguage: Object.entries(next.disclosureByLang).map(([language, body]) => ({ language, text: body })),
        verified: next.disclosureVerified,
        lastTest: next.lastDisclosureTest,
        storedNotice: next.storedNotice,
        privacyUrl: '',
        legalName: session.account.name,
        privacyEmail: session.user.email,
      })
    }),
  ),

  http.get(
    `${API}/compliance/consent`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireView(session)
      const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
      const pack = getMarketPack(session.account.market)
      const database = await db()
      const ledger = (await database.consentLedger.toArray()).filter((row) =>
        `${row.contactName} ${row.purpose} ${row.channel}`.toLowerCase().includes(q),
      )
      return json(ConsentCenterSchema, {
        ledger,
        wordings: await database.consentWordings.toArray(),
        suppression: await database.suppressionList.toArray(),
        imports: [{ id: 'imp_seed', attestedAt: iso(), basis: 'consent', count: ledger.length }],
        quietHours: pack.complianceProfile.quietHours,
        smsConsentStrict: pack.complianceProfile.smsConsentStrict,
      })
    }),
  ),

  http.post(
    `${API}/compliance/consent/reconsent`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const body = await parseBody(request, ReconsentWriteSchema)
      await audit(session, 'consent.reconsent_started', body.purpose)
      const pack = getMarketPack(session.account.market)
      const database = await db()
      return json(ConsentCenterSchema, {
        ledger: await database.consentLedger.toArray(),
        wordings: await database.consentWordings.toArray(),
        suppression: await database.suppressionList.toArray(),
        imports: [{ id: 'imp_seed', attestedAt: iso(), basis: 'consent', count: 0 }],
        quietHours: pack.complianceProfile.quietHours,
        smsConsentStrict: pack.complianceProfile.smsConsentStrict,
      })
    }),
  ),

  http.post(
    `${API}/compliance/consent/suppression`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const body = await parseBody(request, SuppressionWriteSchema)
      const row = {
        id: localId('sup'),
        accountId: session.account.id,
        contactId: null,
        contactName: body.contactName,
        channel: body.channel,
        source: 'manual',
        reason: body.reason,
        createdAt: iso(),
      }
      await write(['compliance'], async (d) => {
        await d.suppressionList.add(row)
      })
      await audit(session, 'suppression.added', body.contactName)
      const pack = getMarketPack(session.account.market)
      const database = await db()
      return json(ConsentCenterSchema, {
        ledger: await database.consentLedger.toArray(),
        wordings: await database.consentWordings.toArray(),
        suppression: await database.suppressionList.toArray(),
        imports: [],
        quietHours: pack.complianceProfile.quietHours,
        smsConsentStrict: pack.complianceProfile.smsConsentStrict,
      })
    }),
  ),

  http.get(
    `${API}/compliance/recording`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const state = await loadState(session.account.id)
      const pack = getMarketPack(session.account.market)
      return json(RecordingCenterSchema, {
        enabled: state.recordingEnabled,
        notice: state.recordingNotice,
        allPartyConsent: pack.complianceProfile.allPartyConsent,
        allPartyAcknowledged: state.allPartyAcknowledged,
        staffMonitoringAcceptedAt: state.staffMonitoringAcceptedAt,
        whoCanListen: ['owner', 'admin'],
        retentionDays: state.retention.recordings,
      })
    }),
  ),

  http.patch(
    `${API}/compliance/recording`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const patch = await parseBody(request, RecordingPatchSchema)
      const state = await loadState(session.account.id)
      const next: ComplianceStateRecord = {
        ...state,
        recordingEnabled: patch.enabled ?? state.recordingEnabled,
        recordingNotice: patch.notice ?? state.recordingNotice,
        allPartyAcknowledged: patch.allPartyAcknowledged ?? state.allPartyAcknowledged,
        staffMonitoringAcceptedAt: patch.acceptStaffMonitoring ? iso() : state.staffMonitoringAcceptedAt,
      }
      await write(['compliance'], async (d) => {
        await d.complianceState.put(next)
      })
      await audit(session, 'recording.updated', String(next.recordingEnabled))
      const pack = getMarketPack(session.account.market)
      return json(RecordingCenterSchema, {
        enabled: next.recordingEnabled,
        notice: next.recordingNotice,
        allPartyConsent: pack.complianceProfile.allPartyConsent,
        allPartyAcknowledged: next.allPartyAcknowledged,
        staffMonitoringAcceptedAt: next.staffMonitoringAcceptedAt,
        whoCanListen: ['owner', 'admin'],
        retentionDays: next.retention.recordings,
      })
    }),
  ),

  http.get(
    `${API}/compliance/data`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const state = await loadState(session.account.id)
      const pack = getMarketPack(session.account.market)
      return json(DataGovernanceSchema, {
        region: pack.defaultRegion,
        allowedRegions: pack.allowedRegions,
        regionChangeRequested: state.regionChangeRequested,
        legalHold: state.legalHold,
        retention: state.retention,
        documents: [
          { id: 'dpa', available: true },
          { id: 'sub_processors', available: true },
          { id: 'ropo', available: true },
          { id: 'dpia', available: true },
        ],
        jobs: [{ id: 'job_none', kind: 'erasure', status: 'idle', at: iso() }],
      })
    }),
  ),

  http.patch(
    `${API}/compliance/data`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const patch = await parseBody(request, DataGovernancePatchSchema)
      const state = await loadState(session.account.id)
      const next = {
        ...state,
        legalHold: patch.legalHold ?? state.legalHold,
        regionChangeRequested: patch.requestRegionChange ?? state.regionChangeRequested,
      }
      await write(['compliance'], async (d) => {
        await d.complianceState.put(next)
      })
      await audit(session, 'data.updated', next.legalHold ? 'legal_hold' : 'region')
      const pack = getMarketPack(session.account.market)
      return json(DataGovernanceSchema, {
        region: pack.defaultRegion,
        allowedRegions: pack.allowedRegions,
        regionChangeRequested: next.regionChangeRequested,
        legalHold: next.legalHold,
        retention: next.retention,
        documents: [
          { id: 'dpa', available: true },
          { id: 'sub_processors', available: true },
          { id: 'ropo', available: true },
          { id: 'dpia', available: true },
        ],
        jobs: [],
      })
    }),
  ),

  http.get(
    `${API}/compliance/requests`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireView(session)
      const { code } = previewMarket(new URL(request.url), session)
      const pack = getMarketPack(code)
      const rows = await (await db()).dsarRequests.toArray()
      return json(DsarQueueSchema, {
        dsrDays: pack.complianceProfile.dsrDays,
        items: rows.map((row) => {
          const sla = slaFor(row, pack.complianceProfile.dsrDays)
          return {
            id: row.id,
            type: row.type,
            requester: row.requester,
            contactId: row.contactId,
            receivedAt: row.receivedAt,
            dueAt: sla.dueAt,
            status: row.status,
            assignee: row.assignee,
            remainingHours: sla.remainingHours,
            overdue: sla.overdue,
            escalate: sla.escalate,
          }
        }),
      })
    }),
  ),

  http.post(
    `${API}/compliance/requests`,
    route(async ({ request }) => {
      const session = await loadSession()
      if (!can(session.membership.role, 'compliance.manage') && session.membership.role !== 'manager') {
        throw new MockHttpError('forbidden', 'Your role cannot do this.', { requiredRole: 'manager' })
      }
      const input = await parseBody(request, DsarWriteSchema)
      const row = {
        id: localId('dsar'),
        accountId: session.account.id,
        type: input.type,
        requester: input.requester,
        contactId: input.contactId ?? null,
        receivedAt: iso(),
        status: 'received' as const,
        assignee: session.user.name,
      }
      await write(['compliance'], async (d) => {
        await d.dsarRequests.add(row)
      })
      await audit(session, 'dsar.received', input.type)
      const pack = getMarketPack(session.account.market)
      const sla = slaFor(row, pack.complianceProfile.dsrDays)
      return json(DsarQueueSchema, {
        dsrDays: pack.complianceProfile.dsrDays,
        items: [
          {
            ...row,
            dueAt: sla.dueAt,
            remainingHours: sla.remainingHours,
            overdue: sla.overdue,
            escalate: sla.escalate,
          },
        ],
      })
    }),
  ),

  http.patch(
    `${API}/compliance/requests/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireManage(session)
      const input = await parseBody(request, DsarActionSchema)
      const database = await db()
      const before = await database.dsarRequests.get(String(params.id))
      if (!before) throw new MockHttpError('not_found', 'Request not found.')
      const next = { ...before, status: input.status ?? before.status }
      await write(['compliance'], async (d) => {
        await d.dsarRequests.put(next)
      })
      if (next.status === 'completed') await audit(session, 'dsar.completed', next.id)
      const pack = getMarketPack(session.account.market)
      const rows = await (await db()).dsarRequests.toArray()
      return json(DsarQueueSchema, {
        dsrDays: pack.complianceProfile.dsrDays,
        items: rows.map((row) => {
          const sla = slaFor(row, pack.complianceProfile.dsrDays)
          return { ...row, dueAt: sla.dueAt, remainingHours: sla.remainingHours, overdue: sla.overdue, escalate: sla.escalate }
        }),
      })
    }),
  ),

  http.get(
    `${API}/compliance/requests/:id/preview`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireView(session)
      const row = await (await db()).dsarRequests.get(String(params.id))
      if (!row) throw new MockHttpError('not_found', 'Request not found.')
      return json(DsarPreviewSchema, {
        requestId: row.id,
        export: [
          { kind: 'messages', count: 12 },
          { kind: 'bookings', count: 2 },
          { kind: 'payments', count: 1 },
          { kind: 'reviews', count: 1 },
          { kind: 'ai_memory', count: 3 },
        ],
        remove: [
          { kind: 'messages', count: 12 },
          { kind: 'ai_memory', count: 3 },
        ],
        keep: [
          { kind: 'billing', reasonKey: 'legal' },
          { kind: 'audit', reasonKey: 'retention' },
        ],
      })
    }),
  ),

  http.get(
    `${API}/compliance/ai`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const database = await db()
      const employees = await database.employees.toArray()
      const evals = await database.evalResults.toArray()
      const state = await loadState(session.account.id)
      return json(AiGovernanceSchema, {
        matrix: employees.map((employee) => ({
          employeeId: employee.id,
          name: employee.name,
          tools: employee.tools.map((tool) => ({ id: tool.id, autonomy: tool.autonomy })),
          languages: employee.languages.map((lang) => ({ code: lang.code, tier: lang.tier, autonomy: lang.autonomy })),
          lastEval: evals.find((row) => row.employeeId === employee.id)?.passed ?? null,
        })),
        guardrails: [
          { id: 'floor', layer: 'platform', text: 'No medical, legal or financial advice. Escalate instead.' },
          { id: 'biz', layer: 'business', text: 'Do not quote unverified prices.' },
        ],
        incidents: await database.aiIncidents.toArray(),
        prohibitedUsesAcceptedAt: state.prohibitedUsesAcceptedAt,
        transparency: disclosureText(session.account.name, employees[0]?.name ?? 'Ada'),
        killHistory: employees
          .filter((row) => row.killSwitched)
          .map((row) => ({ at: iso(), employee: row.name, action: 'kill' })),
      })
    }),
  ),

  http.post(
    `${API}/compliance/ai/prohibited`,
    route(async () => {
      const session = await loadSession()
      requireManage(session)
      const state = await loadState(session.account.id)
      const next = { ...state, prohibitedUsesAcceptedAt: iso() }
      await write(['compliance'], async (d) => {
        await d.complianceState.put(next)
      })
      await audit(session, 'ai.prohibited_accepted', session.user.name)
      const employees = await (await db()).employees.toArray()
      return json(AiGovernanceSchema, {
        matrix: employees.map((employee) => ({
          employeeId: employee.id,
          name: employee.name,
          tools: employee.tools.map((tool) => ({ id: tool.id, autonomy: tool.autonomy })),
          languages: employee.languages.map((lang) => ({ code: lang.code, tier: lang.tier, autonomy: lang.autonomy })),
          lastEval: null,
        })),
        guardrails: [],
        incidents: await (await db()).aiIncidents.toArray(),
        prohibitedUsesAcceptedAt: next.prohibitedUsesAcceptedAt,
        transparency: '',
        killHistory: [],
      })
    }),
  ),

  http.post(
    `${API}/compliance/ai/incidents`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const input = await parseBody(request, AiIncidentWriteSchema)
      const row = { id: localId('inc'), accountId: session.account.id, summary: input.summary, status: 'open', createdAt: iso() }
      await write(['compliance'], async (d) => {
        await d.aiIncidents.add(row)
      })
      await audit(session, 'ai.incident_reported', input.summary)
      const employees = await (await db()).employees.toArray()
      const state = await loadState(session.account.id)
      return json(AiGovernanceSchema, {
        matrix: employees.map((employee) => ({
          employeeId: employee.id,
          name: employee.name,
          tools: employee.tools.map((tool) => ({ id: tool.id, autonomy: tool.autonomy })),
          languages: employee.languages.map((lang) => ({ code: lang.code, tier: lang.tier, autonomy: lang.autonomy })),
          lastEval: null,
        })),
        guardrails: [],
        incidents: await (await db()).aiIncidents.toArray(),
        prohibitedUsesAcceptedAt: state.prohibitedUsesAcceptedAt,
        transparency: '',
        killHistory: [],
      })
    }),
  ),

  http.get(
    `${API}/compliance/audit`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireView(session)
      const q = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? ''
      const rows = (await (await db()).auditEvents.toArray())
        .filter((row) => `${row.actor} ${row.action} ${row.target}`.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return json(
        AuditEventListSchema,
        rows.map((row) => ({ id: row.id, actor: row.actor, action: row.action, target: row.target, createdAt: row.createdAt })),
      )
    }),
  ),

  http.get(
    `${API}/compliance/access`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const database = await db()
      const members = await database.memberships.toArray()
      const users = await database.users.toArray()
      const sessions = await database.deviceSessions.toArray()
      return json(AccessReviewSchema, {
        members: members.map((row) => {
          const user = users.find((item) => item.id === row.userId)
          const last = sessions.find((item) => item.current)?.lastActiveAt ?? iso()
          return {
            id: row.id,
            name: user?.name ?? row.userId,
            role: row.role,
            lastActiveAt: last,
            locations: row.locationIds.length ? row.locationIds.join(', ') : 'all',
          }
        }),
        support: await database.supportAccess.toArray(),
        breachNoteKeys: ['notify_us', 'owner_duty'],
      })
    }),
  ),

  http.post(
    `${API}/compliance/access/support/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireManage(session)
      const input = await parseBody(request, SupportAccessActionSchema)
      const database = await db()
      const row = await database.supportAccess.get(String(params.id))
      if (!row) throw new MockHttpError('not_found', 'Request not found.')
      const next = {
        ...row,
        status: input.decision === 'approve' ? ('active' as const) : ('ended' as const),
        expiresAt: input.decision === 'approve' ? new Date(now().getTime() + 2 * 60 * 60 * 1000).toISOString() : iso(),
      }
      await write(['compliance'], async (d) => {
        await d.supportAccess.put(next)
      })
      await audit(session, `support.${input.decision}`, row.actor)
      const members = await (await db()).memberships.toArray()
      const users = await (await db()).users.toArray()
      return json(AccessReviewSchema, {
        members: members.map((row) => ({
          id: row.id,
          name: users.find((item) => item.id === row.userId)?.name ?? row.userId,
          role: row.role,
          lastActiveAt: iso(),
          locations: 'all',
        })),
        support: await (await db()).supportAccess.toArray(),
        breachNoteKeys: ['notify_us', 'owner_duty'],
      })
    }),
  ),

  http.get(
    `${API}/compliance/legal`,
    route(async () => {
      const session = await loadSession()
      requireView(session)
      const pack = getMarketPack(session.account.market)
      const docs = await (await db()).legalAcceptances.toArray()
      return json(LegalCenterSchema, {
        documents: docs.map((row) => ({
          id: row.documentId,
          version: row.version,
          acceptedAt: row.acceptedAt,
          acceptedBy: row.acceptedBy,
          addendum: row.documentId.startsWith('addendum'),
        })),
        pendingChange: false,
        marketAddenda: pack.complianceProfile.ownerMustRegister ? ['ndpa'] : pack.code === 'UK' ? ['uk_addendum'] : [],
      })
    }),
  ),

  http.post(
    `${API}/compliance/legal/accept`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireManage(session)
      const input = await parseBody(request, LegalAcceptSchema)
      const database = await db()
      const row = (await database.legalAcceptances.toArray()).find((item) => item.documentId === input.id)
      if (!row) throw new MockHttpError('not_found', 'Document not found.')
      const next = { ...row, acceptedAt: iso(), acceptedBy: session.user.name, version: LEGAL_VERSIONS.terms }
      await write(['compliance'], async (d) => {
        await d.legalAcceptances.put(next)
      })
      await audit(session, 'legal.accepted', input.id)
      const docs = await (await db()).legalAcceptances.toArray()
      return json(LegalCenterSchema, {
        documents: docs.map((item) => ({
          id: item.documentId,
          version: item.version,
          acceptedAt: item.acceptedAt,
          acceptedBy: item.acceptedBy,
          addendum: false,
        })),
        pendingChange: false,
        marketAddenda: [],
      })
    }),
  ),
]
