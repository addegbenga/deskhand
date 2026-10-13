import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Inbox,
  Link2Off,
  ListChecks,
  MessageSquareWarning,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import { formatMoney, formatNumber, formatRelative, useTranslation } from '@deskhand/i18n'
import { canSeeArea, type AttentionCard, type HomeDashboard } from '@deskhand/schemas'
import {
  Badge,
  Button,
  ErrorState,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatCard,
  toast,
} from '@deskhand/ui'
import { useAcceptSuggestion, useDismissSuggestion, useHome } from '../../api/crm'
import { useSession } from '../../api/queries'
import { SetupBoard } from './SetupBoard'
import { now } from '../../lib/clock'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

function greetingKey(hour: number) {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

const ATTENTION_ICONS: Record<AttentionCard['kind'], LucideIcon> = {
  approvals: ListChecks,
  needs_human: Inbox,
  unanswered: MessageSquareWarning,
  negative_review: AlertTriangle,
  broken_connection: Link2Off,
  rejected_template: AlertTriangle,
  compliance: ShieldAlert,
}

export function HomePage() {
  const { t } = useTranslation(['home', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const range: HomeDashboard['range'] = 'month'
  const query = useHome(locationId, range)
  const dismiss = useDismissSuggestion()
  const accept = useAcceptSuggestion()
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone: ctx.timeZone }).format(now()))
  const firstName = session.user.name.replace(/^Dr\.\s*/, '').split(' ')[0]
  const aiOff = session.account.aiMode === 'manual' || session.account.aiMode === 'off'
  const data = query.data

  const formatMetric = (id: string, value: number) => {
    if (id === 'revenue') return formatMoney(value, ctx.currency, ctx.locale)
    if (id === 'response_time') return t('minutes', { value: Math.round(value) })
    if (id === 'reviews') return value.toFixed(1)
    return formatNumber(value, ctx.locale)
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('common:home.greeting.' + greetingKey(hour), { name: firstName })}
        description={t('common:home.subtitle', { business: session.account.name })}
        action={
          <div className="flex items-center gap-2">
            <Select value={range} disabled>
              <SelectTrigger className="w-40" aria-label={t('results')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['7d', '30d', 'month'] as const).map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`range.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canSeeArea(session.membership.role, 'bookings') && (
              <Button asChild>
                <a href="/app/bookings">
                  <CalendarPlus />
                  {t('actions.createBooking')}
                </a>
              </Button>
            )}
          </div>
        }
      />

      <SetupBoard />

      {data?.demoData && (
        <p className="mb-4 rounded-md border border-attention/30 bg-attention/10 px-3 py-2 text-sm text-attention">{t('demoRibbon')}</p>
      )}

      {query.isError && (
        <ErrorState
          supportCode={'supportCode' in (query.error as object) ? (query.error as { supportCode?: string }).supportCode : undefined}
          onRetry={() => void query.refetch()}
        />
      )}

      {query.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}

      {data && (
        <>
          {session.membership.role !== 'readonly' && (
            <section className="mb-8" aria-label={t('attention')}>
              <h2 className="mb-3 text-sm font-semibold">{t('attention')}</h2>
              {data.attention.length === 0 ? (
                <p className="text-sm text-fg-muted">{t('emptyAttention')}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {data.attention.map((card) => {
                    const Icon = ATTENTION_ICONS[card.kind]
                    return (
                      <a
                        key={card.id}
                        href={card.href}
                        className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 hover:border-brand/40"
                      >
                        <span className="flex size-9 items-center justify-center rounded-md bg-attention/10 text-attention">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">
                            {t(`cards.${card.kind}`, { count: card.count, connection: String(card.params.connection ?? '') })}
                          </span>
                          {card.waitMinutes != null && card.waitMinutes > 0 && (
                            <span className="text-xs text-fg-muted">{t('wait', { minutes: card.waitMinutes })}</span>
                          )}
                          <span className="mt-2 inline-block text-sm font-medium text-brand">{t(`actions.${card.kind}`)}</span>
                        </span>
                      </a>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          <div className="grid gap-8 lg:grid-cols-2">
            {session.membership.role !== 'readonly' && (
              <section aria-label={t('today')}>
                <h2 className="mb-3 text-sm font-semibold">{t('today')}</h2>
                {data.today.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t('emptyToday')}</p>
                ) : (
                  <ol className="flex flex-col gap-2">
                    {data.today.map((item) => (
                      <li key={item.id}>
                        <a href={item.href} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-surface-2">
                          <span>
                            {item.kind === 'task'
                              ? t('timeline.task', { title: item.title })
                              : t(`timeline.${item.kind}`, { contact: item.contactName ?? '', title: item.title })}
                          </span>
                          <time className="tabular text-xs text-fg-muted" dateTime={item.at} title={item.at}>
                            {formatRelative(item.at, now(), ctx)}
                          </time>
                        </a>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            <section aria-label={t('results')}>
              <h2 className="mb-3 text-sm font-semibold">{t('results')}</h2>
              {data.results.every((m) => m.value === 0) ? (
                <p className="text-sm text-fg-muted">{t('emptyResults')}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.results.map((metric) => {
                    const up = metric.value > metric.previous
                    const same = metric.value === metric.previous
                    return (
                      <StatCard
                        key={metric.id}
                        label={t(`metrics.${metric.id}`)}
                        value={formatMetric(metric.id, metric.value)}
                        change={
                          same
                            ? t('changeSame')
                            : t(up ? 'changeUp' : 'changeDown', { previous: formatMetric(metric.id, metric.previous) })
                        }
                        sparkline={metric.sparkline}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            {!aiOff && session.membership.role !== 'readonly' && (
              <section aria-label={t('aiActivity')}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{t('aiActivity')}</h2>
                  <a href="/app/ai/activity" className="text-sm text-brand hover:underline">
                    {t('viewAllActivity')}
                  </a>
                </div>
                {data.aiActivity.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t('emptyAi')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {data.aiActivity.slice(0, 8).map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                        <span>
                          <Badge tone="ai" className="me-2">
                            {item.employeeName}
                          </Badge>
                          {t(`activity.${item.action}`)} · {item.contactName}
                          <span className="block text-xs text-fg-muted">{item.outcome}</span>
                        </span>
                        <time className="shrink-0 text-xs text-fg-muted">{formatRelative(item.createdAt, now(), ctx)}</time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!aiOff && session.membership.role !== 'readonly' && (
              <section aria-label={t('suggestions')}>
                <h2 className="mb-3 text-sm font-semibold">{t('suggestions')}</h2>
                {data.suggestions.length === 0 ? (
                  <p className="text-sm text-fg-muted">{t('emptySuggestions')}</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {data.suggestions.map((item) => (
                      <li key={item.id} className="rounded-lg border border-ai/25 bg-ai/6 p-4">
                        <p className="text-sm">{item.body}</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="ai"
                            onClick={() =>
                              void accept.mutateAsync(item.id).then(() => {
                                toast.success(t('accepted'))
                                void query.refetch()
                              })
                            }
                          >
                            <CheckCircle2 />
                            {t('actions.accept')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void dismiss.mutateAsync(item.id).then(() => {
                                toast.success(t('dismissed'))
                                void query.refetch()
                              })
                            }
                          >
                            {t('actions.dismiss')}
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </PageContainer>
  )
}
