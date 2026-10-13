import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { formatDateTime, formatMoney, useTranslation } from '@deskhand/i18n'
import {
  BookingConfirmationSchema,
  HoldResponseSchema,
  PublicBookingPageSchema,
  SlotListSchema,
  WaitlistEntrySchema,
  isApiError,
  type PublicBookingPage,
  type Slot,
} from '@deskhand/schemas'
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from '@deskhand/ui'
import { api } from '../api'

type Step = 'service' | 'staff' | 'slot' | 'details' | 'deposit' | 'done'

export function BookingFlow({ slug, source = 'page' }: { slug: string; source?: 'page' | 'embed' }) {
  const { t, i18n } = useTranslation('public')
  const page = useQuery({
    queryKey: ['public-booking', slug],
    queryFn: ({ signal }) => api(`/public/booking/${slug}`, { schema: PublicBookingPageSchema, signal }),
  })
  const [step, setStep] = useState<Step>('service')
  const [serviceId, setServiceId] = useState<string>()
  const [staffUserId, setStaffUserId] = useState<string>()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [hold, setHold] = useState<{ token: string; expiresAt: string; slot: Slot } | null>(null)
  const [leftMs, setLeftMs] = useState(0)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [consent, setConsent] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [done, setDone] = useState<{ manageHref: string; when: string; service: string; staff: string } | null>(null)
  const [waitlisted, setWaitlisted] = useState(false)

  const data = page.data
  const service = data?.services.find((s) => s.id === serviceId)
  const visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const slots = useQuery({
    queryKey: ['slots', slug, date, serviceId, staffUserId],
    queryFn: ({ signal }) =>
      api(`/public/booking/${slug}/slots`, { schema: SlotListSchema, query: { date, serviceId, staffUserId }, signal }),
    enabled: Boolean(serviceId) && (step === 'slot' || step === 'details' || step === 'deposit'),
  })

  const holdSlot = useMutation({
    mutationFn: (startsAt: string) =>
      api('/public/booking/hold', { method: 'POST', body: { slug, serviceId, staffUserId, startsAt, token: hold?.token }, schema: HoldResponseSchema }),
  })
  const joinWaitlist = useMutation({
    mutationFn: () =>
      api('/public/booking/waitlist', {
        method: 'POST',
        body: {
          slug,
          serviceId,
          name: `${firstName} ${lastName}`.trim() || firstName,
          phone,
          staffUserId: staffUserId ?? null,
          startsAt: new Date(`${date}T12:00:00.000Z`).toISOString(),
        },
        schema: WaitlistEntrySchema,
      }),
    onSuccess: () => setWaitlisted(true),
  })
  const confirm = useMutation({
    mutationFn: (payDeposit: boolean) =>
      api('/public/booking/confirm', {
        method: 'POST',
        body: {
          slug,
          token: hold!.token,
          firstName,
          lastName,
          phone,
          email,
          notes,
          marketing,
          serviceConsent: true,
          honeypot,
          source,
          payDeposit,
        },
        schema: BookingConfirmationSchema,
      }),
  })

  useEffect(() => {
    if (!hold) return
    const tick = () => setLeftMs(Math.max(0, new Date(hold.expiresAt).getTime() - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [hold])

  useEffect(() => {
    if (!hold) return
    if (leftMs > 0) return
    if (new Date(hold.expiresAt).getTime() <= Date.now() && (step === 'details' || step === 'deposit')) {
      setHold(null)
    }
  }, [leftMs, hold, step])

  useEffect(() => {
    if (!phone || step === 'done' || done) return
    const timer = window.setTimeout(() => {
      void api('/public/booking/abandon', { method: 'POST', body: { slug, phone, firstName, lastName, serviceId } }).catch(() => undefined)
    }, 20_000)
    return () => window.clearTimeout(timer)
  }, [phone, firstName, lastName, serviceId, slug, step, done])

  const dates = useMemo(() => {
    if (!data) return []
    const out: string[] = []
    const start = new Date()
    for (let i = 0; i < data.horizonDays; i++) {
      const next = new Date(start)
      next.setDate(start.getDate() + i)
      out.push(next.toISOString().slice(0, 10))
    }
    return out
  }, [data])

  if (!data) return null
  const ctx = { locale: i18n.language === 'fr' ? 'fr-FR' : i18n.language === 'ar' ? 'ar' : data.locale, timeZone: visitorTz }

  if (done) {
    return (
      <div>
        <h2 className="text-xl font-semibold">{t('booking.confirm')}</h2>
        <p className="mt-2">{t('booking.summary', { service: done.service, staff: done.staff })}</p>
        <p className="text-fg-muted">{done.when}</p>
        <a className="mt-4 inline-block font-medium text-brand underline" href={done.manageHref}>
          {t('booking.manage')}
        </a>
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-fg-muted">{t('booking.businessTz', { zone: data.timezone.replace(/_/g, ' ') })}</p>
      <p className="text-xs text-fg-muted">{t('booking.yourTz')}</p>
      {hold && leftMs > 0 && (
        <p className="mt-2 text-sm text-attention" aria-live="polite">
          {t('booking.hold', { minutes: Math.ceil(leftMs / 60_000) })}
        </p>
      )}
      {step === 'service' && (
        <ServiceStep data={data} onPick={(id) => { setServiceId(id); setStep('staff') }} />
      )}
      {step === 'staff' && (
        <div className="mt-4 space-y-2">
          <h2 className="font-semibold">{t('booking.staff')}</h2>
          <Button variant="outline" className="w-full justify-start" onClick={() => { setStaffUserId(undefined); setStep('slot') }}>
            {t('booking.anyone')}
          </Button>
          {data.staff.map((member) => (
            <Button key={member.userId} variant="outline" className="w-full justify-start" onClick={() => { setStaffUserId(member.userId); setStep('slot') }}>
              {member.name} · {member.title}
            </Button>
          ))}
          <Button variant="ghost" onClick={() => setStep('service')}>{t('booking.back')}</Button>
        </div>
      )}
      {step === 'slot' && (
        <div className="mt-4 space-y-3">
          <h2 className="font-semibold">{t('booking.slot')}</h2>
          <Select value={date} onValueChange={setDate}>
            <SelectTrigger aria-label={t('booking.slot')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dates.map((day) => (
                <SelectItem key={day} value={day}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-2 sm:grid-cols-2">
            {(slots.data ?? []).map((item) => (
              <Button
                key={item.startsAt + item.staffUserId}
                variant="outline"
                onClick={() => {
                  void holdSlot.mutateAsync(item.startsAt).then((result) => {
                    setHold(result)
                    setLeftMs(Math.max(1, new Date(result.expiresAt).getTime() - Date.now()))
                    setStaffUserId(result.slot.staffUserId)
                    setStep('details')
                  }).catch(() => undefined)
                }}
              >
                {formatDateTime(item.startsAt, ctx, { timeStyle: 'short', dateStyle: 'medium' })}
                {item.remaining > 1 ? ` · ${t('booking.remaining', { count: item.remaining })}` : ''}
              </Button>
            ))}
          </div>
          {slots.data?.length === 0 && (
            <div className="space-y-3 text-sm">
              <p className="text-fg-muted">{t('booking.none')}</p>
              {waitlisted ? (
                <p>{t('booking.waitlisted')}</p>
              ) : (
                <form
                  className="space-y-2 rounded-md border border-border p-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void joinWaitlist.mutateAsync()
                  }}
                >
                  <Label htmlFor="waitlist-name">{t('booking.firstName')}</Label>
                  <Input id="waitlist-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
                  <Label htmlFor="waitlist-phone">{t('booking.phone')}</Label>
                  <Input id="waitlist-phone" value={phone} onChange={(event) => setPhone(event.target.value)} required />
                  <Button type="submit" size="sm" disabled={joinWaitlist.isPending || !serviceId}>
                    {t('booking.waitlist')}
                  </Button>
                </form>
              )}
              <a className="inline-block underline" href={`/l/${slug}`}>
                {t('booking.messageUs')}
              </a>
            </div>
          )}
          <Button variant="ghost" onClick={() => setStep('staff')}>{t('booking.back')}</Button>
        </div>
      )}
      {step === 'details' && (
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (service?.depositAmount) setStep('deposit')
            else {
              void confirm.mutateAsync(false).then((result) => {
                setDone({
                  manageHref: result.manageHref,
                  when: formatDateTime(result.appointment.startsAt, { locale: ctx.locale, timeZone: result.timezone }),
                  service: result.appointment.service,
                  staff: result.appointment.staffName,
                })
                setStep('done')
              })
            }
          }}
        >
          <h2 className="font-semibold">{t('booking.details')}</h2>
          <div className="hidden">
            <Label htmlFor="company">{t('booking.honeypot')}</Label>
            <Input id="company" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
          </div>
          <Input required aria-label={t('booking.firstName')} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('booking.firstName')} />
          <Input required aria-label={t('booking.lastName')} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('booking.lastName')} />
          <Input required aria-label={t('booking.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('booking.phone')} />
          <Input aria-label={t('booking.email')} value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('booking.email')} />
          <Textarea aria-label={t('booking.notes')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('booking.notes')} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {t('booking.serviceConsent')}
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            {t('booking.marketing')}
          </label>
          {isApiError(confirm.error, 'conflict') && <p className="text-sm text-danger">{t('booking.clash')}</p>}
          {!hold && <p className="text-sm text-danger">{t('booking.expired')}</p>}
          <Button type="submit" disabled={!hold}>{t('booking.next')}</Button>
          <Button type="button" variant="ghost" onClick={() => setStep('slot')}>{t('booking.back')}</Button>
        </form>
      )}
      {step === 'deposit' && service && (
        <div className="mt-4 space-y-3">
          <h2 className="font-semibold">{t('booking.deposit')}</h2>
          <p className="text-sm">{t('booking.policy')}</p>
          <Button
            onClick={() => {
              void confirm.mutateAsync(true).then((result) => {
                setDone({
                  manageHref: result.manageHref,
                  when: formatDateTime(result.appointment.startsAt, { locale: ctx.locale, timeZone: result.timezone }),
                  service: result.appointment.service,
                  staff: result.appointment.staffName,
                })
                setStep('done')
              })
            }}
          >
            {t('booking.pay', { amount: formatMoney(service.depositAmount, data.currency, ctx.locale) })}
          </Button>
          <Button variant="outline" onClick={() => void confirm.mutateAsync(false).then((result) => {
            setDone({
              manageHref: result.manageHref,
              when: formatDateTime(result.appointment.startsAt, { locale: ctx.locale, timeZone: result.timezone }),
              service: result.appointment.service,
              staff: result.appointment.staffName,
            })
            setStep('done')
          })}>
            {t('booking.skipPay')}
          </Button>
        </div>
      )}
    </div>
  )
}

function ServiceStep({ data, onPick }: { data: PublicBookingPage; onPick: (id: string) => void }) {
  const { t, i18n } = useTranslation('public')
  const locale = i18n.language === 'fr' ? 'fr-FR' : data.locale
  return (
    <div className="mt-4 space-y-2">
      <h2 className="font-semibold">{t('booking.service')}</h2>
      {data.services.map((service) => (
        <Button key={service.id} variant="outline" className="h-auto w-full justify-start py-3" onClick={() => onPick(service.id)}>
          <span className="flex w-full flex-col text-start">
            <span className="font-medium">{service.name}</span>
            <span className="text-xs text-fg-muted">
              {t('booking.durationPrice', { minutes: service.durationMinutes, price: formatMoney(service.price, data.currency, locale) })}
            </span>
          </span>
        </Button>
      ))}
    </div>
  )
}
