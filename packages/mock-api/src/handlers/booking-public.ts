import { http } from 'msw'
import {
  AbandonBookingSchema,
  BookingConfirmationSchema,
  ConfirmBookingSchema,
  HoldResponseSchema,
  HoldSlotSchema,
  JoinWaitlistSchema,
  ManageBookingSchema,
  PublicBookingPageSchema,
  RescheduleBookingSchema,
  SlotListSchema,
  WaitlistEntrySchema,
  type Account,
  type Appointment,
} from '@deskhand/schemas'
import { HOLD_MS, now } from '../clock'
import type { MockDb } from '../db'
import { fromZoned, listSlots, slotTaken, zonedParts } from '../availability'
import { json, MockHttpError, parseBody, route } from '../http'
import { SCENARIOS } from '../scenarios'
import { ensureSeeded } from '../store'
import { notifyChange } from '../sync'

async function save(database: MockDb, topics: string[], fn: (database: MockDb) => Promise<unknown>) {
  await fn(database)
  notifyChange(topics)
}

async function bySlug(slug: string): Promise<{ database: MockDb; account: Account }> {
  for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
    const database = await ensureSeeded(scenario.id)
    const account = await database.accounts.where('slug').equals(slug).first()
    if (account) return { database, account }
  }
  throw new MockHttpError('not_found', 'This page does not exist.')
}

function dateKey(iso: string, timeZone: string) {
  const p = zonedParts(new Date(iso), timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export const bookingPublicHandlers = [
  http.get(
    '/api/public/booking/:slug',
    route(async ({ params }) => {
      const { database, account } = await bySlug(String(params.slug))
      const location = await database.locations.where('accountId').equals(account.id).first()
      const page = await database.bookingPages.toCollection().first()
      const services = (await database.services.toArray()).filter((s) => s.visible)
      const staff = (await database.staffProfiles.toArray()).filter((s) => s.bookable)
      if (!location || !page) throw new MockHttpError('not_found', 'This page does not exist.')
      return json(PublicBookingPageSchema, {
        slug: account.slug,
        name: account.name,
        brandColor: account.brandColor,
        showPoweredBy: account.showPoweredBy,
        locale: location.locale,
        languages: page.languages,
        city: location.city,
        timezone: location.timezone,
        currency: location.currency,
        welcome: page.welcome,
        privacyHref: `/privacy/${account.slug}`,
        noticeHours: page.noticeHours,
        horizonDays: page.horizonDays,
        services,
        staff: staff.map((s) => ({ userId: s.userId, name: s.name, title: s.title, bookable: s.bookable })),
      })
    }),
  ),

  http.get(
    '/api/public/booking/:slug/slots',
    route(async ({ request, params }) => {
      const { database, account } = await bySlug(String(params.slug))
      const url = new URL(request.url)
      const date = url.searchParams.get('date')
      const serviceId = url.searchParams.get('serviceId')
      const staffUserId = url.searchParams.get('staffUserId')
      if (!date || !serviceId) throw new MockHttpError('validation_failed', 'Date and service are required.')
      const location = await database.locations.where('accountId').equals(account.id).first()
      const page = await database.bookingPages.toCollection().first()
      const service = await database.services.get(serviceId)
      if (!location || !page || !service) throw new MockHttpError('not_found', 'Not found.')
      let staff = await database.staffProfiles.toArray()
      if (staffUserId) staff = staff.filter((s) => s.userId === staffUserId)
      const slots = listSlots({
        date,
        service,
        staff,
        appointments: await database.appointments.toArray(),
        holds: await database.slotHolds.toArray(),
        timeZone: location.timezone,
        noticeHours: page.noticeHours,
      })
      return json(SlotListSchema, slots)
    }),
  ),

  http.post(
    '/api/public/booking/hold',
    route(async ({ request }) => {
      const input = await parseBody(request, HoldSlotSchema)
      const { database, account } = await bySlug(input.slug)
      const service = await database.services.get(input.serviceId)
      const location = await database.locations.where('accountId').equals(account.id).first()
      const page = await database.bookingPages.toCollection().first()
      if (!service || !location || !page) throw new MockHttpError('not_found', 'Not found.')
      const staff = (await database.staffProfiles.toArray()).filter((s) => (input.staffUserId ? s.userId === input.staffUserId : true))
      const date = dateKey(input.startsAt, location.timezone)
      const slots = listSlots({
        date,
        service,
        staff,
        appointments: await database.appointments.toArray(),
        holds: await database.slotHolds.toArray(),
        timeZone: location.timezone,
        noticeHours: page.noticeHours,
        ignoreHoldToken: input.token,
      })
      const slot = slots.find((item) => item.startsAt === input.startsAt && (!input.staffUserId || item.staffUserId === input.staffUserId))
      if (!slot || slot.remaining === 0) throw new MockHttpError('conflict', 'That slot is no longer available.')
      const expiresAt = new Date(now().getTime() + HOLD_MS).toISOString()
      const token = input.token ?? `hld_${crypto.randomUUID()}`
      await save(database, ['slots', 'public-booking'], async (d) => {
        if (input.token) {
          const existing = (await d.slotHolds.toArray()).find((h) => h.token === input.token)
          if (existing) await d.slotHolds.delete(existing.id)
        }
        await d.slotHolds.put({
          id: `hld_${crypto.randomUUID()}`,
          accountId: account.id,
          locationId: location.id,
          serviceId: service.id,
          staffUserId: slot.staffUserId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          expiresAt,
          token,
          createdAt: now().toISOString(),
          createdBy: { kind: 'booking_page' },
        })
      })
      return json(HoldResponseSchema, { token, expiresAt, slot: { ...slot, held: true } })
    }),
  ),

  http.post(
    '/api/public/booking/confirm',
    route(async ({ request }) => {
      const input = await parseBody(request, ConfirmBookingSchema)
      if (input.honeypot) throw new MockHttpError('validation_failed', 'Unable to book.')
      const { database, account } = await bySlug(input.slug)
      const hold = (await database.slotHolds.toArray()).find((h) => h.token === input.token)
      if (!hold || new Date(hold.expiresAt).getTime() <= now().getTime()) {
        throw new MockHttpError('conflict', 'Your held slot expired. Pick another time.')
      }
      const service = await database.services.get(hold.serviceId)
      const profile = (await database.staffProfiles.toArray()).find((s) => s.userId === hold.staffUserId)
      const location = await database.locations.get(hold.locationId)
      if (!service || !profile || !location) throw new MockHttpError('not_found', 'Not found.')
      const others = (await database.appointments.toArray()).filter((a) => a.id)
      if (slotTaken(others, [], hold.staffUserId, hold.startsAt, hold.endsAt)) {
        throw new MockHttpError('conflict', 'That slot is already booked.')
      }
      let contact = (await database.contacts.toArray()).find((c) => c.phone === input.phone || (input.email && c.email === input.email))
      const appointment: Appointment = {
        id: `apt_${crypto.randomUUID()}`,
        accountId: account.id,
        locationId: location.id,
        contactId: contact?.id ?? `con_${crypto.randomUUID()}`,
        staffUserId: profile.userId,
        staffName: profile.name,
        contactName: `${input.firstName} ${input.lastName}`,
        serviceId: service.id,
        service: service.name,
        startsAt: hold.startsAt,
        endsAt: hold.endsAt,
        status: service.instantBook ? 'booked' : 'requested',
        noshowRisk: false,
        price: service.price,
        depositAmount: service.depositAmount,
        depositStatus: input.payDeposit && service.depositAmount ? 'paid' : service.depositAmount ? 'pending' : 'none',
        source: input.source,
        notes: input.notes ?? '',
        manageToken: `mng_${crypto.randomUUID()}`,
        capacity: service.capacity,
        attendeeCount: 1,
        createdAt: now().toISOString(),
        createdBy: { kind: 'booking_page' },
      }
      await save(database, ['appointments', 'slots', 'home', 'contacts', 'public-booking', 'pipeline'], async (d) => {
        if (!contact) {
          contact = {
            id: appointment.contactId,
            accountId: account.id,
            locationId: location.id,
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            email: input.email || null,
            tags: ['New'],
            language: 'en',
            assignedUserId: null,
            stage: 'Booked',
            value: service.price,
            sourceLabel: 'booking_page',
            customFields: {},
            consents: [
              {
                channel: 'whatsapp',
                status: 'granted',
                source: 'booking_page',
                wordingVersion: '2026-09',
                recordedAt: now().toISOString(),
              },
            ],
            optedOut: false,
            companyId: null,
            createdAt: now().toISOString(),
            createdBy: { kind: 'booking_page' },
          }
          await d.contacts.put(contact)
        }
        await d.appointments.put(appointment)
        const held = (await d.slotHolds.toArray()).find((h) => h.token === input.token)
        if (held) await d.slotHolds.delete(held.id)
      })
      return json(BookingConfirmationSchema, {
        appointment,
        manageHref: `/b/${account.slug}/manage/${appointment.manageToken}`,
        timezone: location.timezone,
      })
    }),
  ),

  http.post(
    '/api/public/booking/abandon',
    route(async ({ request }) => {
      const input = await parseBody(request, AbandonBookingSchema)
      const { database, account } = await bySlug(input.slug)
      const location = await database.locations.where('accountId').equals(account.id).first()
      if (!location) throw new MockHttpError('not_found', 'Not found.')
      const existing = (await database.contacts.toArray()).find((c) => c.phone === input.phone)
      if (existing) return json(AbandonBookingSchema, input)
      const contactId = `con_${crypto.randomUUID()}`
      const at = now().toISOString()
      await save(database, ['contacts', 'leads'], async (d) => {
        await d.contacts.put({
          id: contactId,
          accountId: account.id,
          locationId: location.id,
          firstName: input.firstName || 'Guest',
          lastName: input.lastName || '',
          phone: input.phone,
          email: null,
          tags: ['Abandoned booking'],
          language: 'en',
          assignedUserId: null,
          stage: 'New',
          value: null,
          sourceLabel: 'booking_page',
          customFields: {},
          consents: [],
          optedOut: false,
          companyId: null,
          createdAt: at,
          createdBy: { kind: 'booking_page' },
        })
        await d.leads.put({
          id: `lead_${crypto.randomUUID().slice(0, 8)}`,
          accountId: account.id,
          locationId: location.id,
          contactId,
          contactName: `${input.firstName || 'Guest'} ${input.lastName || ''}`.trim(),
          status: 'new',
          source: 'booking_page',
          assignedUserId: null,
          assignedName: null,
          lastActivityAt: at,
          nextFollowUpAt: at,
          opportunityId: null,
          aiSuggested: false,
          createdAt: at,
          createdBy: { kind: 'booking_page' },
        })
      })
      return json(AbandonBookingSchema, input)
    }),
  ),

  http.get(
    '/api/public/booking/manage/:token',
    route(async ({ params }) => {
      for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
        const database = await ensureSeeded(scenario.id)
        const appointment = (await database.appointments.toArray()).find((a) => a.manageToken === String(params.token))
        if (!appointment) continue
        const account = await database.accounts.get(appointment.accountId)
        const location = await database.locations.get(appointment.locationId)
        if (!account || !location) continue
        const hoursLeft = (new Date(appointment.startsAt).getTime() - now().getTime()) / 3_600_000
        return json(ManageBookingSchema, {
          appointment,
          timezone: location.timezone,
          business: account.name,
          canCancel: appointment.status === 'booked' && hoursLeft >= 24,
          canReschedule: appointment.status === 'booked' && hoursLeft >= 2,
          policy: 'Cancel at least 24 hours ahead. Reschedule up to 2 hours ahead.',
        })
      }
      throw new MockHttpError('not_found', 'This manage link has expired or is not valid.')
    }),
  ),

  http.post(
    '/api/public/booking/manage/:token/cancel',
    route(async ({ params }) => {
      for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
        const database = await ensureSeeded(scenario.id)
        const appointment = (await database.appointments.toArray()).find((a) => a.manageToken === String(params.token))
        if (!appointment) continue
        await save(database, ['appointments', 'slots', 'home', 'public-booking'], (d) =>
          d.appointments.update(appointment.id, { status: 'cancelled' }),
        )
        const updated = await (await ensureSeeded(scenario.id)).appointments.get(appointment.id)
        const location = await database.locations.get(appointment.locationId)
        const account = await database.accounts.get(appointment.accountId)
        return json(ManageBookingSchema, {
          appointment: updated!,
          timezone: location!.timezone,
          business: account!.name,
          canCancel: false,
          canReschedule: false,
          policy: 'This booking was cancelled.',
        })
      }
      throw new MockHttpError('not_found', 'This manage link has expired or is not valid.')
    }),
  ),

  http.post(
    '/api/public/booking/manage/:token/reschedule',
    route(async ({ request, params }) => {
      const input = await parseBody(request, RescheduleBookingSchema)
      for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
        const database = await ensureSeeded(scenario.id)
        const appointment = (await database.appointments.toArray()).find((a) => a.manageToken === String(params.token))
        if (!appointment) continue
        const duration = new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()
        const endsAt = new Date(new Date(input.startsAt).getTime() + duration).toISOString()
        const staffId = input.staffUserId ?? appointment.staffUserId
        const taken = slotTaken(
          (await database.appointments.toArray()).filter((a) => a.id !== appointment.id),
          await database.slotHolds.toArray(),
          staffId,
          input.startsAt,
          endsAt,
        )
        if (taken) throw new MockHttpError('conflict', 'That slot is already booked.')
        await save(database, ['appointments', 'slots', 'home', 'public-booking'], (d) =>
          d.appointments.update(appointment.id, { startsAt: input.startsAt, endsAt, staffUserId: staffId, status: 'booked' }),
        )
        const updated = await (await ensureSeeded(scenario.id)).appointments.get(appointment.id)
        const location = await database.locations.get(appointment.locationId)
        const account = await database.accounts.get(appointment.accountId)
        return json(ManageBookingSchema, {
          appointment: updated!,
          timezone: location!.timezone,
          business: account!.name,
          canCancel: true,
          canReschedule: true,
          policy: 'Cancel at least 24 hours ahead. Reschedule up to 2 hours ahead.',
        })
      }
      throw new MockHttpError('not_found', 'This manage link has expired or is not valid.')
    }),
  ),

  http.post(
    '/api/public/booking/waitlist',
    route(async ({ request }) => {
      const input = await parseBody(request, JoinWaitlistSchema)
      const { database, account } = await bySlug(input.slug)
      const location = await database.locations.where('accountId').equals(account.id).first()
      const service = await database.services.get(input.serviceId)
      if (!location || !service) throw new MockHttpError('not_found', 'Not found.')
      const entry = {
        id: `wtl_${crypto.randomUUID().slice(0, 8)}`,
        accountId: account.id,
        locationId: location.id,
        serviceId: service.id,
        staffUserId: input.staffUserId ?? null,
        startsAt: input.startsAt ?? now().toISOString(),
        phone: input.phone,
        name: input.name,
        createdAt: now().toISOString(),
        createdBy: { kind: 'booking_page' as const },
      }
      await save(database, ['appointments', 'public-booking'], async (d) => {
        await d.waitlist.put(entry)
      })
      return json(WaitlistEntrySchema, entry)
    }),
  ),
]

void fromZoned
