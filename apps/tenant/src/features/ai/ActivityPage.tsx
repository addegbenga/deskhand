import { useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import { Button, NoPermissionState, PageContainer, PageHeader, Skeleton, usePermission } from '@deskhand/ui'
import { useAiActivity, useRateTranscript, useTranscripts } from '../../api/ai'
import { useSession } from '../../api/queries'

export function ActivityPage() {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const access = usePermission('ai.approve')
  const activity = useAiActivity()
  const samples = useTranscripts()
  const rate = useRateTranscript()

  if (!canSeeArea(session.membership.role, 'ai')) {
    return (
      <PageContainer>
        <PageHeader title={t('activityPage.title')} />
        <NoPermissionState roleLabel={t(`common:roles.staff`)} />
      </PageContainer>
    )
  }

  const exportCsv = () => {
    const rows = activity.data ?? []
    const csv = ['employee,contact,action,outcome,at', ...rows.map((row) => [row.employeeName, row.contactName, row.action, row.outcome, row.createdAt].join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = 'ai-activity.csv'
    a.click()
    URL.revokeObjectURL(href)
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('activityPage.title')}
        action={
          <Button variant="outline" onClick={exportCsv}>
            {t('activityPage.export')}
          </Button>
        }
      />
      {activity.isPending && <Skeleton className="h-32" />}
      <ul className="space-y-2">
        {activity.data?.map((item) => (
          <li key={item.id} className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">
              {item.employeeName} · {item.contactName}
            </p>
            <p className="text-fg-muted">
              {item.action} — {item.outcome}
            </p>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 font-semibold">{t('activityPage.transcripts')}</h2>
      <ul className="mt-2 space-y-3">
        {samples.data?.map((item) => (
          <li key={item.id} className="rounded-md border border-border p-3">
            <p className="text-xs text-fg-muted">{t(`activityPage.flags.${item.flag}`)}</p>
            <p className="font-medium">{item.contactName}</p>
            <p className="text-sm text-fg-muted">{item.excerpt}</p>
            {access.allowed && (
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => void rate.mutateAsync({ id: item.id, rating: 'good' }).then(() => void samples.refetch())}>
                  {t('activityPage.good')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void rate.mutateAsync({ id: item.id, rating: 'needs_fix' }).then(() => void samples.refetch())}>
                  {t('activityPage.fix')}
                </Button>
                <Button size="sm" variant="danger-outline" onClick={() => void rate.mutateAsync({ id: item.id, rating: 'harmful' }).then(() => void samples.refetch())}>
                  {t('activityPage.harmful')}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}
