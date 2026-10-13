import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { isApiError, ManageBookingSchema, SlotListSchema } from '@deskhand/schemas'
import { Button, ErrorState, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton } from '@deskhand/ui'
import { useState } from 'react'
import { api, publicTenantQuery } from '../../api'
import { PublicShell } from '../../PublicShell'
import { PublicNotFound } from '../__root'

function ManageBooking() {
  const { slug, token } = Route.useParams()
  const { t } = useTranslation('public')
  const tenant = useQuery(publicTenantQuery(slug))
  const booking = useQuery({
    queryKey: ['public-booking', 'manage', token],
    queryFn: ({ signal }) => api(`/public/booking/manage/${token}`, { schema: ManageBookingSchema, signal }),
  })
  const [startsAt, setStartsAt] = useState('')
  const date = booking.data?.appointment.startsAt.slice(0, 10)
  const slots = useQuery({
    queryKey: ['slots', slug, date, booking.data?.appointment.serviceId],
    queryFn: ({ signal }) =>
      api(`/public/booking/${slug}/slots`, {
        schema: SlotListSchema,
        query: { date, serviceId: booking.data?.appointment.serviceId },
        signal,
      }),
    enabled: Boolean(date && booking.data),
  })
  const cancel = useMutation({
    mutationFn: () => api(`/public/booking/manage/${token}/cancel`, { method: 'POST', schema: ManageBookingSchema }),
  })
  const reschedule = useMutation({
    mutationFn: () =>
      api(`/public/booking/manage/${token}/reschedule`, { method: 'POST', body: { startsAt }, schema: ManageBookingSchema }),
  })

  if (tenant.isPending || booking.isPending) return <Skeleton className="mx-auto mt-20 h-48 max-w-3xl" />
  if (isApiError(booking.error, 'not_found') || isApiError(tenant.error, 'not_found') || !tenant.data) return <PublicNotFound />
  if (booking.error || !booking.data) {
    return <ErrorState onRetry={() => void booking.refetch()} />
  }
  const data = cancel.data ?? reschedule.data ?? booking.data
  const ctx = { locale: tenant.data.locale, timeZone: data.timezone }

  return (
    <PublicShell tenant={tenant.data}>
      <h1 className="text-2xl font-semibold">{t('manage.title', { business: data.business })}</h1>
      <p className="mt-2">{data.appointment.service}</p>
      <p className="text-fg-muted">{formatDateTime(data.appointment.startsAt, ctx)}</p>
      <p className="mt-4 text-sm">{t('manage.policy', { policy: data.policy })}</p>
      {data.appointment.status === 'cancelled' && <p className="mt-4">{t('manage.cancelled')}</p>}
      {data.canCancel && (
        <Button className="mt-4" variant="danger-outline" onClick={() => void cancel.mutateAsync()}>
          {t('manage.cancel')}
        </Button>
      )}
      {data.canReschedule && (
        <div className="mt-4 space-y-2">
          <Select value={startsAt} onValueChange={setStartsAt}>
            <SelectTrigger aria-label={t('manage.reschedule')}>
              <SelectValue placeholder={t('manage.reschedule')} />
            </SelectTrigger>
            <SelectContent>
              {(slots.data ?? []).map((slot) => (
                <SelectItem key={slot.startsAt} value={slot.startsAt}>
                  {formatDateTime(slot.startsAt, ctx)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!startsAt} onClick={() => void reschedule.mutateAsync()}>
            {t('manage.reschedule')}
          </Button>
        </div>
      )}
      {!data.canCancel && !data.canReschedule && data.appointment.status === 'booked' && (
        <p className="mt-4 text-sm text-fg-muted">{t('manage.blocked')}</p>
      )}
    </PublicShell>
  )
}

export const Route = createFileRoute('/b/$slug/manage/$token')({ component: ManageBooking })
