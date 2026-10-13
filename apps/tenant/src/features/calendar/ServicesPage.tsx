import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import {
  Badge,
  Breadcrumbs,
  Button,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Switch,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useCreateService, usePatchService, useServices } from '../../api/booking'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'

export function ServicesPage() {
  const { t } = useTranslation(['calendar', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const access = usePermission('calendar.edit')
  const list = useServices()
  const patch = usePatchService()
  const create = useCreateService()
  const [name, setName] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('60')
  const [price, setPrice] = useState('')

  if (!canSeeArea(session.membership.role, 'bookings')) {
    return (
      <PageContainer>
        <PageHeader title={t('servicesPage.title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  const addService = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    const minutes = Number(durationMinutes)
    const amount = Number(price)
    if (!trimmed || !Number.isFinite(minutes) || minutes < 1 || !Number.isFinite(amount) || amount < 0) return
    void create
      .mutateAsync({ name: trimmed, durationMinutes: minutes, price: amount })
      .then(() => {
        setName('')
        setDurationMinutes('60')
        setPrice('')
        toast.success(t('servicesPage.added'))
      })
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('servicesPage.title')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/bookings">{label}</Link> }, { label: t('servicesPage.title') }]} />}
      />
      {access.allowed && (
        <form onSubmit={addService} className="mb-6 grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-[1fr_7rem_7rem_auto]">
          <div>
            <Label htmlFor="svc-name">{t('servicesPage.name')}</Label>
            <Input id="svc-name" className="mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="svc-duration">{t('servicesPage.durationLabel')}</Label>
            <Input id="svc-duration" className="mt-1" type="number" min={1} value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="svc-price">{t('servicesPage.price')}</Label>
            <Input id="svc-price" className="mt-1" type="number" min={0} value={price} onChange={(event) => setPrice(event.target.value)} required />
          </div>
          <Button type="submit" className="self-end" disabled={create.isPending || !name.trim()}>
            {t('servicesPage.add')}
          </Button>
        </form>
      )}
      <ul className="space-y-2">
        {list.data?.map((service) => (
          <li key={service.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{service.name}</p>
              <p className="text-xs text-fg-muted">
                {t('servicesPage.duration', { minutes: service.durationMinutes })} · {formatMoney(service.price, ctx.currency, ctx.locale)}
                {service.capacity > 1 ? ` · ${t('servicesPage.capacity', { count: service.capacity })}` : ''}
              </p>
            </div>
            <Badge>{service.visible ? t('servicesPage.visible') : t('servicesPage.hidden')}</Badge>
            {access.allowed && (
              <Switch checked={service.visible} onCheckedChange={(visible) => void patch.mutate({ id: service.id, visible })} aria-label={t('servicesPage.visible')} />
            )}
          </li>
        ))}
      </ul>
      {!access.allowed && <Button className="sr-only" disabled />}
    </PageContainer>
  )
}
