import { Link, Outlet } from '@tanstack/react-router'
import { useMemo, useState, type ReactNode } from 'react'
import { formatRelative, useTranslation } from '@deskhand/i18n'
import { canSeeArea, type ReviewRecord } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import { usePatchReviewSettings, useReplyReview, useReviewInsights, useReviewSettings, useReviews } from '../../api/grow'
import { useConnections } from '../../api/settings'
import { useSession } from '../../api/queries'
import { now } from '../../lib/clock'
import { useLocaleContext } from '../../lib/location'
import {
  Badge,
  Banner,
  Button,
  CopyField,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  ReviewCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  toast,
  usePermission,
} from '@deskhand/ui'
import { GrowTabs } from './GrowTabs'

function Guard({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  if (!canSeeArea(session.membership.role, 'reputation')) {
    return (
      <PageContainer>
        <PageHeader title={t('reputation.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }
  return <>{children}</>
}

export function ReputationLayout() {
  const { t } = useTranslation('grow')
  return (
    <Guard>
      <PageContainer>
        <PageHeader
          title={t('reputation.title')}
          tabs={
            <GrowTabs
              items={[
                { to: '/app/reputation/reviews', label: t('reputation.tabs.reviews') },
                { to: '/app/reputation/requests', label: t('reputation.tabs.requests') },
                { to: '/app/reputation/insights', label: t('reputation.tabs.insights') },
              ]}
            />
          }
        />
        <Outlet />
      </PageContainer>
    </Guard>
  )
}

const ALL = 'all'

export function ReviewsPage() {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const list = useReviews()
  const reply = useReplyReview()
  const connections = useConnections()
  const access = usePermission('publishing.approve')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [rating, setRating] = useState(ALL)
  const [topic, setTopic] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [source, setSource] = useState(ALL)
  const [location, setLocation] = useState(ALL)

  const gbp = connections.data?.groups.flatMap((group) => group.cards).find((card) => card.kind === 'gbp')
  const gbpIssue = gbp && (gbp.health === 'broken' || gbp.status === 'needs_attention' || gbp.status === 'not_connected')

  const topics = useMemo(() => [...new Set((list.data ?? []).flatMap((item) => item.topics))], [list.data])
  const locations = useMemo(() => {
    const map = new Map<string, string>()
    for (const item of list.data ?? []) map.set(item.locationId, item.locationName)
    return [...map.entries()]
  }, [list.data])

  const filtered = (list.data ?? []).filter((item) => {
    if (rating !== ALL && item.rating !== Number(rating)) return false
    if (topic !== ALL && !item.topics.includes(topic)) return false
    if (source !== ALL && item.source !== source) return false
    if (location !== ALL && item.locationId !== location) return false
    if (status === 'unanswered' && item.status === 'replied') return false
    if (status !== ALL && status !== 'unanswered' && item.status !== status) return false
    return true
  })

  if (list.isPending) return <Skeleton className="h-40" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  const urgent = list.data?.some((item) => item.rating <= 2 && item.status !== 'replied' && !item.spam)

  return (
    <div className="space-y-4">
      {urgent && <Banner severity="attention" title={t('reputation.alerts')} />}
      {gbpIssue && (
        <Banner
          severity="danger"
          title={t('reputation.reconnectGbp')}
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/app/connections">{t('reputation.fixConnection')}</Link>
            </Button>
          }
        />
      )}
      <div className="flex flex-wrap gap-2">
        <Select value={rating} onValueChange={setRating}>
          <SelectTrigger className="w-36" aria-label={t('reputation.filters.rating')}>
            <SelectValue placeholder={t('reputation.filters.rating')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('reputation.filters.allRatings')}</SelectItem>
            {[1, 2, 3, 4, 5].map((value) => (
              <SelectItem key={value} value={String(value)}>
                {t('reputation.filters.stars', { count: value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40" aria-label={t('reputation.filters.status')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('reputation.filters.allStatuses')}</SelectItem>
            <SelectItem value="unanswered">{t('reputation.filters.unanswered')}</SelectItem>
            {(['new', 'needs_reply', 'replied', 'flagged'] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`reputation.status.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-40" aria-label={t('reputation.filters.source')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('reputation.filters.allSources')}</SelectItem>
            <SelectItem value="google">{t('reputation.source.google')}</SelectItem>
            <SelectItem value="private">{t('reputation.source.private')}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={topic} onValueChange={setTopic}>
          <SelectTrigger className="w-40" aria-label={t('reputation.filters.topic')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('reputation.filters.allTopics')}</SelectItem>
            {topics.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-40" aria-label={t('reputation.filters.location')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t('reputation.filters.allLocations')}</SelectItem>
            {locations.map(([id, name]) => (
              <SelectItem key={id} value={id}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('reputation.empty')}</p>
      ) : (
        filtered.map((item) => (
          <ReviewRow
            key={item.id}
            item={item}
            at={formatRelative(item.createdAt, now(), ctx)}
            draft={drafts[item.id] ?? item.draftReply}
            onDraft={(value) => setDrafts((prev) => ({ ...prev, [item.id]: value }))}
            onReply={() => void reply.mutateAsync({ id: item.id, reply: drafts[item.id] ?? item.draftReply })}
            canReply={access.allowed && item.status !== 'replied' && !item.spam}
            onUseDraft={() => setDrafts((prev) => ({ ...prev, [item.id]: item.draftReply }))}
          />
        ))
      )}
    </div>
  )
}

function ReviewRow({
  item,
  at,
  draft,
  onDraft,
  onReply,
  canReply,
  onUseDraft,
}: {
  item: ReviewRecord
  at: string
  draft: string
  onDraft: (value: string) => void
  onReply: () => void
  canReply: boolean
  onUseDraft: () => void
}) {
  const { t } = useTranslation('grow')
  return (
    <div className="space-y-2">
      <ReviewCard
        name={item.contactName}
        rating={item.rating}
        body={item.body}
        topics={item.topics}
        draft={item.spam ? undefined : item.draftReply}
        useDraftLabel={t('reputation.useDraft')}
        onUseDraft={canReply ? onUseDraft : undefined}
        meta={
          <p className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <Badge tone="neutral">{t(`reputation.source.${item.source}`)}</Badge>
            <Badge tone={item.status === 'replied' ? 'success' : item.urgency === 'high' ? 'danger' : 'attention'}>
              {t(`reputation.status.${item.status}`)}
            </Badge>
            <span>{item.locationName}</span>
            <span>{at}</span>
            {item.staffMention ? <span>{t('reputation.staff')}: {item.staffMention}</span> : null}
            {item.serviceMention ? <span>{t('reputation.service')}: {item.serviceMention}</span> : null}
          </p>
        }
        analysis={
          <dl className="grid gap-2 text-xs sm:grid-cols-3">
            <div>
              <dt className="text-fg-muted">{t('reputation.analysis.sentiment')}</dt>
              <dd>{t(`reputation.sentiment.${item.sentiment}`)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">{t('reputation.analysis.urgency')}</dt>
              <dd>{t(`reputation.urgency.${item.urgency}`)}</dd>
            </div>
            <div>
              <dt className="text-fg-muted">{t('reputation.analysis.spam')}</dt>
              <dd>{item.spam ? t('reputation.analysis.spamYes') : t('reputation.analysis.spamNo')}</dd>
            </div>
          </dl>
        }
      />
      {canReply && (
        <div className="flex flex-col gap-2 ps-1">
          <Textarea value={draft} onChange={(event) => onDraft(event.target.value)} />
          <Button size="sm" onClick={onReply}>
            {t('reputation.reply')}
          </Button>
        </div>
      )}
      {item.reply && <p className="text-sm text-fg-muted">{t('reputation.postedReply')}: {item.reply}</p>}
    </div>
  )
}

export function ReviewRequestsPage() {
  const { t } = useTranslation(['grow', 'common'])
  const settings = useReviewSettings()
  const patch = usePatchReviewSettings()
  const [lang, setLang] = useState('en')
  const [wording, setWording] = useState<Record<string, string>>()
  if (settings.isPending || !settings.data) return <Skeleton className="h-32" />
  if (settings.isError) return <ErrorState onRetry={() => void settings.refetch()} />
  const texts = wording ?? settings.data.wording
  const languages = Object.keys(texts)
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-fg-muted">{t('reputation.stats.sent')}</dt>
          <dd className="text-lg tabular">{settings.data.sent}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('reputation.stats.opened')}</dt>
          <dd className="text-lg tabular">{settings.data.opened}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{t('reputation.stats.received')}</dt>
          <dd className="text-lg tabular">{settings.data.received}</dd>
        </div>
      </dl>
      <div>
        <Label>{t('reputation.landing')}</Label>
        <CopyField className="mt-1" label={t('reputation.landing')} value={settings.data.landingUrl} />
      </div>
      <p className="text-sm text-fg-muted">{t('reputation.exclusions')}</p>
      <Label>{t('reputation.delay')}</Label>
      <Input
        type="number"
        defaultValue={settings.data.delayHours}
        onBlur={(event) => void patch.mutateAsync({ delayHours: Number(event.target.value) })}
      />
      <Label>{t('reputation.wording')}</Label>
      <div className="flex flex-wrap gap-2">
        {languages.map((code) => (
          <Button key={code} size="sm" variant={lang === code ? 'primary' : 'outline'} onClick={() => setLang(code)}>
            {code}
          </Button>
        ))}
      </div>
      <Textarea
        value={texts[lang] ?? ''}
        onChange={(event) => setWording({ ...texts, [lang]: event.target.value })}
      />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={settings.data.reminder} onCheckedChange={(reminder) => void patch.mutateAsync({ reminder })} />
        {t('reputation.reminder')}
      </label>
      <Button
        onClick={() =>
          void patch.mutateAsync({ wording: texts }).then(
            () => toast.success(t('reputation.save')),
            (error) => toast.error(isApiError(error) ? t('reputation.rewardBlocked') : t('common:actions.retry')),
          )
        }
      >
        {t('reputation.save')}
      </Button>
    </div>
  )
}

export function ReviewInsightsPage() {
  const { t } = useTranslation('grow')
  const insights = useReviewInsights()
  if (insights.isPending || !insights.data) return <Skeleton className="h-32" />
  if (insights.isError) return <ErrorState onRetry={() => void insights.refetch()} />
  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-sm text-fg-muted">{t('reputation.average')}</dt>
          <dd className="text-2xl tabular">{insights.data.average.toFixed(1)}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">{t('reputation.volume')}</dt>
          <dd className="text-2xl tabular">{insights.data.volume}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">{t('reputation.unanswered')}</dt>
          <dd className="text-2xl tabular">{insights.data.unanswered}</dd>
        </div>
        <div>
          <dt className="text-sm text-fg-muted">{t('reputation.response')}</dt>
          <dd className="text-2xl tabular">{insights.data.responseHours}</dd>
        </div>
      </dl>
      <div>
        <p className="text-sm font-medium">{t('reputation.themes')}</p>
        <ul className="mt-2 text-sm text-fg-muted">
          {insights.data.themes.map((theme) => (
            <li key={theme.topic}>
              {theme.topic} · {theme.count}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">{t('reputation.staffBreakdown')}</p>
          <ul className="mt-2 text-sm text-fg-muted">
            {insights.data.staff.map((row) => (
              <li key={row.name}>
                {row.name} · {row.count} · {row.average.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">{t('reputation.serviceBreakdown')}</p>
          <ul className="mt-2 text-sm text-fg-muted">
            {insights.data.services.map((row) => (
              <li key={row.name}>
                {row.name} · {row.count} · {row.average.toFixed(1)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
