import type { Appointment, Service, Slot, SlotHold, StaffProfile } from '@deskhand/schemas'
import { MINUTE, now } from './clock'

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  })
  const map = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    weekday: WEEKDAYS[map.weekday ?? 'Mon'] ?? 1,
  }
}

export function fromZoned(year: number, month: number, day: number, hour: number, minute: number, timeZone: string): Date {
  let utc = Date.UTC(year, month - 1, day, hour, minute)
  for (let i = 0; i < 4; i++) {
    const parts = zonedParts(new Date(utc), timeZone)
    const want = Date.UTC(year, month - 1, day, hour, minute)
    const got = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
    utc += want - got
  }
  return new Date(utc)
}

export function parseHm(value: string): [number, number] {
  const [h, m] = value.split(':').map(Number)
  return [h ?? 0, m ?? 0]
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

export function activeHold(hold: SlotHold, at = now()) {
  return new Date(hold.expiresAt).getTime() > at.getTime()
}

export function busyWindows(
  appointments: Appointment[],
  holds: SlotHold[],
  staffUserId: string,
  at = now(),
  ignoreHoldToken?: string,
): { start: number; end: number }[] {
  const busy: { start: number; end: number }[] = []
  for (const appointment of appointments) {
    if (appointment.staffUserId !== staffUserId) continue
    if (appointment.status === 'cancelled') continue
    busy.push({ start: new Date(appointment.startsAt).getTime(), end: new Date(appointment.endsAt).getTime() })
  }
  for (const hold of holds) {
    if (hold.staffUserId !== staffUserId) continue
    if (ignoreHoldToken && hold.token === ignoreHoldToken) continue
    if (!activeHold(hold, at)) continue
    busy.push({ start: new Date(hold.startsAt).getTime(), end: new Date(hold.endsAt).getTime() })
  }
  return busy
}

export function listSlots(input: {
  date: string
  service: Service
  staff: StaffProfile[]
  appointments: Appointment[]
  holds: SlotHold[]
  timeZone: string
  noticeHours: number
  at?: Date
  ignoreHoldToken?: string
}): Slot[] {
  const at = input.at ?? now()
  const [year, month, day] = input.date.split('-').map(Number)
  const noticeUntil = at.getTime() + input.noticeHours * 60 * MINUTE
  const step = (input.service.durationMinutes + input.service.bufferMinutes) * MINUTE
  const duration = input.service.durationMinutes * MINUTE
  const slots: Slot[] = []

  for (const member of input.staff.filter((s) => s.bookable && input.service.staffUserIds.includes(s.userId))) {
    const weekday = zonedParts(fromZoned(year!, month!, day!, 12, 0, input.timeZone), input.timeZone).weekday
    const hours = member.weeklyHours.filter((h) => h.weekday === weekday)
    const busy = busyWindows(input.appointments, input.holds, member.userId, at, input.ignoreHoldToken)
    for (const block of hours) {
      const [sh, sm] = parseHm(block.start)
      const [eh, em] = parseHm(block.end)
      let cursor = fromZoned(year!, month!, day!, sh, sm, input.timeZone).getTime()
      const end = fromZoned(year!, month!, day!, eh, em, input.timeZone).getTime()
      while (cursor + duration <= end) {
        const start = cursor
        const finish = start + duration
        cursor += step
        if (start < noticeUntil) continue
        const taken = busy.filter((window) => overlaps(start, finish, window.start, window.end)).length
        const remaining = Math.max(0, input.service.capacity - taken)
        if (remaining === 0) continue
        const held = input.holds.some(
          (hold) =>
            hold.staffUserId === member.userId &&
            activeHold(hold, at) &&
            hold.token !== input.ignoreHoldToken &&
            overlaps(start, finish, new Date(hold.startsAt).getTime(), new Date(hold.endsAt).getTime()),
        )
        slots.push({
          startsAt: new Date(start).toISOString(),
          endsAt: new Date(finish).toISOString(),
          staffUserId: member.userId,
          staffName: member.name,
          remaining,
          held,
        })
      }
    }
  }
  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export function slotTaken(
  appointments: Appointment[],
  holds: SlotHold[],
  staffUserId: string,
  startsAt: string,
  endsAt: string,
  at = now(),
  ignoreHoldToken?: string,
) {
  const start = new Date(startsAt).getTime()
  const end = new Date(endsAt).getTime()
  return busyWindows(appointments, holds, staffUserId, at, ignoreHoldToken).some((window) => overlaps(start, end, window.start, window.end))
}
