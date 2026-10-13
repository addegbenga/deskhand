import { getMarketPack } from '@deskhand/config'
import {
  capAutonomy,
  type Approval,
  type CreatedBy,
  type Employee,
  type EmployeeVersion,
  type EvalResult,
  type KnowledgeItem,
  type TrainingQuestion,
  type TranscriptSample,
} from '@deskhand/schemas'
import { DAY, HOUR, MINUTE } from './clock'
import { employeeWarnings } from './ai-engine'
import type { ScenarioDefinition, ScenarioId } from './scenarios'

export function buildAiExtras(input: {
  scenarioId: ScenarioId
  scenario: ScenarioDefinition
  accountId: string
  locationId: string
  ownerId: string
  ai: CreatedBy
  person: CreatedBy
  iso: (offset: number) => string
  empty: boolean
  contacts: { firstName: string; lastName: string }[]
  conversations: { id: string }[]
  approvals: Approval[]
}) {
  const { scenarioId, scenario, accountId, locationId, ownerId, ai, person, iso, empty } = input
  if (empty || !scenario.employeeName) {
    return {
      employees: [] as Employee[],
      employeeVersions: [] as EmployeeVersion[],
      knowledgeItems: [] as KnowledgeItem[],
      trainingInbox: [] as TrainingQuestion[],
      evalResults: [] as EvalResult[],
      transcriptSamples: [] as TranscriptSample[],
      approvals: input.approvals,
    }
  }

  const pack = getMarketPack(scenario.market)
  const languages = pack.conversationLanguages.slice(0, 3).map((lang) => ({
    code: lang.code,
    tier: lang.tier,
    autonomy: capAutonomy(lang.tier, scenario.aiMode === 'on' ? 'approve' : 'suggest'),
  }))
  const moneyToolAutonomy = scenario.aiMode === 'on' ? ('approve' as const) : ('suggest' as const)

  const disclosure =
    scenario.market === 'UK' || scenario.market === 'EU'
      ? "Hi, I'm an AI assistant for this business."
      : `Hi, I'm ${scenario.employeeName}, an AI assistant for ${scenario.business}.`

  const knowledgeItems: KnowledgeItem[] = [
    {
      id: `kn_${scenarioId}_profile`,
      accountId,
      collection: 'profile',
      title: 'About the business',
      answer: `${scenario.business} is a salon. We specialise in knotless braids, cornrows and silk press.`,
      language: 'en',
      locationId,
      status: 'verified',
      source: 'owner',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: false,
      createdAt: iso(-45 * DAY),
      createdBy: person,
    },
    {
      id: `kn_${scenarioId}_svc_unverified`,
      accountId,
      collection: 'services',
      title: 'Knotless braids (price placeholder)',
      answer: 'Medium knotless braids are ₦35,000 and take about 5 hours.',
      language: 'en',
      locationId,
      status: 'unverified',
      source: 'pack',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: true,
      createdAt: iso(-40 * DAY),
      createdBy: ai,
    },
    {
      id: `kn_${scenarioId}_svc_ok`,
      accountId,
      collection: 'services',
      title: 'Cornrows',
      answer: 'Cornrows start at ₦15,000 and usually take about 90 minutes.',
      language: 'en',
      locationId,
      status: 'verified',
      source: 'owner',
      pinned: { pcm: 'Cornrows start from ₦15,000, e take about 90 minutes.' },
      autoTranslated: false,
      expiresAt: null,
      containsPrice: true,
      createdAt: iso(-20 * DAY),
      createdBy: person,
    },
    {
      id: `kn_${scenarioId}_pol`,
      accountId,
      collection: 'policies',
      title: 'Cancellation',
      answer: 'Please cancel at least 24 hours ahead or the deposit is kept.',
      language: 'en',
      locationId: null,
      status: 'verified',
      source: 'owner',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: false,
      createdAt: iso(-18 * DAY),
      createdBy: person,
    },
    {
      id: `kn_${scenarioId}_hours`,
      accountId,
      collection: 'locations',
      title: 'Opening hours',
      answer: 'Open Monday to Saturday 9am–6pm Lagos time. Closed Sundays and public holidays.',
      language: 'en',
      locationId,
      status: 'verified',
      source: 'owner',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: false,
      createdAt: iso(-30 * DAY),
      createdBy: person,
    },
    {
      id: `kn_${scenarioId}_faq`,
      accountId,
      collection: 'faqs',
      title: 'Do I bring my own hair?',
      answer: 'You can bring your own hair, or we can sell packs in the salon.',
      language: 'en',
      locationId: null,
      status: 'verified',
      source: 'owner',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: false,
      createdAt: iso(-12 * DAY),
      createdBy: person,
    },
    {
      id: `kn_${scenarioId}_promo`,
      accountId,
      collection: 'promotions',
      title: 'Back to school twist',
      answer: '10% off group twist class until 30 October.',
      language: 'en',
      locationId,
      status: 'needs_review',
      source: 'owner',
      pinned: {},
      autoTranslated: false,
      expiresAt: iso(20 * DAY),
      containsPrice: true,
      createdAt: iso(-4 * DAY),
      createdBy: ai,
    },
    {
      id: `kn_${scenarioId}_dns`,
      accountId,
      collection: 'do_not_say',
      title: 'Medical claims',
      answer: 'Never claim braids treat scalp conditions.',
      language: 'en',
      locationId: null,
      status: 'verified',
      source: 'pack',
      pinned: {},
      autoTranslated: false,
      expiresAt: null,
      containsPrice: false,
      createdAt: iso(-50 * DAY),
      createdBy: ai,
    },
  ]

  const tools: Employee['tools'] = [
    { id: 'answer_faqs', enabled: true, autonomy: scenario.aiMode === 'on' ? 'autopilot' : 'suggest' },
    { id: 'qualify_leads', enabled: true, autonomy: 'approve' },
    { id: 'book', enabled: true, autonomy: moneyToolAutonomy },
    { id: 'update_crm', enabled: true, autonomy: 'approve' },
    { id: 'send_payment_link', enabled: true, autonomy: 'approve' },
  ]

  const employee: Employee = {
    id: `emp_${scenarioId}_1`,
    accountId,
    locationId,
    kind: 'chat',
    name: scenario.employeeName,
    role: 'Receptionist',
    template: 'receptionist',
    status: scenario.aiMode === 'off' || scenario.aiMode === 'manual' ? 'paused' : 'live',
    tone: 'warm',
    greeting: `Hi, this is ${scenario.employeeName} at ${scenario.business}.`,
    signOff: `${scenario.employeeName} · ${scenario.business}`,
    disclosure,
    emoji: false,
    languages,
    channels: ['whatsapp', 'webchat', 'email'],
    hours: 'business',
    afterHours: 'message',
    collectionIds: ['profile', 'services', 'policies', 'faqs', 'locations'],
    neverSay: ['medical advice', 'competitor prices'],
    escalateTopics: ['anger', 'legal', 'medical', 'refunds', 'human requested'],
    tools,
    discountLimit: null,
    handoffUserId: ownerId,
    quietHours: true,
    killSwitched: false,
    conversationsThisMonth: 128,
    handoffRate: 0.12,
    costThisMonth: 18400,
    currency: pack.currency,
    version: 3,
    warnings: [],
    voiceUseCase: null,
    voiceId: null,
    recordingEnabled: false,
    recordingNotice: '',
    maxCallMinutes: 8,
    transferNumber: null,
    outboundAllowed: false,
    phoneSource: null,
    phoneNumber: null,
    phoneStatus: 'none',
    pronunciation: '',
    createdAt: iso(-90 * DAY),
    createdBy: person,
  }
  employee.warnings = employeeWarnings(employee, knowledgeItems)

  const voice: Employee = {
    ...employee,
    id: `emp_${scenarioId}_voice`,
    kind: 'voice',
    name: `${scenario.employeeName} Voice`,
    role: 'Inbound receptionist',
    template: 'inbound',
    status: 'draft',
    channels: ['voice'],
    voiceUseCase: 'inbound',
    voiceId: 'ng-warm-f',
    recordingEnabled: false,
    recordingNotice: 'This call may be recorded so the team can follow up.',
    conversationsThisMonth: 0,
    handoffRate: 0,
    costThisMonth: 0,
    version: 1,
    createdAt: iso(-2 * DAY),
  }
  voice.warnings = employeeWarnings(voice, knowledgeItems)

  const snapshot = { ...employee }
  const versions: EmployeeVersion[] = [
    {
      id: `ver_${scenarioId}_1`,
      accountId,
      employeeId: employee.id,
      number: 1,
      summary: 'Created from receptionist template',
      reason: null,
      snapshot: { ...snapshot, version: 1, status: 'draft' },
      createdAt: iso(-90 * DAY),
      createdBy: person,
    },
    {
      id: `ver_${scenarioId}_2`,
      accountId,
      employeeId: employee.id,
      number: 2,
      summary: 'Hours set to business; payment links on Approve',
      reason: null,
      snapshot: { ...snapshot, version: 2 },
      createdAt: iso(-40 * DAY),
      createdBy: person,
    },
    {
      id: `ver_${scenarioId}_3`,
      accountId,
      employeeId: employee.id,
      number: 3,
      summary: 'Went live in Approve mode',
      reason: 'Owner reviewed sandbox evals',
      snapshot,
      createdAt: iso(-30 * DAY),
      createdBy: person,
    },
  ]

  const trainingInbox: TrainingQuestion[] = [
    {
      id: `tr_${scenarioId}_1`,
      accountId,
      topic: 'Home service',
      question: 'Do you come to the house for braids?',
      askedCount: 6,
      draftAnswer: 'We do not currently offer home service. All appointments are in the salon.',
      createdAt: iso(-2 * DAY),
      createdBy: ai,
    },
    {
      id: `tr_${scenarioId}_2`,
      accountId,
      topic: 'Kids',
      question: 'Do you braid children under 8?',
      askedCount: 3,
      draftAnswer: 'We braid from age 8 with a guardian present.',
      createdAt: iso(-5 * DAY),
      createdBy: ai,
    },
    {
      id: `tr_${scenarioId}_3`,
      accountId,
      topic: 'Home service',
      question: 'Can you come to my hotel in Victoria Island?',
      askedCount: 2,
      draftAnswer: 'We do not travel for hotel or home appointments. Book a chair in the salon.',
      createdAt: iso(-1 * DAY),
      createdBy: ai,
    },
  ]

  const suites = ['grounding', 'handoff', 'disclosure', 'opt_out', 'injection', 'policy'] as const
  const evalResults: EvalResult[] = employee.languages.flatMap((lang) =>
    suites.map((suite, si) => ({
      id: `ev_${scenarioId}_${lang.code}_${suite}`,
      employeeId: employee.id,
      version: 3,
      language: lang.code,
      suite,
      passed: !(lang.tier === 'C' && suite === 'grounding'),
      score: lang.tier === 'A' ? 92 - si : lang.tier === 'B' ? 78 - si : 54 - si,
    })),
  )

  const transcriptSamples: TranscriptSample[] = [0, 1, 2, 3, 4].map((index) => ({
    id: `ts_${scenarioId}_${index + 1}`,
    accountId,
    employeeId: employee.id,
    conversationId: input.conversations[index]?.id ?? `c_${index}`,
    contactName: input.contacts[index] ? `${input.contacts[index]!.firstName} ${input.contacts[index]!.lastName}` : 'Guest',
    excerpt: index === 3 ? 'Customer asked to speak to a person after a price quote.' : 'Asked about Saturday availability for cornrows.',
    flag: index === 2 ? 'low_confidence' : index === 3 ? 'customer' : 'random',
    rating: null,
    notes: '',
    createdAt: iso(-(index + 1) * 6 * HOUR),
    createdBy: ai,
  }))

  const kinds: Approval['kind'][] = ['reply', 'payment_link', 'post', 'review_reply', 'bulk', 'discount']
  const channels: Approval['channel'][] = ['whatsapp', 'whatsapp', 'instagram', 'email', 'whatsapp', 'whatsapp']
  const drafts: Record<Approval['kind'], string> = {
    reply: 'Saturday 10am with Tola is free — shall I book cornrows?',
    payment_link: 'Here is a ₦5,000 deposit link to hold your Saturday slot.',
    post: 'New: weekday cornrows from ₦15,000. Book on WhatsApp.',
    review_reply: "Thank you for the kind words — we'll share this with Tola.",
    bulk: 'Reminder: you have a 10am appointment tomorrow. Reply STOP to opt out.',
    discount: 'Customer asked for 20% off a bridal party. Suggested cap is 0%.',
  }
  const reasons: Record<Approval['kind'], string> = {
    reply: 'Booking tool is on Approve',
    payment_link: 'Money movement needs a person',
    post: 'Public posts always need approval',
    review_reply: 'Public reply',
    bulk: 'Bulk send',
    discount: 'Discount above the employee limit',
  }

  const approvals: Approval[] = input.approvals.map((item, index) => {
    const kind = kinds[index % kinds.length]!
    return {
      ...item,
      employeeId: employee.id,
      kind,
      contactName: input.contacts[index] ? `${input.contacts[index]!.firstName} ${input.contacts[index]!.lastName}` : 'Guest',
      draft: drafts[kind],
      reason: reasons[kind],
      snoozedUntil: null,
      rejectReason: null,
      channel: channels[index % channels.length],
      conversationId: kind === 'post' || kind === 'review_reply' ? null : item.conversationId,
    }
  })

  return {
    employees: [employee, voice],
    employeeVersions: versions,
    knowledgeItems,
    trainingInbox,
    evalResults,
    transcriptSamples,
    approvals,
  }
}

export { MINUTE }
