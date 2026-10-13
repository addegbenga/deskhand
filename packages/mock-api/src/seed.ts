import { Faker, base, en, en_GB, en_NG, en_US } from '@faker-js/faker'
import { getMarketPack } from '@deskhand/config'
import type {
  Account,
  Approval,
  ChannelKind,
  Contact,
  Conversation,
  CreatedBy,
  Invitation,
  Location,
  MarketCode,
  Membership,
  Notification,
  OnboardingState,
  Role,
  Task,
  User,
} from '@deskhand/schemas'
import { DAY, HOUR, MINUTE, now } from './clock'
import type { ConnectionRecord, TableName } from './db'
import { completedOnboarding, createOnboardingState } from './onboarding/state'
import { SCENARIOS, type ScenarioDefinition, type ScenarioId } from './scenarios'
import { buildAiExtras } from './seed-ai'
import { buildBookingExtras } from './seed-booking'
import { buildCrmExtras, enrichContact, plantDuplicates } from './seed-crm'
import { buildGrowExtras } from './seed-grow'
import { buildInsightExtras } from './seed-insight'
import { buildSettingsExtras } from './seed-settings'
import { buildGovernanceExtras } from './seed-governance'

export type SeedData = { [K in TableName]: unknown[] } & {
  accounts: Account[]
  locations: Location[]
  users: User[]
  memberships: Membership[]
  contacts: Contact[]
  conversations: Conversation[]
  approvals: Approval[]
  notifications: Notification[]
  connections: ConnectionRecord[]
  invitations: Invitation[]
  onboarding: OnboardingState[]
}

/** Demo invitation links (PRD 12.4). Documented in the README. */
export const DEMO_INVITES = { pending: 'join-amaka-braids', expired: 'expired-invite', revoked: 'revoked-invite' }

const LOCALES = { NG: en_NG, GH: en_NG, KE: en, ZA: en, UK: en_GB, EU: en_GB, US: en_US } satisfies Record<MarketCode, unknown>
const SEEDS: Record<ScenarioId, number> = { A: 101, B: 202, C: 303, D: 404, E: 505, F: 606, G: 707 }

/** Realistic inbound previews per vertical. Customer content, not UI copy. */
const PREVIEWS: Record<ScenarioDefinition['industry'], string[]> = {
  salon: [
    'Hi, how much is knotless braids medium length?',
    'Good morning, do you have space this Saturday by 10am?',
    'Abeg how much for small cornrows? I wan come tomorrow',
    "I booked for 2pm but I'll be 20 minutes late, is that ok?",
    'Can I pay the deposit by transfer?',
    'The braids from last week are already loosening, not happy',
    'Do you do home service in Lekki?',
    'Thank you, the style came out beautiful!',
    'Wetin be your price for passion twist?',
    'Please send your account details for the deposit',
  ],
  clinic: [
    "I'd like to book a scaling and polishing",
    'Do you accept HMO?',
    'My tooth has been aching since yesterday',
    'What time do you close on Saturdays?',
    'Can I reschedule my appointment to next week?',
    'How much is teeth whitening?',
  ],
  barber: [
    'Any slots for a skin fade today?',
    'How much for a beard trim?',
    'Running 10 mins late, sorry mate',
    'Do you take walk-ins on Sunday?',
    'Can I book for me and my son at 4?',
  ],
  real_estate: [
    'Is the 3-bed on Elm St still available?',
    'Can I schedule a viewing this weekend?',
    "What's the HOA fee on the Mueller townhome?",
    "I'm pre-approved, can we talk offers?",
    'Do you handle rentals too?',
  ],
  bakery: ['Do you make custom birthday cakes?', 'How much is a 2-tier wedding cake?'],
}

const SERVICES: Record<ScenarioDefinition['industry'], string[]> = {
  salon: ['Knotless braids', 'Cornrows', 'Passion twist', 'Silk press', 'Wig install'],
  clinic: ['Scaling and polishing', 'Teeth whitening', 'Consultation', 'Filling'],
  barber: ['Skin fade', 'Beard trim', 'Kids cut', 'Hot towel shave'],
  real_estate: ['Property viewing', 'Listing consultation', 'Buyer consultation'],
  bakery: ['Birthday cake', 'Wedding cake'],
}

const PRICES: Record<MarketCode, number[]> = {
  NG: [15000, 25000, 35000, 8000, 45000],
  GH: [250, 400, 600],
  KE: [2500, 4000, 6500],
  ZA: [350, 550, 900],
  UK: [25, 35, 18, 45],
  EU: [30, 40, 55],
  US: [150, 250, 500],
}

function phoneFor(market: MarketCode, faker: Faker): string {
  const digits = (n: number) => faker.string.numeric(n)
  switch (market) {
    case 'NG':
      return `+234 ${faker.helpers.arrayElement(['803', '806', '813', '816', '703', '708', '810', '902'])} ${digits(3)} ${digits(4)}`
    case 'UK':
      return `+44 7${digits(3)} ${digits(6)}`
    case 'US':
      return `+1 512 ${digits(3)} ${digits(4)}`
    default:
      return `${getMarketPack(market).phoneCountryCode} ${digits(3)} ${digits(3)} ${digits(3)}`
  }
}

function emailFor(name: string, domain: string) {
  return `${name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@${domain}`
}

export function generateSeed(scenarioId: ScenarioId): SeedData {
  const scenario = SCENARIOS[scenarioId]
  const pack = getMarketPack(scenario.market)
  const faker = new Faker({ locale: [LOCALES[scenario.market], en, base] })
  faker.seed(SEEDS[scenarioId])

  const t0 = now().getTime()
  const iso = (offsetMs: number) => new Date(t0 + offsetMs).toISOString()
  const accountId = `acc_${scenario.slug}`
  const domain = `${scenario.slug.replace(/-/g, '')}.com`
  const person = (user: User): CreatedBy => ({ kind: 'person', id: user.id, name: user.name })
  const ai: CreatedBy = { kind: 'ai_employee', id: 'emp_1', name: scenario.employeeName ?? undefined }

  const locations: Location[] = scenario.locations.map((loc, index) => ({
    id: `loc_${scenario.slug}_${index + 1}`,
    accountId,
    name: loc.name,
    city: loc.city,
    address: loc.address,
    timezone: pack.defaultTimezone,
    currency: pack.currency,
    locale: pack.locale,
    market: scenario.market,
    phone: phoneFor(scenario.market, faker),
    createdAt: iso(-120 * DAY),
    createdBy: { kind: 'person' },
  }))

  const roles: Role[] = ['owner', 'admin', 'manager', 'staff', 'readonly']
  const titles: Record<Role, string> = {
    owner: 'Owner',
    admin: 'Operations lead',
    manager: 'Front desk lead',
    staff: scenario.industry === 'real_estate' ? 'Agent' : scenario.industry === 'clinic' ? 'Dental nurse' : 'Stylist',
    readonly: 'Accountant',
  }
  const users: User[] = roles.map((role) => ({
    id: `usr_${scenario.slug}_${role}`,
    name: scenario.team[role],
    email: emailFor(scenario.team[role], domain),
    phone: phoneFor(scenario.market, faker),
    locale: 'en',
    createdAt: iso(-120 * DAY),
  }))
  const memberships: Membership[] = roles.map((role, index) => ({
    id: `mem_${scenario.slug}_${role}`,
    accountId,
    userId: users[index]!.id,
    role,
    locationIds: role === 'staff' && locations.length > 1 ? [locations[0]!.id] : [],
    title: titles[role],
  }))
  const owner = users[0]!
  const manager = users[2]!
  const staff = users[3]!

  const account: Account = {
    id: accountId,
    name: scenario.business,
    slug: scenario.slug,
    industry: scenario.industry,
    market: scenario.market,
    region: pack.defaultRegion,
    state: scenario.state,
    plan: scenario.plan,
    aiMode: scenario.aiMode,
    trialEndsAt: scenario.state === 'trial' ? iso(9 * DAY) : null,
    graceEndsAt: scenario.state === 'past_due' ? iso(3 * DAY) : null,
    suspensionReason: null,
    milestones: scenario.milestones,
    brandColor: scenario.brandColor,
    showPoweredBy: true,
    createdAt: iso(-120 * DAY),
    createdBy: person(owner),
  }

  const empty = scenario.volume === 'empty'
  const contactSources: CreatedBy[] = [
    person(owner),
    { kind: 'booking_page' },
    { kind: 'form' },
    { kind: 'import' },
    ...(scenario.employeeName ? [ai, ai] : []),
  ]
  const tags = ['VIP', 'New', 'Returning', 'Deposit paid', 'Referral', 'Instagram']

  const contacts: Contact[] = empty
    ? []
    : Array.from({ length: 150 }, (_, index) => {
        const firstName = faker.person.firstName()
        const lastName = faker.person.lastName()
        const location = faker.helpers.arrayElement(locations)
        return {
          id: `con_${scenarioId}_${index + 1}`,
          accountId,
          locationId: location.id,
          firstName,
          lastName,
          phone: phoneFor(scenario.market, faker),
          email: faker.datatype.boolean(0.6) ? emailFor(`${firstName} ${lastName}`, faker.helpers.arrayElement(['gmail.com', 'yahoo.com', 'outlook.com'])) : null,
          tags: faker.helpers.arrayElements(tags, { min: 0, max: 2 }),
          language: scenario.market === 'NG' && faker.datatype.boolean(0.25) ? 'pcm' : pack.conversationLanguages[0]!.code,
          assignedUserId: faker.datatype.boolean(0.3) ? staff.id : null,
          createdAt: iso(-faker.number.int({ min: 1, max: 110 }) * DAY),
          createdBy: faker.helpers.arrayElement(contactSources),
          companyId: null,
        }
      }).map((contact, index) =>
        enrichContact(contact, index, scenario, (Object.entries(pack.channels) as [ChannelKind, boolean][])
          .filter(([, on]) => on)
          .map(([kind]) => kind), iso, faker),
      )
  if (!empty) plantDuplicates(contacts)
  if (contacts[0]) {
    contacts[0].customFields = { ...contacts[0].customFields, prefToken: `pref-${scenario.slug}` }
  }

  const companies = empty
    ? []
    : [
        {
          id: `co_${scenarioId}_glow`,
          accountId,
          locationId: locations[0]!.id,
          name: 'Glow Media',
          notes: 'Agency referrals and partnership bookings.',
          createdAt: iso(-80 * DAY),
          createdBy: person(owner),
        },
        {
          id: `co_${scenarioId}_heritage`,
          accountId,
          locationId: locations[0]!.id,
          name: 'Heritage Estates',
          notes: 'Staff and family accounts.',
          createdAt: iso(-40 * DAY),
          createdBy: person(owner),
        },
      ]
  if (companies[0] && companies[1]) {
    contacts.forEach((contact, index) => {
      if (index % 12 === 0) contact.companyId = companies[0]!.id
      else if (index % 17 === 0) contact.companyId = companies[1]!.id
    })
  }
  const smartLists = empty
    ? []
    : [
        {
          id: `sl_${scenarioId}_vip`,
          accountId,
          name: 'VIP',
          filters: { tag: 'VIP' },
          createdAt: iso(-12 * DAY),
          createdBy: person(owner),
        },
        {
          id: `sl_${scenarioId}_wa`,
          accountId,
          name: 'WhatsApp',
          filters: { source: 'whatsapp' as const },
          createdAt: iso(-11 * DAY),
          createdBy: person(owner),
        },
        {
          id: `sl_${scenarioId}_booked`,
          accountId,
          name: 'Booked',
          filters: { stage: 'Booked' },
          createdAt: iso(-10 * DAY),
          createdBy: person(owner),
        },
        {
          id: `sl_${scenarioId}_4c`,
          accountId,
          name: 'Hair type 4C',
          filters: { fieldKey: 'hairType', fieldValue: '4C' },
          createdAt: iso(-9 * DAY),
          createdBy: person(owner),
        },
        {
          id: `sl_${scenarioId}_30d`,
          accountId,
          name: 'Active 30 days',
          filters: { since: '30d' as const },
          createdAt: iso(-8 * DAY),
          createdBy: person(owner),
        },
      ]

  const enabledChannels = (Object.entries(pack.channels) as [Conversation['channel'], boolean][])
    .filter(([kind, on]) => on && ['whatsapp', 'webchat', 'email', 'sms', 'instagram'].includes(kind))
    .map(([kind]) => kind)
  const statuses: Conversation['status'][] =
    scenario.aiMode === 'manual' || scenario.aiMode === 'off'
      ? ['open', 'open', 'open', 'snoozed', 'closed']
      : ['open', 'needs_human', 'ai_handled', 'ai_handled', 'snoozed', 'closed']

  const aiOn = scenario.aiMode === 'on' || scenario.aiMode === 'suggest_only'
  const conversations: Conversation[] = empty
    ? []
    : Array.from({ length: 40 }, (_, index) => {
        const contact = index === 2 && contacts[2] ? contacts[2] : contacts[Math.min(index * 3, contacts.length - 1)]!
        const status = faker.helpers.arrayElement(statuses)
        const channel: Conversation['channel'] =
          index === 1 && enabledChannels.includes('whatsapp') ? 'whatsapp' : faker.helpers.arrayElement(enabledChannels)
        const lastInboundAt = iso(-(index === 1 && channel === 'whatsapp' ? 30 * HOUR : index * 47 * MINUTE + faker.number.int({ min: 1, max: 40 }) * MINUTE))
        const preview = faker.helpers.arrayElement(PREVIEWS[scenario.industry])
        return {
          id: `cnv_${scenarioId}_${index + 1}`,
          accountId,
          locationId: contact.locationId,
          contactId: contact.id,
          channel,
          kind: index === 4 ? ('call' as const) : ('chat' as const),
          status: index === 7 && aiOn ? 'needs_human' : status,
          unreadCount: status === 'closed' || index > 14 ? 0 : faker.number.int({ min: 0, max: 3 }),
          assignedUserId: contact.assignedUserId,
          lastMessageAt: lastInboundAt,
          lastMessagePreview: preview,
          lastInboundAt,
          lastDirection: index % 5 === 0 ? ('outbound' as const) : ('inbound' as const),
          language: contact.language,
          aiControl: !aiOn || index === 7 ? ('human' as const) : ('ai' as const),
          snoozedUntil: status === 'snoozed' ? iso(4 * HOUR) : null,
          tags: contact.tags.slice(0, 1),
          draft:
            index === 0 && aiOn
              ? {
                  body: 'Medium knotless braids are ₦35,000 and take about 5 hours. Saturday 10am or 1pm is free — which works for you?',
                  confidence: 'high' as const,
                  employeeName: scenario.employeeName ?? 'Ada',
                  language: contact.language,
                  why: { sources: ['Service: Knotless braids', 'Price list'], rules: ['Ground prices only'], tools: ['lookup_service'] },
                }
              : null,
          recordingNotice: index === 4,
          lockedByName: index === 8 ? manager.name : null,
          createdAt: iso(-faker.number.int({ min: 1, max: 30 }) * DAY),
          createdBy: { kind: 'person' },
        }
      })

  const gapConversation = conversations[10]
  const gapContact = contacts.find((item) => item.id === gapConversation?.contactId)
  if (gapConversation && gapContact && !gapContact.optedOut) {
    gapContact.consents = gapContact.consents.map((row) =>
      row.channel === gapConversation.channel ? { ...row, status: 'missing' as const } : row,
    )
  }

  const aiActive = aiOn
  const approvals: Approval[] =
    empty || !aiActive
      ? []
      : conversations.slice(0, 6).map((conversation, index) => ({
          id: `apr_${scenarioId}_${index + 1}`,
          accountId,
          locationId: conversation.locationId,
          conversationId: conversation.id,
          status: 'pending',
          confidence: faker.helpers.arrayElement(['high', 'high', 'medium', 'low'] as const),
          employeeName: scenario.employeeName ?? '',
          employeeId: null,
          kind: 'reply',
          contactName: '',
          draft: '',
          reason: '',
          snoozedUntil: null,
          rejectReason: null,
          createdAt: iso(-(index + 1) * 9 * MINUTE),
          createdBy: ai,
        }))

  const contactName = (index: number) => {
    const contact = contacts[index]
    return contact ? `${contact.firstName} ${contact.lastName}` : ''
  }
  const service = (index: number) => SERVICES[scenario.industry][index % SERVICES[scenario.industry].length]!
  const price = (index: number) => PRICES[scenario.market][index % PRICES[scenario.market].length]!

  const notificationSeeds: Omit<Notification, 'id' | 'accountId'>[] = empty
    ? [
        {
          kind: 'weekly_digest',
          params: {},
          href: '/app/home',
          read: false,
          createdAt: iso(-10 * MINUTE),
        },
      ]
    : [
        ...(aiActive
          ? [
              {
                kind: 'approval_waiting' as const,
                params: { employee: scenario.employeeName ?? '', contact: contactName(0) },
                href: '/app/ai/approvals',
                read: false,
                createdAt: iso(-6 * MINUTE),
              },
              {
                kind: 'needs_human' as const,
                params: { contact: contactName(3) },
                href: `/app/inbox/${conversations[1]?.id ?? ''}`,
                read: false,
                createdAt: iso(-22 * MINUTE),
              },
            ]
          : []),
        {
          kind: 'booking_new',
          params: { contact: contactName(6), service: service(0), time: iso(1 * DAY + 3 * HOUR) },
          href: '/app/bookings',
          read: false,
          createdAt: iso(-48 * MINUTE),
        },
        {
          kind: 'payment_received',
          params: { contact: contactName(9), amount: price(0), currency: pack.currency },
          href: '/app/payments/list',
          read: false,
          createdAt: iso(-2 * HOUR),
        },
        {
          kind: 'review_negative',
          params: { contact: contactName(12), rating: 2 },
          href: '/app/reputation/reviews',
          read: true,
          createdAt: iso(-5 * HOUR),
        },
        {
          kind: 'booking_cancelled',
          params: { contact: contactName(15), service: service(1) },
          href: '/app/bookings',
          read: true,
          createdAt: iso(-26 * HOUR),
        },
        {
          kind: 'usage_threshold',
          params: { percent: 80, meter: 'ai_replies' },
          href: '/app/settings/usage',
          read: true,
          createdAt: iso(-2 * DAY),
        },
        {
          kind: 'weekly_digest',
          params: {},
          href: '/app/reports/overview',
          read: true,
          createdAt: iso(-4 * DAY),
        },
      ]

  if (scenario.troubles?.calendarTokenExpired) {
    notificationSeeds.unshift({
      kind: 'connection_broken',
      params: { connection: 'google_calendar' },
      href: '/app/connections',
      read: false,
      createdAt: iso(-15 * MINUTE),
    })
  }
  if (scenario.troubles?.templateRejected) {
    notificationSeeds.unshift({
      kind: 'template_status',
      params: { template: scenario.troubles.templateRejected, status: 'rejected' },
      href: '/app/marketing/templates',
      read: false,
      createdAt: iso(-40 * MINUTE),
    })
  }
  if (scenario.troubles?.complianceBlocking) {
    notificationSeeds.unshift({
      kind: 'compliance_alert',
      params: { item: 'ai_disclosure' },
      href: '/app/compliance/overview',
      read: false,
      createdAt: iso(-3 * MINUTE),
    })
  }

  const notifications: Notification[] = notificationSeeds.map((n, index) => ({
    ...n,
    id: `ntf_${scenarioId}_${index + 1}`,
    accountId,
  }))

  const connections: ConnectionRecord[] = empty
    ? []
    : enabledChannels.map((kind) => ({
        id: `cxn_${scenarioId}_${kind}`,
        accountId,
        kind: kind as ConnectionRecord['kind'],
        health:
          kind === 'whatsapp' && scenario.troubles?.whatsappQualityLow
            ? 'degraded'
            : kind === 'email' && scenarioId === 'A'
              ? 'degraded'
              : 'healthy',
        problem:
          kind === 'whatsapp' && scenario.troubles?.whatsappQualityLow
            ? 'quality_low'
            : kind === 'email' && scenarioId === 'A'
              ? 'dns_unverified'
              : null,
      }))
  if (!empty) {
    connections.push({
      id: `cxn_${scenarioId}_calendar`,
      accountId,
      kind: 'google_calendar',
      health: scenario.troubles?.calendarTokenExpired ? 'broken' : 'healthy',
      problem: scenario.troubles?.calendarTokenExpired ? 'token_expired' : null,
    })
    connections.push({
      id: `cxn_${scenarioId}_payments`,
      accountId,
      kind: 'payments',
      health: 'healthy',
      problem: null,
    })
  }

  const onboarding: OnboardingState =
    scenario.milestones.length === 0
      ? createOnboardingState({ account, location: locations[0]!, owner, link: `${scenario.slug.replace(/-/g, '')}.ng`, iso: iso(-2 * HOUR) })
      : completedOnboarding({
          account,
          location: locations[0]!,
          owner,
          channels: enabledChannels as ChannelKind[],
          employeeName: scenario.employeeName,
          iso: iso(-110 * DAY),
        })

  const invite = (token: string, email: string, role: Role, status: Invitation['status'], expiresIn: number, note: string | null): Invitation => ({
    id: `inv_${token}`,
    accountId,
    token,
    email,
    role,
    locationIds: role === 'staff' && locations.length > 1 ? [locations[0]!.id] : [],
    invitedBy: owner.id,
    note,
    status,
    expiresAt: iso(expiresIn),
    createdAt: iso(expiresIn - 7 * DAY),
  })
  const extras = buildCrmExtras({
    scenarioId,
    scenario,
    accountId,
    contacts,
    conversations,
    users,
    staff,
    owner,
    manager,
    person,
    ai,
    faker,
    iso,
    channels: enabledChannels as ChannelKind[],
    currency: pack.currency,
    empty,
  })

  const aiExtras = buildAiExtras({
    scenarioId,
    scenario,
    accountId,
    locationId: locations[0]!.id,
    ownerId: owner.id,
    ai,
    person: person(owner),
    iso,
    empty,
    contacts,
    conversations,
    approvals,
  })

  const grow = buildGrowExtras({
    scenarioId,
    scenario,
    accountId,
    contacts,
    owner,
    person,
    iso,
    currency: pack.currency,
    empty,
  })

  const booking = buildBookingExtras({
    scenarioId,
    scenario,
    accountId,
    locationId: locations[0]!.id,
    timezone: locations[0]!.timezone,
    currency: pack.currency,
    contacts,
    users,
    staff,
    manager,
    owner,
    person,
    ai,
    faker,
    iso,
    empty,
    calendarBroken: Boolean(scenario.troubles?.calendarTokenExpired),
  })

  const linkedTasks: Task[] = []
  if (!empty) {
    const deal = booking.opportunities[0]
    const visit = booking.appointments[0]
    if (deal) {
      linkedTasks.push({
        id: `tsk_${scenarioId}_5`,
        accountId,
        locationId: deal.locationId,
        assignedUserId: staff.id,
        title: 'Send quote for the deal',
        notes: '',
        dueAt: iso(6 * HOUR),
        contactName: deal.contactName,
        contactId: deal.contactId,
        done: false,
        priority: 'normal',
        linkedKind: 'opportunity',
        linkedId: deal.id,
        createdAt: iso(-3 * HOUR),
        createdBy: person(manager),
      })
    }
    if (visit) {
      linkedTasks.push({
        id: `tsk_${scenarioId}_6`,
        accountId,
        locationId: visit.locationId,
        assignedUserId: visit.staffUserId,
        title: 'Prep kit for booking',
        notes: visit.service,
        dueAt: visit.startsAt,
        contactName: visit.contactName,
        contactId: visit.contactId,
        done: false,
        priority: 'high',
        linkedKind: 'booking',
        linkedId: visit.id,
        createdAt: iso(-HOUR),
        createdBy: person(manager),
      })
    }
  }

  const invitations: Invitation[] =
    scenarioId === 'A'
      ? [
          invite(DEMO_INVITES.pending, 'ngozi.eze@gmail.com', 'staff', 'pending', 6 * DAY, 'Welcome to the team! You will handle bookings at Lekki.'),
          invite(DEMO_INVITES.expired, 'bayo.ade@gmail.com', 'manager', 'pending', -1 * DAY, null),
          invite(DEMO_INVITES.revoked, 'temi.j@yahoo.com', 'staff', 'revoked', 3 * DAY, null),
        ]
      : scenario.available && scenarioId !== 'E'
        ? [invite(`join-${scenario.slug}`, emailFor('New Teammate', 'gmail.com'), 'manager', 'pending', 5 * DAY, null)]
        : []

  return {
    accounts: [account],
    locations,
    users,
    memberships,
    contacts,
    companies,
    smartLists,
    conversations,
    approvals: aiExtras.approvals,
    notifications,
    connections,
    invitations,
    onboarding: [onboarding],
    ...extras,
    ...booking,
    tasks: [...extras.tasks, ...linkedTasks],
    employees: aiExtras.employees,
    employeeVersions: aiExtras.employeeVersions,
    knowledgeItems: aiExtras.knowledgeItems,
    trainingInbox: aiExtras.trainingInbox,
    evalResults: aiExtras.evalResults,
    transcriptSamples: aiExtras.transcriptSamples,
    ...grow,
    ...buildInsightExtras({
      scenarioId,
      accountId,
      locationIds: locations.map((item) => item.id),
      slug: scenario.slug,
      business: scenario.business,
      person: person(owner),
      iso,
      empty,
    }),
    ...(() => {
      const extra = buildSettingsExtras({
        scenarioId,
        accountId,
        plan: scenario.plan,
        ownerName: owner.name,
        ownerEmail: owner.email,
        staffName: staff.name,
        currency: pack.currency,
        iso,
        empty,
      })
      const gov = buildGovernanceExtras({
        scenarioId,
        accountId,
        business: scenario.business,
        employeeName: scenario.employeeName ?? 'Ada',
        market: scenario.market,
        ownerName: owner.name,
        contacts,
        iso,
        empty,
        complianceBlocking: Boolean(scenario.troubles?.complianceBlocking),
      })
      return {
        invoices: extra.invoices,
        joinLinks: extra.joinLinks,
        joinRequests: extra.joinRequests,
        deviceSessions: extra.deviceSessions,
        auditEvents: [...extra.auditEvents, ...gov.extraAudit],
        connectionEvents: [],
        complianceState: gov.complianceState,
        consentLedger: gov.consentLedger,
        consentWordings: gov.consentWordings,
        suppressionList: gov.suppressionList,
        dsarRequests: gov.dsarRequests,
        legalAcceptances: gov.legalAcceptances,
        supportAccess: gov.supportAccess,
        aiIncidents: gov.aiIncidents,
      }
    })(),
    importJobs: [],
    mergeUndos: [],
  }
}
