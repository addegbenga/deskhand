import type { Faker } from '@faker-js/faker'
import type {
  AiActionRecord,
  AiMemoryItem,
  AppointmentRecord,
  ChannelKind,
  Contact,
  ContactConsent,
  ContactNote,
  Conversation,
  CreatedBy,
  CustomFieldDef,
  Message,
  MessageTemplate,
  PaymentRecord,
  ReviewRecord,
  SavedReply,
  SuggestionRecord,
  TaskRecord,
  User,
} from '@deskhand/schemas'
import { DAY, HOUR, MINUTE, now } from './clock'
import type { ScenarioDefinition, ScenarioId } from './scenarios'

const WINDOW_MS = 24 * HOUR

const REPLIES: Record<ScenarioDefinition['industry'], { price: string; booking: string; complaint: string; unknown: string; pidgin: string; optout: string }> = {
  salon: {
    price: 'Medium knotless braids are ₦35,000 and take about 5 hours. I can hold Saturday 10am or 1pm for you.',
    booking: 'I have Saturday 10am with Tola or 1pm with Funke. Which works?',
    complaint: "I'm sorry the braids loosened. I'll get Amaka to look at this — someone from the team will message you shortly.",
    unknown: "I don't want to guess on that. I'll check with the team and come back to you.",
    pidgin: 'Medium knotless na ₦35,000, e go take about 5 hours. Saturday 10am or 1pm dey available.',
    optout: "You're unsubscribed. We won't message you on this channel again.",
  },
  clinic: {
    price: 'Scaling and polishing is ₦25,000. We can see you tomorrow morning or Thursday afternoon.',
    booking: 'I can book you for scaling tomorrow at 9am or Thursday at 2pm. Which do you prefer?',
    complaint: "I'm sorry you're in pain. A nurse will pick this up right away.",
    unknown: "I'll confirm with Dr Okoye and reply once I have the right answer.",
    pidgin: 'Scaling na ₦25,000. Tomorrow 9am or Thursday 2pm dey.',
    optout: "You're unsubscribed. We won't message you on this channel again.",
  },
  barber: {
    price: 'A skin fade is £25. Walk-ins after 3pm, or I can book you at 11am tomorrow.',
    booking: 'I can do 11am or 4pm tomorrow with Jamal. Which suits you?',
    complaint: "Sorry about the wait. I'll get the shop manager to sort this.",
    unknown: "I'll check with the shop and come back to you.",
    pidgin: 'Skin fade na £25. 11am or 4pm tomorrow dey.',
    optout: "You're unsubscribed. We won't message you on this channel again.",
  },
  real_estate: {
    price: 'The Elm St listing is $485,000. I can set a viewing Saturday at 11am or Sunday at 2pm.',
    booking: 'Saturday 11am or Sunday 2pm for the viewing — which works?',
    complaint: "I'm sorry the listing photos were off. An agent will follow up with the correct set.",
    unknown: "I'll confirm with the listing agent and get back to you.",
    pidgin: 'The Elm St place na $485,000. Saturday 11am or Sunday 2pm for viewing.',
    optout: "You're unsubscribed. We won't message you on this channel again.",
  },
  bakery: {
    price: 'A two-tier birthday cake starts at ₦45,000. We need 3 days notice.',
    booking: 'I can pencil you in for a tasting Thursday at 11am.',
    complaint: "I'm sorry the order was late. Someone from the team will make this right.",
    unknown: "I'll check with the baker and reply with a firm answer.",
    pidgin: 'Two-tier cake start from ₦45,000. We need 3 days notice.',
    optout: "You're unsubscribed. We won't message you on this channel again.",
  },
}

const SYSTEM_EVENTS = [
  'Booking confirmed for Saturday 10:00',
  'Payment of deposit received',
  'Opportunity moved to Deposit paid',
  'Contact tagged Returning',
]

export function defaultConsents(
  channels: ChannelKind[],
  iso: (ms: number) => string,
  optedOut: boolean,
  missingSms: boolean,
  missingWhatsapp = false,
): ContactConsent[] {
  return channels.map((channel) => ({
    channel,
    status: optedOut
      ? 'withdrawn'
      : missingSms && channel === 'sms'
        ? 'missing'
        : missingWhatsapp && channel === 'whatsapp'
          ? 'missing'
          : 'granted',
    source: optedOut ? 'inbox' : 'form',
    wordingVersion: '2026-09',
    recordedAt: iso(-10 * DAY),
  }))
}

export function enrichContact(
  contact: Omit<Contact, 'stage' | 'value' | 'sourceLabel' | 'customFields' | 'consents' | 'optedOut'> & Partial<Contact>,
  index: number,
  scenario: ScenarioDefinition,
  channels: ChannelKind[],
  iso: (ms: number) => string,
  faker: Faker,
): Contact {
  const optedOut = index === 2
  const missingSms = index === 4
  const sources: Contact['sourceLabel'][] = ['whatsapp', 'webchat', 'email', 'instagram', 'form', 'booking_page', 'import', 'manual']
  return {
    ...contact,
    stage: faker.helpers.arrayElement(['New', 'Qualified', 'Booked', 'Deposit paid', 'Won']),
    value: faker.datatype.boolean(0.4) ? faker.helpers.arrayElement([15000, 25000, 35000, 8000]) : null,
    sourceLabel: faker.helpers.arrayElement(sources),
    customFields: scenario.industry === 'salon' ? { hairType: faker.helpers.arrayElement(['4C', '4B', '3C']), lastVisit: iso(-20 * DAY).slice(0, 10) } : {},
    consents: defaultConsents(channels, iso, optedOut, missingSms, index === 5),
    optedOut,
    companyId: contact.companyId ?? null,
    tags: [...contact.tags, ...(index === 7 ? ['quiet-hours-window'] : [])],
  }
}

export function plantDuplicates(contacts: Contact[]) {
  if (contacts.length < 3) return
  const a = contacts[0]!
  const b = contacts[1]!
  b.phone = a.phone
  b.lastName = a.lastName
  b.firstName = `${a.firstName[0] ?? 'A'}.`
}

export function buildCrmExtras(input: {
  scenarioId: ScenarioId
  scenario: ScenarioDefinition
  accountId: string
  contacts: Contact[]
  conversations: Conversation[]
  users: User[]
  staff: User
  owner: User
  manager: User
  person: (user: User) => CreatedBy
  ai: CreatedBy
  faker: Faker
  iso: (offsetMs: number) => string
  channels: ChannelKind[]
  currency: string
  empty: boolean
}): {
  messages: Message[]
  templates: MessageTemplate[]
  savedReplies: SavedReply[]
  appointments: AppointmentRecord[]
  tasks: TaskRecord[]
  reviews: ReviewRecord[]
  payments: PaymentRecord[]
  aiActions: AiActionRecord[]
  suggestions: SuggestionRecord[]
  notes: ContactNote[]
  memories: AiMemoryItem[]
  customFields: CustomFieldDef[]
} {
  const {
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
    currency,
    empty,
  } = input
  const copy = REPLIES[scenario.industry]
  const t0 = now().getTime()
  const aiOn = scenario.aiMode === 'on' || scenario.aiMode === 'suggest_only'

  if (empty) {
    return {
      messages: [],
      templates: [],
      savedReplies: [],
      appointments: [],
      tasks: [],
      reviews: [],
      payments: [],
      aiActions: [],
      suggestions: [],
      notes: [],
      memories: [],
      customFields: [],
    }
  }

  const templates: MessageTemplate[] = [
    {
      id: `tpl_${scenarioId}_1`,
      accountId,
      name: 'Appointment reminder',
      language: 'en',
      body: 'Hi {{1}}, reminder: {{2}} on {{3}}. Reply 1 to confirm.',
      status: 'approved',
      channel: 'whatsapp',
      rejectionReason: null,
      usageCount: 42,
      createdAt: iso(-40 * DAY),
      createdBy: person(owner),
    },
    {
      id: `tpl_${scenarioId}_2`,
      accountId,
      name: 'New booking offer',
      language: 'en',
      body: 'Hi {{1}}, we have a slot on {{2}} for {{3}}. Reply YES to book.',
      status: scenario.troubles?.templateRejected ? 'rejected' : 'approved',
      channel: 'whatsapp',
      rejectionReason: scenario.troubles?.templateRejected ? 'Promotional language not allowed in this category.' : null,
      usageCount: 12,
      createdAt: iso(-30 * DAY),
      createdBy: person(owner),
    },
    {
      id: `tpl_${scenarioId}_3`,
      accountId,
      name: 'Follow up',
      language: 'en',
      body: 'Hi {{1}}, just checking in — still happy with {{2}}?',
      status: 'approved',
      channel: 'whatsapp',
      rejectionReason: null,
      usageCount: 8,
      createdAt: iso(-20 * DAY),
      createdBy: person(owner),
    },
    {
      id: `tpl_${scenarioId}_4`,
      accountId,
      name: 'Weekend promo (pending)',
      language: 'en',
      body: 'Hi {{1}}, we have weekend availability. Reply YES to book.',
      status: 'pending',
      channel: 'whatsapp',
      rejectionReason: null,
      usageCount: 0,
      createdAt: iso(-2 * DAY),
      createdBy: person(owner),
    },
    {
      id: `tpl_${scenarioId}_email`,
      accountId,
      name: 'Email reminder',
      language: 'en',
      body: 'Hi {{1}}, reminder of your visit on {{2}}.',
      status: 'approved',
      channel: 'email',
      rejectionReason: null,
      usageCount: 3,
      createdAt: iso(-15 * DAY),
      createdBy: person(owner),
    },
  ]

  const savedReplies: SavedReply[] = [
    { id: `sr_${scenarioId}_1`, accountId, shortcut: '/hours', body: 'We are open Tuesday to Saturday, 9am to 6pm.', language: 'en', createdAt: iso(-50 * DAY), createdBy: person(owner) },
    { id: `sr_${scenarioId}_2`, accountId, shortcut: '/deposit', body: 'A 50% deposit holds the slot. We send account details after you confirm the time.', language: 'en', createdAt: iso(-50 * DAY), createdBy: person(owner) },
    { id: `sr_${scenarioId}_3`, accountId, shortcut: '/thanks', body: 'Thank you! See you then.', language: 'en', createdAt: iso(-50 * DAY), createdBy: person(owner) },
    { id: `sr_${scenarioId}_4`, accountId, shortcut: '/pidgin', body: 'E go good. See you then!', language: 'pcm', createdAt: iso(-50 * DAY), createdBy: person(staff) },
  ]

  const messages: Message[] = []
  conversations.forEach((conversation, index) => {
    const contact = contacts.find((c) => c.id === conversation.contactId)
    const name = contact ? `${contact.firstName} ${contact.lastName}` : 'Customer'
    const count = 4 + (index % 6)
    const lastInboundOffset =
      conversation.channel === 'whatsapp' && index === 1 ? 30 * HOUR : (20 + index * 7) * MINUTE
    for (let m = 0; m < count; m++) {
      const inbound = m % 2 === 0
      const isLast = m === count - 1
      const offset = isLast && inbound ? lastInboundOffset : (count - m) * 40 * MINUTE + lastInboundOffset
      const pidgin = conversation.language === 'pcm'
      const complaint = conversation.status === 'needs_human'
      const body = inbound
        ? conversation.lastMessagePreview
        : pidgin
          ? copy.pidgin
          : complaint
            ? copy.complaint
            : copy.price
      const authorKind = inbound ? 'contact' : aiOn && m > 1 && conversation.aiControl === 'ai' ? 'ai_employee' : 'person'
      messages.push({
        id: `msg_${scenarioId}_${index + 1}_${m + 1}`,
        accountId,
        conversationId: conversation.id,
        kind: inbound ? 'inbound' : 'outbound',
        authorKind,
        authorName: inbound ? name : authorKind === 'ai_employee' ? (scenario.employeeName ?? 'Ada') : staff.name,
        channel: conversation.channel,
        body: m === 0 && inbound ? conversation.lastMessagePreview : body,
        deliveryStatus: inbound ? null : faker.helpers.arrayElement(['sent', 'delivered', 'read']),
        attachment: inbound && index === 6 && isLast ? { name: 'style.jpg', type: 'image' } : null,
        why:
          authorKind === 'ai_employee'
            ? { sources: ['Service: Knotless braids', 'Price list'], rules: ['Ground prices only'], tools: ['lookup_service'] }
            : null,
        scheduledFor: null,
        rating: authorKind === 'ai_employee' && index === 0 ? 'good' : null,
        language: conversation.language,
        createdAt: iso(-offset),
        createdBy: inbound ? { kind: 'person' } : authorKind === 'ai_employee' ? ai : person(staff),
        transcript: conversation.kind === 'call' && inbound ? `${name}: Can I book for Saturday?\n${scenario.employeeName ?? staff.name}: Yes, 10am is free.` : null,
        summary: conversation.kind === 'call' ? 'Customer asked for Saturday; 10am offered and accepted.' : null,
      })
      if (m === 2) {
        messages.push({
          id: `msg_${scenarioId}_${index + 1}_sys`,
          accountId,
          conversationId: conversation.id,
          kind: 'system',
          authorKind: 'system',
          authorName: '',
          channel: conversation.channel,
          body: SYSTEM_EVENTS[index % SYSTEM_EVENTS.length]!,
          deliveryStatus: null,
          attachment: null,
          why: null,
          scheduledFor: null,
          rating: null,
          language: 'en',
          createdAt: iso(-offset + 2 * MINUTE),
          createdBy: { kind: 'recipe' },
          transcript: null,
          summary: null,
        })
      }
    }
    if (index === 5) {
      messages.push({
        id: `msg_${scenarioId}_${index + 1}_note`,
        accountId,
        conversationId: conversation.id,
        kind: 'note',
        authorKind: 'person',
        authorName: manager.name,
        channel: conversation.channel,
        body: 'Prefers Tola. Allergic to coconut oil — do not use.',
        deliveryStatus: null,
        attachment: null,
        why: null,
        scheduledFor: null,
        rating: null,
        language: 'en',
        createdAt: iso(-15 * MINUTE),
        createdBy: person(manager),
        transcript: null,
        summary: null,
      })
    }
  })

  const startOfDay = new Date(t0)
  startOfDay.setHours(9, 0, 0, 0)

  const appointments: AppointmentRecord[] = []

  const saturdayConv = conversations.find((item) => item.contactId === contacts[3]!.id) ?? conversations[0]!
  const saturdayContact = contacts.find((item) => item.id === saturdayConv.contactId) ?? contacts[3]!
  const tasks: TaskRecord[] = [
    { id: `tsk_${scenarioId}_1`, accountId, locationId: contacts[0]!.locationId, assignedUserId: staff.id, title: 'Call back about deposit', notes: '', dueAt: new Date(startOfDay.getTime() + 3 * HOUR).toISOString(), contactName: `${contacts[0]!.firstName} ${contacts[0]!.lastName}`, contactId: contacts[0]!.id, done: false, priority: 'high', linkedKind: 'contact', linkedId: contacts[0]!.id, createdAt: iso(-DAY), createdBy: person(manager) },
    { id: `tsk_${scenarioId}_2`, accountId, locationId: saturdayConv.locationId, assignedUserId: manager.id, title: 'Confirm Saturday stylist', notes: '', dueAt: new Date(startOfDay.getTime() + 5 * HOUR).toISOString(), contactName: `${saturdayContact.firstName} ${saturdayContact.lastName}`, contactId: saturdayConv.contactId, done: false, priority: 'normal', linkedKind: 'conversation', linkedId: saturdayConv.id, createdAt: iso(-DAY), createdBy: person(owner) },
    { id: `tsk_${scenarioId}_3`, accountId, locationId: contacts[6]!.locationId, assignedUserId: owner.id, title: 'Reorder braid hair', notes: '', dueAt: new Date(startOfDay.getTime() + 7 * HOUR).toISOString(), contactName: null, contactId: null, done: false, priority: 'low', linkedKind: null, linkedId: null, createdAt: iso(-2 * DAY), createdBy: person(owner) },
    { id: `tsk_${scenarioId}_4`, accountId, locationId: contacts[2]!.locationId, assignedUserId: staff.id, title: 'Confirm bridal group price', notes: 'AI could not quote a group rate.', dueAt: new Date(startOfDay.getTime() - HOUR).toISOString(), contactName: `${contacts[2]!.firstName} ${contacts[2]!.lastName}`, contactId: contacts[2]!.id, done: false, priority: 'high', linkedKind: 'contact', linkedId: contacts[2]!.id, createdAt: iso(-HOUR), createdBy: aiOn ? ai : person(manager) },
  ]

  const locName = (index: number) => (index % 3 === 0 ? 'Lekki' : 'Ikeja')
  const reviews: ReviewRecord[] = [
    {
      id: `rev_${scenarioId}_1`,
      accountId,
      locationId: contacts[12]!.locationId,
      locationName: locName(12),
      contactName: `${contacts[12]!.firstName} ${contacts[12]!.lastName}`,
      rating: 2,
      status: 'needs_reply',
      source: 'google',
      body: 'The braids loosened after four days.',
      sentiment: 'negative',
      topics: ['quality', 'wait time'],
      urgency: 'high',
      spam: false,
      staffMention: staff.name,
      serviceMention: 'Knotless braids',
      draftReply: "I'm sorry the braids loosened. Please come in this week and we will retouch them at no extra charge.",
      reply: null,
      repliedAt: null,
      createdAt: iso(-5 * HOUR),
      createdBy: { kind: 'api' },
    },
    {
      id: `rev_${scenarioId}_2`,
      accountId,
      locationId: contacts[8]!.locationId,
      locationName: locName(8),
      contactName: `${contacts[8]!.firstName} ${contacts[8]!.lastName}`,
      rating: 5,
      status: 'replied',
      source: 'google',
      body: 'Came out beautiful, thank you!',
      sentiment: 'positive',
      topics: ['quality', 'staff'],
      urgency: 'low',
      spam: false,
      staffMention: staff.name,
      serviceMention: 'Cornrows',
      draftReply: 'Thank you — we loved having you.',
      reply: 'Thank you — we loved having you in the chair.',
      repliedAt: iso(-2 * DAY + HOUR),
      createdAt: iso(-2 * DAY),
      createdBy: { kind: 'api' },
    },
    {
      id: `rev_${scenarioId}_3`,
      accountId,
      locationId: contacts[4]!.locationId,
      locationName: locName(4),
      contactName: `${contacts[4]!.firstName} ${contacts[4]!.lastName}`,
      rating: 3,
      status: 'needs_reply',
      source: 'google',
      body: 'Good result but I waited almost an hour past my time.',
      sentiment: 'neutral',
      topics: ['wait time', 'quality'],
      urgency: 'medium',
      spam: false,
      staffMention: manager.name,
      serviceMention: 'Silk press',
      draftReply: 'Thank you for flagging the wait. We will keep a tighter buffer on silk press appointments.',
      reply: null,
      repliedAt: null,
      createdAt: iso(-DAY),
      createdBy: { kind: 'api' },
    },
    {
      id: `rev_${scenarioId}_4`,
      accountId,
      locationId: contacts[1]!.locationId,
      locationName: locName(1),
      contactName: `${contacts[1]!.firstName} ${contacts[1]!.lastName}`,
      rating: 1,
      status: 'flagged',
      source: 'private',
      body: 'They ruined my hair and I want a full refund or I will get a lawyer.',
      sentiment: 'negative',
      topics: ['quality', 'price'],
      urgency: 'high',
      spam: false,
      staffMention: staff.name,
      serviceMention: 'Wig install',
      draftReply: 'I am sorry this visit went wrong. A manager will contact you privately — we do not discuss refunds in a public reply.',
      reply: null,
      repliedAt: null,
      createdAt: iso(-8 * HOUR),
      createdBy: { kind: 'api' },
    },
    {
      id: `rev_${scenarioId}_5`,
      accountId,
      locationId: contacts[10]!.locationId,
      locationName: locName(10),
      contactName: 'BestBraids247',
      rating: 5,
      status: 'flagged',
      source: 'google',
      body: 'AMAZING!!! Click my profile for cheap wig deals!!!!',
      sentiment: 'positive',
      topics: ['spam'],
      urgency: 'low',
      spam: true,
      staffMention: null,
      serviceMention: null,
      draftReply: 'Do not reply — this looks like spam.',
      reply: null,
      repliedAt: null,
      createdAt: iso(-3 * HOUR),
      createdBy: { kind: 'api' },
    },
  ]

  const payments: PaymentRecord[] = contacts.slice(0, 12).map((contact, index) => ({
    id: `pay_${scenarioId}_${index + 1}`,
    accountId,
    locationId: contact.locationId,
    contactId: contact.id,
    contactName: `${contact.firstName} ${contact.lastName}`,
    amount: [15000, 25000, 35000, 8000][index % 4]!,
    currency,
    status: index % 5 === 0 ? 'pending' : 'paid',
    paidAt: index % 5 === 0 ? null : iso(-(index + 1) * DAY),
    source: index % 3 === 0 ? 'ai' : index % 3 === 1 ? 'booking' : 'staff',
    gatewayRef: `PSK_${scenarioId}_${index + 1}`,
    createdAt: iso(-(index + 2) * DAY),
    createdBy: { kind: 'person' },
  }))

  const actions: AiActionRecord['action'][] = ['replied', 'booked', 'handed_off', 'asked_clarification', 'opted_out']
  const aiActions: AiActionRecord[] = aiOn
    ? Array.from({ length: 20 }, (_, index) => {
        const contact = contacts[index]!
        const action = actions[index % actions.length]!
        return {
          id: `act_${scenarioId}_${index + 1}`,
          accountId,
          employeeId: scenario.employeeName ? `emp_${scenarioId}_1` : null,
          employeeName: scenario.employeeName ?? 'Ada',
          contactName: `${contact.firstName} ${contact.lastName}`,
          action,
          outcome: action === 'handed_off' ? 'Waiting on a person' : action === 'booked' ? 'Saturday 10am' : 'Sent',
          href: `/app/inbox/${conversations[index % conversations.length]?.id ?? ''}`,
          createdAt: iso(-(index + 1) * 18 * MINUTE),
          createdBy: ai,
        }
      })
    : []

  const suggestions: SuggestionRecord[] = aiOn
    ? [
        { id: `sug_${scenarioId}_1`, accountId, body: 'Saturday is 80% booked: send a reminder offer to last month’s visitors.', actionLabel: 'Draft campaign', dismissed: false, createdAt: iso(-HOUR), createdBy: ai },
        { id: `sug_${scenarioId}_2`, accountId, body: 'Three contacts asked about home service this week. Add it to the knowledge base?', actionLabel: 'Add knowledge', dismissed: false, createdAt: iso(-3 * HOUR), createdBy: ai },
        { id: `sug_${scenarioId}_3`, accountId, body: 'Tola has a gap at 2pm tomorrow. Offer it to the waitlist?', actionLabel: 'Offer slot', dismissed: false, createdAt: iso(-5 * HOUR), createdBy: ai },
      ]
    : []

  const notes: ContactNote[] = contacts.slice(0, 8).map((contact, index) => ({
    id: `nte_${scenarioId}_${index + 1}`,
    accountId,
    contactId: contact.id,
    body: index % 2 === 0 ? 'Prefers afternoon appointments.' : 'Came via Instagram.',
    createdAt: iso(-(index + 1) * DAY),
    createdBy: person(users[index % users.length]!),
  }))

  const memories: AiMemoryItem[] = aiOn
    ? contacts.slice(0, 10).map((contact, index) => ({
        id: `mem_${scenarioId}_${index + 1}`,
        accountId,
        contactId: contact.id,
        key: index % 2 === 0 ? 'preferred_style' : 'allergies',
        value: index % 2 === 0 ? 'Medium knotless, waist length' : 'Coconut oil',
        createdAt: iso(-(index + 3) * DAY),
        createdBy: ai,
      }))
    : []

  const customFields: CustomFieldDef[] = [
    { id: `cfd_${scenarioId}_hair`, accountId, key: 'hairType', label: 'Hair type', type: 'dropdown', required: false, options: ['4C', '4B', '4A', '3C'], createdAt: iso(-100 * DAY), createdBy: person(owner) },
    { id: `cfd_${scenarioId}_visit`, accountId, key: 'lastVisit', label: 'Last visit', type: 'date', required: false, options: [], createdAt: iso(-100 * DAY), createdBy: person(owner) },
    { id: `cfd_${scenarioId}_stylist`, accountId, key: 'preferredStylist', label: 'Preferred stylist', type: 'text', required: false, options: [], createdAt: iso(-100 * DAY), createdBy: person(owner) },
  ]

  void WINDOW_MS
  return { messages, templates, savedReplies, appointments, tasks, reviews, payments, aiActions, suggestions, notes, memories, customFields }
}

export { WINDOW_MS }
