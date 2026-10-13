import type { Faker } from '@faker-js/faker'
import type {
  Appointment,
  BookingPageSettings,
  CreatedBy,
  Lead,
  Opportunity,
  PipelineStage,
  Service,
  StaffProfile,
  User,
  WaitlistEntry,
} from '@deskhand/schemas'
import { DAY, HOUR, MINUTE, now } from './clock'
import { fromZoned } from './availability'
import type { ScenarioDefinition, ScenarioId } from './scenarios'

const WEEKLY = [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: '09:00', end: '18:00' }))

function catalog(industry: ScenarioDefinition['industry']): { name: string; minutes: number; price: number; deposit: number; capacity: number }[] {
  switch (industry) {
    case 'salon':
      return [
        { name: 'Knotless braids', minutes: 300, price: 35000, deposit: 10000, capacity: 1 },
        { name: 'Cornrows', minutes: 90, price: 15000, deposit: 0, capacity: 1 },
        { name: 'Passion twist', minutes: 240, price: 28000, deposit: 8000, capacity: 1 },
        { name: 'Silk press', minutes: 90, price: 12000, deposit: 0, capacity: 1 },
        { name: 'Group twist class', minutes: 120, price: 8000, deposit: 0, capacity: 6 },
      ]
    case 'clinic':
      return [
        { name: 'Consultation', minutes: 30, price: 15000, deposit: 0, capacity: 1 },
        { name: 'Scaling and polishing', minutes: 60, price: 25000, deposit: 5000, capacity: 1 },
        { name: 'Whitening', minutes: 90, price: 45000, deposit: 10000, capacity: 1 },
      ]
    case 'barber':
      return [
        { name: 'Skin fade', minutes: 45, price: 25, deposit: 0, capacity: 1 },
        { name: 'Beard trim', minutes: 20, price: 12, deposit: 0, capacity: 1 },
        { name: 'Kids cut', minutes: 30, price: 15, deposit: 0, capacity: 1 },
      ]
    case 'real_estate':
      return [
        { name: 'Property viewing', minutes: 45, price: 0, deposit: 0, capacity: 1 },
        { name: 'Listing consultation', minutes: 60, price: 0, deposit: 0, capacity: 1 },
      ]
    default:
      return [
        { name: 'Tasting', minutes: 45, price: 5000, deposit: 0, capacity: 1 },
        { name: 'Wedding consult', minutes: 60, price: 0, deposit: 0, capacity: 1 },
      ]
  }
}

export function buildBookingExtras(input: {
  scenarioId: ScenarioId
  scenario: ScenarioDefinition
  accountId: string
  locationId: string
  timezone: string
  currency: string
  contacts: { id: string; firstName: string; lastName: string; locationId: string; stage: string; value: number | null; sourceLabel: string; assignedUserId: string | null }[]
  users: User[]
  staff: User
  manager: User
  owner: User
  person: (user: User) => CreatedBy
  ai: CreatedBy
  faker: Faker
  iso: (offsetMs: number) => string
  empty: boolean
  calendarBroken: boolean
}): {
  pipelineStages: PipelineStage[]
  opportunities: Opportunity[]
  leads: Lead[]
  services: Service[]
  staffProfiles: StaffProfile[]
  appointments: Appointment[]
  bookingPages: BookingPageSettings[]
  slotHolds: []
  waitlist: WaitlistEntry[]
} {
  const { scenarioId, scenario, accountId, locationId, timezone, currency, contacts, staff, manager, owner, person, ai, faker, iso, empty } = input
  const t0 = now()
  const created = { createdAt: iso(-80 * DAY), createdBy: person(owner) }

  const stageDefs = [
    { key: 'new', name: 'New', order: 0, probability: 10, won: false, lost: false, stale: 3 },
    { key: 'qualified', name: 'Qualified', order: 1, probability: 30, won: false, lost: false, stale: 5 },
    { key: 'booked', name: 'Booked', order: 2, probability: 60, won: false, lost: false, stale: 7 },
    { key: 'deposit', name: 'Deposit paid', order: 3, probability: 80, won: false, lost: false, stale: 7 },
    { key: 'won', name: 'Won', order: 4, probability: 100, won: true, lost: false, stale: 30 },
    { key: 'lost', name: 'Lost', order: 5, probability: 0, won: false, lost: true, stale: 30 },
  ]
  const pipelineStages: PipelineStage[] = stageDefs.map((stage) => ({
    id: `stg_${scenarioId}_${stage.key}`,
    accountId,
    locationId: null,
    name: stage.name,
    order: stage.order,
    probability: stage.probability,
    staleAfterDays: stage.stale,
    won: stage.won,
    lost: stage.lost,
    ...created,
  }))

  if (empty) {
    const services: Service[] = catalog(scenario.industry).map((item, index) => ({
      id: `svc_${scenarioId}_${index + 1}`,
      accountId,
      locationId,
      name: item.name,
      description: item.name,
      durationMinutes: item.minutes,
      bufferMinutes: 15,
      price: item.price,
      currency,
      depositAmount: item.deposit,
      staffUserIds: [staff.id, manager.id],
      capacity: item.capacity,
      visible: true,
      order: index,
      instantBook: true,
      ...created,
    }))
    return {
      pipelineStages,
      opportunities: [],
      leads: [],
      services,
      staffProfiles: [
        { id: `stf_${scenarioId}_staff`, accountId, locationId, userId: staff.id, name: staff.name, title: 'Stylist', bookable: true, calendarConnected: false, weeklyHours: WEEKLY, ...created },
        { id: `stf_${scenarioId}_mgr`, accountId, locationId, userId: manager.id, name: manager.name, title: 'Front desk', bookable: true, calendarConnected: true, weeklyHours: WEEKLY, ...created },
      ],
      appointments: [],
      bookingPages: [
        {
          id: `bpg_${scenarioId}`,
          accountId,
          locationId,
          slug: scenario.slug,
          welcome: `Book with ${scenario.business}`,
          noticeHours: 2,
          horizonDays: 28,
          instantBook: true,
          consentText: 'I agree to be contacted about this booking.',
          languages: ['en', 'fr', 'ar'],
          ...created,
        },
      ],
      slotHolds: [],
      waitlist: [],
    }
  }

  const items = catalog(scenario.industry)
  const services: Service[] = items.map((item, index) => ({
    id: `svc_${scenarioId}_${index + 1}`,
    accountId,
    locationId,
    name: item.name,
    description: item.name,
    durationMinutes: item.minutes,
    bufferMinutes: 15,
    price: item.price,
    currency,
    depositAmount: item.deposit,
    staffUserIds: [staff.id, manager.id],
    capacity: item.capacity,
    visible: true,
    order: index,
    instantBook: index !== 4,
    ...created,
  }))

  const staffProfiles: StaffProfile[] = [
    { id: `stf_${scenarioId}_staff`, accountId, locationId, userId: staff.id, name: staff.name, title: 'Stylist', bookable: true, calendarConnected: false, weeklyHours: WEEKLY, ...created },
    { id: `stf_${scenarioId}_mgr`, accountId, locationId, userId: manager.id, name: manager.name, title: 'Front desk', bookable: true, calendarConnected: true, weeklyHours: WEEKLY, ...created },
  ]

  const stageByName = Object.fromEntries(pipelineStages.map((s) => [s.name, s]))
  const dealStages = new Set(['Qualified', 'Booked', 'Deposit paid', 'Won'])
  const dealContacts = contacts.filter((contact) => dealStages.has(contact.stage)).slice(0, 18)

  const opportunities: Opportunity[] = dealContacts.map((contact, index) => {
    const stage = stageByName[contact.stage] ?? pipelineStages[1]!
    const assignedStaff = index % 3 === 0
    return {
      id: `opp_${scenarioId}_${index + 1}`,
      accountId,
      locationId: contact.locationId,
      contactId: contact.id,
      leadId: `lead_${scenarioId}_${contacts.indexOf(contact) + 1}`,
      contactName: `${contact.firstName} ${contact.lastName}`,
      stageId: stage.id,
      stageName: stage.name,
      value: contact.value,
      probability: stage.probability,
      expectedCloseAt: iso((14 + index) * DAY),
      assignedUserId: contact.assignedUserId ?? (assignedStaff ? staff.id : manager.id),
      assignedName: contact.assignedUserId === staff.id || assignedStaff ? staff.name : manager.name,
      source: contact.sourceLabel,
      enteredStageAt: iso(-(index + 1) * 6 * HOUR),
      lastActivityAt: iso(-(index + 1) * 2 * HOUR),
      nextTask: index % 5 === 0 ? 'Call about deposit' : null,
      aiWorking: Boolean(scenario.employeeName) && index % 7 === 0,
      wonReason: stage.won ? 'Booked' : null,
      lostReason: stage.lost ? 'No response' : null,
      createdAt: iso(-(index + 2) * DAY),
      createdBy: index % 4 === 0 && scenario.employeeName ? ai : person(owner),
    }
  })

  const oppByContact = new Map(opportunities.map((item) => [item.contactId, item]))
  const leads: Lead[] = contacts.map((contact, index) => {
    const opp = oppByContact.get(contact.id)
    const status = opp ? (opp.wonReason ? 'converted' : 'qualified') : contact.stage === 'New' ? 'new' : 'working'
    const assignedStaff = index % 3 === 0
    return {
      id: `lead_${scenarioId}_${index + 1}`,
      accountId,
      locationId: contact.locationId,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      status,
      source: contact.sourceLabel,
      assignedUserId: contact.assignedUserId ?? (assignedStaff ? staff.id : manager.id),
      assignedName: contact.assignedUserId === staff.id || assignedStaff ? staff.name : manager.name,
      lastActivityAt: iso(-(index + 1) * 2 * HOUR),
      nextFollowUpAt: status === 'converted' ? null : iso((index % 5) * DAY),
      opportunityId: opp?.id ?? null,
      aiSuggested: !opp && index % 8 === 0,
      createdAt: iso(-(index + 2) * DAY),
      createdBy: index % 4 === 0 && scenario.employeeName ? ai : person(owner),
    }
  })

  const bookable = [staff, manager]
  const appointments: Appointment[] = Array.from({ length: 60 }, (_, index) => {
    const contact = contacts[index % contacts.length]!
    const service = services[index % services.length]!
    const member = bookable[index % 2]!
    const dayOffset = index < 8 ? 0 : index < 20 ? Math.floor((index - 8) / 2) : -Math.floor((index - 20) / 2)
    const hour = 9 + (index % 6)
    const start = fromZoned(t0.getFullYear(), t0.getMonth() + 1, t0.getDate() + dayOffset, hour, index % 2 === 0 ? 0 : 30, timezone)
    const ends = new Date(start.getTime() + service.durationMinutes * MINUTE)
    const sources: Appointment['source'][] = ['page', 'staff', 'ai', 'embed']
    const statuses: Appointment['status'][] = index > 50 ? ['completed', 'no_show', 'cancelled'] : ['booked']
    const status = faker.helpers.arrayElement(statuses)
    return {
      id: `apt_${scenarioId}_${index + 1}`,
      accountId,
      locationId: contact.locationId,
      contactId: contact.id,
      staffUserId: member.id,
      staffName: member.name,
      contactName: `${contact.firstName} ${contact.lastName}`,
      serviceId: service.id,
      service: service.name,
      startsAt: start.toISOString(),
      endsAt: ends.toISOString(),
      status,
      noshowRisk: index === 2,
      price: service.price,
      depositAmount: service.depositAmount,
      depositStatus: service.depositAmount ? (index % 4 === 0 ? 'pending' : 'paid') : 'none',
      source: sources[index % 4]!,
      notes: '',
      manageToken: `mng_${scenarioId}_${index + 1}`,
      capacity: service.capacity,
      attendeeCount: 1,
      createdAt: iso(-2 * DAY),
      createdBy: index % 5 === 0 && scenario.employeeName ? ai : { kind: 'booking_page' },
    }
  })

  const waitlist: WaitlistEntry[] =
    services[4] && contacts[9]
      ? [
          {
            id: `wtl_${scenarioId}_1`,
            accountId,
            locationId,
            serviceId: services[4].id,
            staffUserId: staff.id,
            startsAt: appointments[0]!.startsAt,
            phone: '+234 800 000 0000',
            name: `${contacts[9].firstName} ${contacts[9].lastName}`,
            createdAt: iso(-HOUR),
            createdBy: { kind: 'booking_page' },
          },
        ]
      : []

  return {
    pipelineStages,
    opportunities,
    leads,
    services,
    staffProfiles,
    appointments,
    bookingPages: [
      {
        id: `bpg_${scenarioId}`,
        accountId,
        locationId,
        slug: scenario.slug,
        welcome: `Book with ${scenario.business}. Times are shown in your timezone; the salon runs on ${timezone.replace(/_/g, ' ')}.`,
        noticeHours: 2,
        horizonDays: 28,
        instantBook: true,
        consentText: 'I agree to be contacted about this booking by WhatsApp or email.',
        languages: ['en', 'fr', 'ar'],
        ...created,
      },
    ],
    slotHolds: [],
    waitlist,
  }
}
