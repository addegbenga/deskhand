import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import { PublicPayReceiptSchema, PublicPaymentPageSchema, isApiError } from '@deskhand/schemas'
import { Button, ErrorState, Skeleton } from '@deskhand/ui'
import { api } from '../api'
import { PublicNotFound } from './__root'
import { PublicShell } from '../PublicShell'

function PayPage() {
  const { id } = Route.useParams()
  const { t } = useTranslation('public')
  const query = useQuery({
    queryKey: ['public-pay', id],
    queryFn: ({ signal }) => api(`/public/pay/${id}`, { schema: PublicPaymentPageSchema, signal }),
  })
  const pay = useMutation({
    mutationFn: () => api(`/public/pay/${id}`, { method: 'POST', body: { method: 'card' }, schema: PublicPayReceiptSchema }),
  })

  if (query.isPending) return <Skeleton className="mx-auto mt-12 h-40 max-w-lg" />
  if (isApiError(query.error, 'not_found') || !query.data) return <PublicNotFound />
  if (query.error) return <ErrorState onRetry={() => void query.refetch()} />
  const page = query.data

  return (
    <PublicShell tenant={page}>
      <h1 className="text-2xl font-semibold">{t('pay.title', { business: page.name })}</h1>
      <p className="mt-2 text-fg-muted">{t('pay.for', { name: page.contactName })}</p>
      <p className="mt-4 text-3xl font-semibold tabular">{formatMoney(page.amount, page.currency, page.locale)}</p>
      {pay.isSuccess ? (
        <p className="mt-6">{t('pay.done', { receipt: pay.data.receipt })}</p>
      ) : page.status === 'expired' || page.status === 'paid' ? (
        <p className="mt-6">{page.status === 'expired' ? t('pay.expired') : t('pay.done', { receipt: page.paymentId })}</p>
      ) : (
        <Button className="mt-6" onClick={() => void pay.mutateAsync()} disabled={pay.isPending}>
          {t('pay.card')}
        </Button>
      )}
    </PublicShell>
  )
}

export const Route = createFileRoute('/pay/$id')({ component: PayPage })
