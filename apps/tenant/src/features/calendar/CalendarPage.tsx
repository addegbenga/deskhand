import { Link } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDateTime, formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea, type Appointment } from '@deskhand/schemas'
import {
  AppointmentChip,
  Banner,
  Button,
  CALENDAR_HOURS,
  CalendarStaffGrid,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  ErrorState,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useContacts } from '../../api/crm'
import { useCalendar, useCreateAppointment, usePatchAppointment, usePatchLocationTimezone, useServices, useSlots } from '../../api/booking'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

function startOfDay(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  return start
}

function viewRange(cursor: Date, view: 'day' | 'week' | 'month') {
  const start = startOfDay(cursor)
  if (view === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  if (view === 'month') start.setDate(1)
  const end = new Date(start)
  if (view === 'day') end.setDate(end.getDate() + 1)
  if (view === 'week') end.setDate(end.getDate() + 7)
  if (view === 'month') end.setMonth(end.getMonth() + 1)
  return { from: start.toISOString(), to: end.toISOString(), start, end }
}

function shiftCursor(cursor: Date, view: 'day' | 'week' | 'month', dir: -1 | 1) {
  const next = new Date(cursor)
  if (view === 'day') next.setDate(next.getDate() + dir)
  if (view === 'week') next.setDate(next.getDate() + 7 * dir)
  if (view === 'month') next.setMonth(next.getMonth() + dir)
  return next
}

function ymd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function appointmentDay(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function daysBetween(start: Date, end: Date) {
  const days: Date[] = []
  const cursor = new Date(start)
  while (cursor < end) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

function monthCells(monthStart: Date) {
  const gridStart = startOfDay(monthStart)
  gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const cell = new Date(gridStart)
    cell.setDate(gridStart.getDate() + index)
    return cell
  })
}

export function CalendarPage() {
  const { t } = useTranslation(['calendar', 'common'])
  const session = useSession()
  const { locationId, location } = useSelectedLocation(session)
  const ctx = useLocaleContext(session)
  const access = usePermission('calendar.edit')
  const [cursor, setCursor] = useState(() => new Date())
  const [view, setView] = useState<'day' | 'week' | 'month'>('day')
  const range = viewRange(cursor, view)
  const cal = useCalendar(locationId, range.from, range.to)
  const [selected, setSelected] = useState<Appointment | null>(null)
  const [create, setCreate] = useState(false)
  const [dragging, setDragging] = useState<Appointment | null>(null)
  const patch = usePatchAppointment()
  const tz = usePatchLocationTimezone()

  const staff = cal.data?.staff.filter((s) => s.bookable) ?? []
  const hourLabel = (hour: number) =>
    new Intl.DateTimeFormat(ctx.locale, { hour: 'numeric', timeZone: ctx.timeZone }).format(new Date(Date.UTC(2020, 0, 1, hour)))

  const byCell = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const item of cal.data?.appointments ?? []) {
      if (item.status === 'cancelled') continue
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.timeZone, hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(item.startsAt))
      const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
      const key = `${item.staffUserId}:${hour}`
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [cal.data, ctx.timeZone])

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const item of cal.data?.appointments ?? []) {
      if (item.status === 'cancelled') continue
      const key = appointmentDay(item.startsAt, ctx.timeZone)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [cal.data, ctx.timeZone])

  if (!canSeeArea(session.membership.role, 'bookings')) {
    return (
      <PageContainer>
        <PageHeader title={t('title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  const dropOn = (staffUserId: string, hour: number) => {
    if (!dragging || !access.allowed) return
    const start = new Date(dragging.startsAt)
    const local = new Date(start)
    const asParts = new Intl.DateTimeFormat('en-CA', { timeZone: ctx.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(start)
    const [y, m, d] = asParts.split('-').map(Number)
    const next = new Date(Date.UTC(y!, m! - 1, d!, hour, 0))
    void patch
      .mutateAsync({ id: dragging.id, startsAt: next.toISOString(), staffUserId })
      .then(() => toast.success(t('drawer.reschedule')))
      .catch(() => toast.error(t('clash')))
    setDragging(null)
    void local
  }

  return (
    <PageContainer className="flex max-w-none flex-col">
      <PageHeader
        title={t('title')}
        description={t('timezone', { zone: ctx.timeZone.replace(/_/g, ' ') })}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/services">{t('services')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/staff">{t('staff')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/booking-page">{t('bookingPage')}</Link>
            </Button>
            {access.allowed && (
              <Button size="sm" onClick={() => setCreate(true)}>
                {t('create')}
              </Button>
            )}
          </div>
        }
      />
      {cal.data?.disconnected && (
        <Banner severity="attention" className="mb-4" title={t('disconnected')} action={<a href="/app/connections" className="underline">{t('fixConnection')}</a>} />
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" aria-label={t('day')} onClick={() => setCursor(shiftCursor(cursor, view, -1))}>
          <ChevronLeft className="rtl:rotate-180" />
        </Button>
        <p className="text-sm font-medium">
          {view === 'day'
            ? formatDateTime(cursor.toISOString(), ctx, { dateStyle: 'full' })
            : view === 'week'
              ? `${formatDateTime(range.start.toISOString(), ctx, { dateStyle: 'medium' })} – ${formatDateTime(new Date(range.end.getTime() - 1).toISOString(), ctx, { dateStyle: 'medium' })}`
              : formatDateTime(range.start.toISOString(), ctx, { month: 'long', year: 'numeric' })}
        </p>
        <Button size="sm" variant="outline" aria-label={t('day')} onClick={() => setCursor(shiftCursor(cursor, view, 1))}>
          <ChevronRight className="rtl:rotate-180" />
        </Button>
        {(['day', 'week', 'month'] as const).map((item) => (
          <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} onClick={() => setView(item)}>
            {t(item)}
          </Button>
        ))}
        {location && access.allowed && (
          <Select value={location.timezone} onValueChange={(timezone) => void tz.mutate({ id: location.id, timezone })}>
            <SelectTrigger className="w-48" aria-label={t('changeTimezone')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['Africa/Lagos', 'Europe/London', 'America/Chicago', 'Africa/Nairobi'].map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {cal.isPending && <Skeleton className="h-96" />}
      {cal.isError && <ErrorState onRetry={() => void cal.refetch()} />}
      {cal.data && cal.data.services.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <Button asChild>
              <Link to="/app/services">{t('empty.cta')}</Link>
            </Button>
          }
        />
      )}
      {cal.data && cal.data.services.length > 0 && view === 'month' && (
        <div className="grid grid-cols-7 gap-1">
          {monthCells(range.start).map((cell) => {
            const key = appointmentDay(new Date(`${ymd(cell)}T12:00:00`).toISOString(), ctx.timeZone)
            const inMonth = cell.getMonth() === range.start.getMonth()
            return (
              <div key={key} className={`min-h-24 rounded-md border border-border p-1 ${inMonth ? '' : 'opacity-40'}`}>
                <p className="text-xs text-fg-muted">{cell.getDate()}</p>
                {(byDay.get(key) ?? []).map((item) => (
                  <AppointmentChip key={item.id} onClick={() => setSelected(item)}>
                    {t('chip', { service: item.service, name: item.contactName })}
                  </AppointmentChip>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {cal.data && cal.data.services.length > 0 && view === 'week' && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {daysBetween(range.start, range.end).map((cell) => {
            const key = appointmentDay(new Date(`${ymd(cell)}T12:00:00`).toISOString(), ctx.timeZone)
            return (
              <div key={ymd(cell)} className="min-h-40 rounded-md border border-border p-2">
                <p className="mb-2 text-xs font-medium">{formatDateTime(cell.toISOString(), ctx, { weekday: 'short', day: 'numeric' })}</p>
                {(byDay.get(key) ?? []).map((item) => (
                  <AppointmentChip
                    key={item.id}
                    tone={item.status === 'no_show' ? 'danger' : item.noshowRisk ? 'attention' : 'brand'}
                    onClick={() => setSelected(item)}
                  >
                    {t('chip', { service: item.service, name: item.contactName })}
                  </AppointmentChip>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {cal.data && cal.data.services.length > 0 && view === 'day' && (
        <CalendarStaffGrid
          staff={staff.map((s) => ({ id: s.userId, name: s.name }))}
          hourLabel={hourLabel}
          cells={(staffId, hour) => (
            <div
              className="min-h-14"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(staffId, hour)}
            >
              {(byCell.get(`${staffId}:${hour}`) ?? []).map((item) => (
                <AppointmentChip
                  key={item.id}
                  tone={item.status === 'no_show' ? 'danger' : item.noshowRisk ? 'attention' : 'brand'}
                  draggable={access.allowed}
                  onDragStart={() => setDragging(item)}
                  onClick={() => setSelected(item)}
                >
                  {t('chip', { service: item.service, name: item.contactName })}
                </AppointmentChip>
              ))}
            </div>
          )}
        />
      )}
      <p className="sr-only">{CALENDAR_HOURS.join(' ')}</p>
      <Dialog open={Boolean(selected)} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogTitle>{t('drawer.title')}</DialogTitle>
              <p className="mt-2 font-medium">{selected.contactName}</p>
              <p className="text-sm text-fg-muted">
                {selected.service} · {formatDateTime(selected.startsAt, ctx)} · {selected.staffName}
              </p>
              <p className="mt-1 text-sm">{t('drawer.deposit', { status: t(`common:status.payment.${selected.depositStatus === 'none' ? 'paid' : selected.depositStatus}`) })}</p>
              <p className="text-xs text-fg-muted">{t('drawer.source', { source: selected.source })}</p>
              {access.allowed && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void patch.mutate({ id: selected.id, status: 'completed' })}>
                    {t('drawer.complete')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void patch.mutate({ id: selected.id, status: 'no_show' })}>
                    {t('drawer.noshow')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void patch.mutate({ id: selected.id, status: 'cancelled' })}>
                    {t('drawer.cancel')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(t('drawer.sent'))}>
                    {t('drawer.remind')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(t('drawer.sent'))}>
                    {t('drawer.pay')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(t('drawer.sent'))}>
                    {t('drawer.message')}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      <CreateBookingDialog open={create} onOpenChange={setCreate} />
    </PageContainer>
  )
}

function CreateBookingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation(['calendar', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = useLocaleContext(session)
  const contacts = useContacts({ q: '', locationId })
  const services = useServices()
  const [contactId, setContactId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [staffUserId, setStaffUserId] = useState('')
  const [slot, setSlot] = useState('')
  const date = new Date().toISOString().slice(0, 10)
  const slots = useSlots(date, serviceId || null)
  const create = useCreateAppointment()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t('create')}</DialogTitle>
        <div className="mt-3 space-y-3">
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger aria-label={t('createForm.contact')}>
              <SelectValue placeholder={t('createForm.contact')} />
            </SelectTrigger>
            <SelectContent>
              {(contacts.data?.items ?? []).slice(0, 20).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger aria-label={t('createForm.service')}>
              <SelectValue placeholder={t('createForm.service')} />
            </SelectTrigger>
            <SelectContent>
              {(services.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {formatMoney(s.price, ctx.currency, ctx.locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={slot} onValueChange={(value) => {
            setSlot(value)
            const found = slots.data?.find((s) => s.startsAt === value)
            if (found) setStaffUserId(found.staffUserId)
          }}>
            <SelectTrigger aria-label={t('createForm.slot')}>
              <SelectValue placeholder={t('createForm.slot')} />
            </SelectTrigger>
            <SelectContent>
              {(slots.data ?? []).map((s) => (
                <SelectItem key={s.startsAt + s.staffUserId} value={s.startsAt}>
                  {formatDateTime(s.startsAt, ctx)} · {s.staffName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={!contactId || !serviceId || !slot}
            onClick={() => {
              void create
                .mutateAsync({ contactId, serviceId, staffUserId, startsAt: slot })
                .then(() => {
                  toast.success(t('createForm.submit'))
                  onOpenChange(false)
                })
                .catch(() => toast.error(t('clash')))
            }}
          >
            {t('createForm.submit')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
