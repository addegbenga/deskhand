import { http } from 'msw'
import {
  AppointmentSchema,
  BookingPageSettingsSchema,
  CalendarPayloadSchema,
  CreateAppointmentSchema,
  CreateServiceSchema,
  PatchAppointmentSchema,
  ServiceListSchema,
  ServiceSchema,
  SlotListSchema,
  StaffListSchema,
  StaffProfileSchema,
  type Session,
} from '@deskhand/schemas'
import { localId } from '../onboarding/state'
import { now } from '../clock'
import { listSlots, slotTaken } from '../availability'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

function inScope(session: Session, locationId: string | null) {
  const allowed = new Set(session.locations.map((l) => l.id))
  return (id: string) => allowed.has(id) && (!locationId || id === locationId)
}

function staffAppointments(session: Session, staffUserId: string) {
  if (session.membership.role !== 'staff') return true
  return staffUserId === session.user.id
}

export const calendarHandlers = [
  http.get(
    `${API}/calendar`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      const url = new URL(request.url)
      const locationId = url.searchParams.get('locationId') ?? session.locations[0]?.id ?? null
      const from = url.searchParams.get('from')
      const to = url.searchParams.get('to')
      const ok = inScope(session, locationId)
      const database = await db()
      const location = session.locations.find((l) => l.id === locationId) ?? session.locations[0]
      const appointments = (await database.appointments.toArray()).filter((item) => {
        if (!ok(item.locationId) || !staffAppointments(session, item.staffUserId)) return false
        if (from && item.startsAt < from) return false
        if (to && item.startsAt > to) return false
        return true
      })
      const connections = await database.connections.where('kind').equals('google_calendar').first()
      const allStaff = (await database.staffProfiles.toArray()).filter((s) => s.accountId === session.account.id)
      const hereStaff = allStaff.filter((s) => !locationId || s.locationId === locationId)
      const allServices = (await database.services.toArray()).filter((s) => s.accountId === session.account.id)
      const hereServices = allServices.filter((s) => !locationId || s.locationId === locationId)
      return json(CalendarPayloadSchema, {
        timezone: location?.timezone ?? 'Africa/Lagos',
        staff: hereStaff.length ? hereStaff : allStaff,
        services: hereServices.length ? hereServices : allServices,
        appointments,
        disconnected: connections?.health === 'broken',
      })
    }),
  ),

  http.get(
    `${API}/services`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      return json(ServiceListSchema, await (await db()).services.toArray())
    }),
  ),

  http.post(
    `${API}/services`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const body = await parseBody(request, CreateServiceSchema)
      const locationId = session.locations[0]?.id
      if (!locationId) throw new MockHttpError('validation_failed', 'No location on this account.')
      const database = await db()
      const staff = (await database.staffProfiles.toArray()).filter((row) => row.accountId === session.account.id)
      const existing = (await database.services.toArray()).filter((row) => row.accountId === session.account.id)
      const created = await write(['appointments', 'slots', 'public-booking', 'onboarding'], async (d) => {
        const service = {
          id: localId('svc'),
          accountId: session.account.id,
          locationId,
          name: body.name,
          description: body.description?.trim() || body.name,
          durationMinutes: body.durationMinutes,
          bufferMinutes: body.bufferMinutes ?? 15,
          price: body.price,
          currency: session.locations[0]?.currency ?? 'NGN',
          depositAmount: body.depositAmount ?? 0,
          staffUserIds: staff.length ? staff.map((row) => row.userId) : [session.user.id],
          capacity: body.capacity ?? 1,
          visible: body.visible ?? true,
          order: existing.length,
          instantBook: body.instantBook ?? true,
          createdAt: now().toISOString(),
          createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
        }
        await d.services.add(service)
        return service
      })
      return json(ServiceSchema, created, 201)
    }),
  ),

  http.patch(
    `${API}/services/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(request, ServiceSchema.pick({ visible: true, price: true, depositAmount: true, name: true, durationMinutes: true }).partial())
      const service = await (await db()).services.get(String(params.id))
      if (!service) throw new MockHttpError('not_found', 'Service not found.')
      await write(['appointments', 'slots', 'public-booking'], (d) => d.services.update(service.id, patch))
      const updated = await (await db()).services.get(service.id)
      return json(ServiceSchema, updated!)
    }),
  ),

  http.get(
    `${API}/staff-profiles`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      return json(StaffListSchema, await (await db()).staffProfiles.toArray())
    }),
  ),

  http.patch(
    `${API}/staff-profiles/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(request, StaffProfileSchema.pick({ bookable: true, weeklyHours: true }).partial())
      const profile = await (await db()).staffProfiles.get(String(params.id))
      if (!profile) throw new MockHttpError('not_found', 'Staff not found.')
      await write(['appointments', 'slots'], (d) => d.staffProfiles.update(profile.id, patch))
      const updated = await (await db()).staffProfiles.get(profile.id)
      return json(StaffProfileSchema, updated!)
    }),
  ),

  http.get(
    `${API}/booking-page`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      const page = await (await db()).bookingPages.toCollection().first()
      if (!page) throw new MockHttpError('not_found', 'Booking page not set up.')
      return json(BookingPageSettingsSchema, page)
    }),
  ),

  http.patch(
    `${API}/booking-page`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(request, BookingPageSettingsSchema.pick({ welcome: true, noticeHours: true, horizonDays: true, instantBook: true, consentText: true }).partial())
      const page = await (await db()).bookingPages.toCollection().first()
      if (!page) throw new MockHttpError('not_found', 'Booking page not set up.')
      await write(['public-booking'], (d) => d.bookingPages.update(page.id, patch))
      const updated = await (await db()).bookingPages.get(page.id)
      return json(BookingPageSettingsSchema, updated!)
    }),
  ),

  http.get(
    `${API}/slots`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      const url = new URL(request.url)
      const date = url.searchParams.get('date')
      const serviceId = url.searchParams.get('serviceId')
      if (!date || !serviceId) throw new MockHttpError('validation_failed', 'Date and service are required.')
      const database = await db()
      const service = await database.services.get(serviceId)
      const page = await database.bookingPages.toCollection().first()
      const location = session.locations[0]
      if (!service || !location) throw new MockHttpError('not_found', 'Not found.')
      const slots = listSlots({
        date,
        service,
        staff: await database.staffProfiles.toArray(),
        appointments: await database.appointments.toArray(),
        holds: await database.slotHolds.toArray(),
        timeZone: location.timezone,
        noticeHours: page?.noticeHours ?? 2,
      })
      return json(SlotListSchema, slots)
    }),
  ),

  http.post(
    `${API}/appointments`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const input = await parseBody(request, CreateAppointmentSchema)
      const database = await db()
      const service = await database.services.get(input.serviceId)
      const contact = await database.contacts.get(input.contactId)
      const profile = (await database.staffProfiles.toArray()).find((s) => s.userId === input.staffUserId)
      if (!service || !contact || !profile) throw new MockHttpError('not_found', 'Missing service, contact or staff.')
      const starts = new Date(input.startsAt)
      const ends = new Date(starts.getTime() + service.durationMinutes * 60_000)
      const taken = slotTaken(await database.appointments.toArray(), await database.slotHolds.toArray(), input.staffUserId, starts.toISOString(), ends.toISOString())
      if (taken && !input.overrideReason) {
        throw new MockHttpError('conflict', 'That slot is already booked.')
      }
      if (taken && session.membership.role === 'staff') {
        throw new MockHttpError('forbidden', 'A manager needs to override a clash.')
      }
      const appointment = {
        id: `apt_${crypto.randomUUID()}`,
        accountId: session.account.id,
        locationId: contact.locationId,
        contactId: contact.id,
        staffUserId: profile.userId,
        staffName: profile.name,
        contactName: `${contact.firstName} ${contact.lastName}`,
        serviceId: service.id,
        service: service.name,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        status: service.instantBook ? ('booked' as const) : ('requested' as const),
        noshowRisk: false,
        price: service.price,
        depositAmount: input.requestDeposit ? service.depositAmount : 0,
        depositStatus: input.requestDeposit && service.depositAmount ? ('pending' as const) : ('none' as const),
        source: 'staff' as const,
        notes: input.notes ?? input.overrideReason ?? '',
        manageToken: `mng_${crypto.randomUUID()}`,
        capacity: service.capacity,
        attendeeCount: 1,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
      }
      await write(['appointments', 'slots', 'home', 'public-booking'], (d) => d.appointments.put(appointment))
      return json(AppointmentSchema, appointment, 201)
    }),
  ),

  http.patch(
    `${API}/appointments/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(request, PatchAppointmentSchema)
      const appointment = await (await db()).appointments.get(String(params.id))
      if (!appointment || !staffAppointments(session, appointment.staffUserId)) throw new MockHttpError('not_found', 'Booking not found.')
      if (patch.startsAt) {
        const duration = new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime()
        const endsAt = new Date(new Date(patch.startsAt).getTime() + duration).toISOString()
        const staffId = patch.staffUserId ?? appointment.staffUserId
        const taken = slotTaken(
          (await (await db()).appointments.toArray()).filter((item) => item.id !== appointment.id),
          await (await db()).slotHolds.toArray(),
          staffId,
          patch.startsAt,
          endsAt,
        )
        if (taken) throw new MockHttpError('conflict', 'That slot is already booked.')
        await write(['appointments', 'slots', 'home', 'public-booking'], (d) =>
          d.appointments.update(appointment.id, { ...patch, endsAt, staffUserId: staffId }),
        )
      } else {
        await write(['appointments', 'slots', 'home', 'public-booking'], (d) => d.appointments.update(appointment.id, patch))
      }
      const updated = await (await db()).appointments.get(appointment.id)
      return json(AppointmentSchema, updated!)
    }),
  ),
]
