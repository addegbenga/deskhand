import { getMarketPack, LEGAL_VERSIONS } from '@deskhand/config'
import type { Contact, MarketCode } from '@deskhand/schemas'
import { consentText, disclosureText } from './onboarding/wording'
import { DAY, HOUR } from './clock'
import type {
  AiIncidentRecord,
  AuditEventRecord,
  ComplianceStateRecord,
  ConsentLedgerRecord,
  ConsentWordingRecord,
  DsarRecord,
  LegalAcceptanceRecord,
  SupportAccessRecord,
  SuppressionRecord,
} from './db'

export function buildGovernanceExtras(input: {
  scenarioId: string
  accountId: string
  business: string
  employeeName: string
  market: MarketCode
  ownerName: string
  contacts: Contact[]
  iso: (offset: number) => string
  empty: boolean
  complianceBlocking: boolean
}) {
  const { scenarioId, accountId, business, employeeName, market, ownerName, contacts, iso, empty, complianceBlocking } = input
  const pack = getMarketPack(market)
  const disclosure = disclosureText(business, employeeName)
  const consent = consentText(business, market)

  const complianceState: ComplianceStateRecord[] = [
    {
      id: accountId,
      accountId,
      disclosureVerified: !empty && !complianceBlocking,
      disclosureByLang: { en: disclosure, pcm: disclosure },
      storedNotice: 'Conversations are stored and may be reviewed by the team.',
      consentWording: consent,
      marketingWordingReady: true,
      smsConsentConfigured: true,
      recordingEnabled: false,
      recordingNotice: 'This conversation may be recorded to improve service.',
      allPartyAcknowledged: market !== 'US',
      staffMonitoringAcceptedAt: iso(-40 * DAY),
      legalHold: false,
      regionChangeRequested: false,
      prohibitedUsesAcceptedAt: empty ? null : iso(-100 * DAY),
      regulatorRegistered: false,
      lastDisclosureTest: complianceBlocking
        ? null
        : { at: iso(-2 * DAY), channel: 'whatsapp', language: 'en', appeared: true },
      retention: { messages: 365, recordings: 90, contacts: 730, bookings: 730, reviews: 365, audit: 365, backups: 30 },
    },
  ]

  const people = contacts.slice(0, 6)
  const consentLedger: ConsentLedgerRecord[] = empty
    ? []
    : people.flatMap((contact, index) =>
        contact.consents.map((row, inner) => ({
          id: `cl_${scenarioId}_${index}_${inner}`,
          accountId,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          purpose: row.channel === 'sms' ? 'marketing' : 'service',
          channel: row.channel,
          status: row.status,
          source: row.source,
          wordingVersion: row.wordingVersion,
          recordedAt: row.recordedAt,
          proof: `msg_${contact.id}_${row.channel}`,
        })),
      )

  const consentWordings: ConsentWordingRecord[] = empty
    ? []
    : [
        {
          id: `cw_${scenarioId}_1`,
          accountId,
          version: 'v3',
          purpose: 'service',
          surface: 'booking_page',
          text: consent,
          createdAt: iso(-20 * DAY),
          current: true,
        },
        {
          id: `cw_${scenarioId}_0`,
          accountId,
          version: 'v2',
          purpose: 'service',
          surface: 'booking_page',
          text: consent,
          createdAt: iso(-80 * DAY),
          current: false,
        },
        {
          id: `cw_${scenarioId}_m`,
          accountId,
          version: 'v1',
          purpose: 'marketing',
          surface: 'forms',
          text: `We will send offers from ${business} only if you opt in. Reply STOP to opt out.`,
          createdAt: iso(-15 * DAY),
          current: true,
        },
      ]

  const opted = contacts.filter((row) => row.optedOut)
  const suppressionList: SuppressionRecord[] = empty
    ? []
    : opted.map((contact, index) => ({
        id: `sup_${scenarioId}_${index}`,
        accountId,
        contactId: contact.id,
        contactName: `${contact.firstName} ${contact.lastName}`,
        channel: 'whatsapp',
        source: 'inbox',
        reason: 'STOP reply',
        createdAt: iso(-5 * DAY),
      }))

  const first = people[0]
  const second = people[1]
  const dsarRequests: DsarRecord[] = empty
    ? []
    : [
        {
          id: `dsar_${scenarioId}_soon`,
          accountId,
          type: 'access',
          requester: first ? `${first.firstName} ${first.lastName}` : 'Ada Customer',
          contactId: first?.id ?? null,
          receivedAt: iso(-(pack.complianceProfile.dsrDays * DAY - 20 * HOUR)),
          status: 'in_progress',
          assignee: ownerName,
        },
        {
          id: `dsar_${scenarioId}_ok`,
          accountId,
          type: 'correct',
          requester: second ? `${second.firstName} ${second.lastName}` : 'Bisi Customer',
          contactId: second?.id ?? null,
          receivedAt: iso(-2 * DAY),
          status: 'verified',
          assignee: ownerName,
        },
        {
          id: `dsar_${scenarioId}_over`,
          accountId,
          type: 'delete',
          requester: 'Chidi Okeke',
          contactId: people[2]?.id ?? null,
          receivedAt: iso(-((pack.complianceProfile.dsrDays + 3) * DAY)),
          status: 'received',
          assignee: null,
        },
      ]

  const legalAcceptances: LegalAcceptanceRecord[] = [
    {
      id: `leg_${scenarioId}_terms`,
      accountId,
      documentId: 'terms',
      version: LEGAL_VERSIONS.terms,
      acceptedAt: empty ? null : iso(-100 * DAY),
      acceptedBy: ownerName,
    },
    {
      id: `leg_${scenarioId}_dpa`,
      accountId,
      documentId: 'dpa',
      version: LEGAL_VERSIONS.dpa,
      acceptedAt: empty ? null : iso(-100 * DAY),
      acceptedBy: ownerName,
    },
    {
      id: `leg_${scenarioId}_privacy`,
      accountId,
      documentId: 'privacy_template',
      version: LEGAL_VERSIONS.dpa,
      acceptedAt: empty ? null : iso(-100 * DAY),
      acceptedBy: ownerName,
    },
    {
      id: `leg_${scenarioId}_sub`,
      accountId,
      documentId: 'sub_processors',
      version: '2026-09',
      acceptedAt: empty ? null : iso(-100 * DAY),
      acceptedBy: ownerName,
    },
  ]

  const supportAccess: SupportAccessRecord[] = empty
    ? []
    : [
        {
          id: `supa_${scenarioId}_1`,
          accountId,
          actor: 'Deskhand support',
          reason: 'Investigate WhatsApp quality',
          status: 'pending',
          expiresAt: null,
          createdAt: iso(-2 * HOUR),
        },
      ]

  const aiIncidents: AiIncidentRecord[] = empty
    ? []
    : [
        {
          id: `inc_${scenarioId}_1`,
          accountId,
          summary: 'Quoted an old price in WhatsApp',
          status: 'resolved',
          createdAt: iso(-12 * DAY),
        },
      ]

  const extraAudit: AuditEventRecord[] = empty
    ? []
    : [
        { id: `aud_${scenarioId}_g1`, accountId, actor: ownerName, action: 'disclosure.verified', target: 'whatsapp/en', createdAt: iso(-2 * DAY) },
        { id: `aud_${scenarioId}_g2`, accountId, actor: ownerName, action: 'dsar.received', target: 'access', createdAt: iso(-20 * HOUR) },
        { id: `aud_${scenarioId}_g3`, accountId, actor: 'system', action: 'consent.recorded', target: first?.id ?? 'contact', createdAt: iso(-3 * DAY) },
      ]

  return {
    complianceState,
    consentLedger,
    consentWordings,
    suppressionList,
    dsarRequests,
    legalAcceptances,
    supportAccess,
    aiIncidents,
    extraAudit,
  }
}
