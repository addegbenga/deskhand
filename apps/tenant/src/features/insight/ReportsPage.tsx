import { formatMoney, formatNumber, useTranslation } from '@deskhand/i18n'
import { REPORT_IDS, canSeeArea, type ReportId, type ReportRange } from '@deskhand/schemas'
import {
  Button,
  ErrorState,
  MetricHint,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatCard,
  Switch,
} from '@deskhand/ui'
import { useState } from 'react'
import { GrowTabs } from '../grow/GrowTabs'
import { useDigest, useExportReport, usePatchDigest, useReport } from '../../api/insight'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

export function ReportsPage({ reportId }: { reportId: ReportId }) {
  const { t } = useTranslation(['insight', 'common', 'home'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = useLocaleContext(session)
  const [range, setRange] = useState<ReportRange>('30d')
  const report = useReport(reportId, range, locationId)
  const exporter = useExportReport()
  const digest = useDigest()
  const patchDigest = usePatchDigest()

  if (!canSeeArea(session.membership.role, 'reports')) {
    return (
      <PageContainer>
        <PageHeader title={t('reports.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }

  const formatValue = (unit: string, value: number) => {
    if (unit === 'money') return formatMoney(value, ctx.currency, ctx.locale)
    if (unit === 'minutes') return t('home:minutes', { value: Math.round(value) })
    if (unit === 'percent') return `${Math.round(value)}%`
    if (unit === 'rating') return value.toFixed(1)
    return formatNumber(Math.round(value), ctx.locale)
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('reports.title')}
        description={report.data ? t('reports.fresh', { minutes: report.data.freshnessMinutes }) : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={range} onValueChange={(value) => setRange(value as ReportRange)}>
              <SelectTrigger className="w-44" aria-label={t('reports.range')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['7d', '30d', '90d'] as const).map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`reports.ranges.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                void exporter.mutateAsync({ id: reportId, range, locationId }).then((file) => {
                  const blob = new Blob([file.csv], { type: 'text/csv' })
                  const href = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = href
                  link.download = file.filename
                  link.click()
                  URL.revokeObjectURL(href)
                })
              }
            >
              {t('reports.export')}
            </Button>
          </div>
        }
        tabs={
          <GrowTabs
            items={REPORT_IDS.map((id) => ({ to: `/app/reports/${id}`, label: t(`reports.tabs.${id}`) }))}
          />
        }
      />
      {report.isPending && <Skeleton className="h-40" />}
      {report.isError && <ErrorState onRetry={() => void report.refetch()} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.data?.cards.map((card) => (
          <StatCard
            key={card.id}
            label={t(`reports.cards.${card.definitionKey}`)}
            hint={
              <MetricHint
                label={t(`reports.cards.${card.definitionKey}`)}
                definition={t(`reports.defs.${card.definitionKey}`)}
              />
            }
            value={formatValue(card.unit, card.value)}
            change={`${t('reports.compare')} ${formatValue(card.unit, card.previous)}`}
            sparkline={card.spark}
          />
        ))}
      </div>
      {digest.data && ['owner', 'admin'].includes(session.membership.role) && (
        <div className="mt-8 max-w-md rounded-lg border border-border p-4">
          <p className="font-medium">{t('reports.digest')}</p>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <Switch checked={digest.data.enabled} onCheckedChange={(enabled) => void patchDigest.mutateAsync({ enabled })} />
            {t('reports.saveDigest')}
          </label>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Select value={digest.data.channel} onValueChange={(channel) => void patchDigest.mutateAsync({ channel })}>
              <SelectTrigger aria-label={t('reports.digestChannel')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">{t('reports.email')}</SelectItem>
                <SelectItem value="whatsapp">{t('reports.whatsapp')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={digest.data.cadence} onValueChange={(cadence) => void patchDigest.mutateAsync({ cadence })}>
              <SelectTrigger aria-label={t('reports.digestCadence')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t('reports.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </PageContainer>
  )
}

