import { Outlet } from '@tanstack/react-router'
import { useState, type ReactNode } from 'react'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import { useCreatePaymentLink, usePaymentLinks, usePayments, usePaymentsOverview } from '../../api/grow'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'
import {
  Banner,
  Button,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusChip,
  toast,
  usePermission,
} from '@deskhand/ui'
import { GrowTabs } from './GrowTabs'

function Guard({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  if (!canSeeArea(session.membership.role, 'payments')) {
    return (
      <PageContainer>
        <PageHeader title={t('payments.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }
  return <>{children}</>
}

export function PaymentsLayout() {
  const { t } = useTranslation('grow')
  return (
    <Guard>
      <PageContainer>
        <PageHeader
          title={t('payments.title')}
          description={t('payments.neverHold')}
          tabs={
            <GrowTabs
              items={[
                { to: '/app/payments/links', label: t('payments.tabs.links') },
                { to: '/app/payments/list', label: t('payments.tabs.list') },
              ]}
            />
          }
        />
        <Outlet />
      </PageContainer>
    </Guard>
  )
}

export function PaymentLinksPage() {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const links = usePaymentLinks()
  const overview = usePaymentsOverview()
  const create = useCreatePaymentLink()
  const access = usePermission('connections.manage')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('15000')
  const [purpose, setPurpose] = useState<'service' | 'deposit' | 'custom'>('deposit')
  if (links.isPending) return <Skeleton className="h-32" />
  if (links.isError) return <ErrorState onRetry={() => void links.refetch()} />
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        {overview.data?.gateway === 'missing' && <Banner severity="attention" title={t('payments.missing')} />}
        <p className="text-sm text-fg-muted">
          {t('payments.gateway')}: {overview.data?.gateway ?? '—'}
        </p>
        {access.allowed && (
          <>
            <Label>{t('payments.contact')}</Label>
            <Input value={name} onChange={(event) => setName(event.target.value)} />
            <Label>{t('payments.amount')}</Label>
            <Input type="number" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <Label>{t('payments.purpose')}</Label>
            <Select value={purpose} onValueChange={(value) => setPurpose(value as typeof purpose)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">{t('payments.purposes.service')}</SelectItem>
                <SelectItem value="deposit">{t('payments.purposes.deposit')}</SelectItem>
                <SelectItem value="custom">{t('payments.purposes.custom')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() =>
                void create.mutateAsync({ contactName: name, amount: Number(amount), purpose }).then(
                  () => toast.success(t('payments.share')),
                  (error) => toast.error(isApiError(error) ? t('payments.missing') : t('common:actions.retry')),
                )
              }
            >
              {t('payments.create')}
            </Button>
          </>
        )}
      </div>
      <ul className="space-y-2 text-sm">
        {links.data?.map((item) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            <p className="font-medium">{item.contactName}</p>
            <p>
              {formatMoney(item.amount, item.currency, ctx.locale)} · {item.purpose} · {item.status}
            </p>
            <p className="break-all text-xs text-fg-muted">{item.shareUrl}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PaymentsListPage() {
  const { t } = useTranslation('grow')
  const session = useSession()
  const ctx = useLocaleContext(session)
  const list = usePayments()
  const overview = usePaymentsOverview()
  if (list.isPending) return <Skeleton className="h-32" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  return (
    <div>
      <p className="mb-4 text-sm text-fg-muted">
        {overview.data ? formatMoney(overview.data.paidTotal, ctx.currency, ctx.locale) : ''}
      </p>
      <ul className="space-y-2 text-sm">
        {list.data?.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
            <span>
              {item.contactName} · {formatMoney(item.amount, item.currency, ctx.locale)} · {t(`payments.source.${item.source}`)}
            </span>
            <StatusChip domain="payment" value={item.status} />
          </li>
        ))}
      </ul>
    </div>
  )
}
