import { Link, useNavigate } from '@tanstack/react-router'
import {
  Bell,
  CalendarPlus,
  CalendarX,
  ChartColumn,
  CreditCard,
  FileText,
  Gauge,
  ListChecks,
  Plug,
  ShieldAlert,
  Star,
  UserPlus,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { formatDateTime, formatMoney, formatRelative, useTranslation } from '@deskhand/i18n'
import { can, type Banner as BannerData, type Notification, type NotificationKind } from '@deskhand/schemas'
import {
  Button,
  cn,
  CountBadge,
  Drawer,
  DrawerContent,
  DrawerTitle,
  EmptyState,
  ErrorState,
  Skeleton,
  toast,
} from '@deskhand/ui'
import {
  useBanners,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNavSummary,
  useNotifications,
  usePatchAccount,
  useSession,
} from '../api/queries'
import { now } from '../lib/clock'
import { useLocaleContext, useSelectedLocation } from '../lib/location'

const ICONS: Record<NotificationKind, LucideIcon> = {
  approval_waiting: ListChecks,
  needs_human: UserRound,
  booking_new: CalendarPlus,
  booking_cancelled: CalendarX,
  payment_received: CreditCard,
  review_negative: Star,
  connection_broken: Plug,
  template_status: FileText,
  usage_threshold: Gauge,
  compliance_alert: ShieldAlert,
  weekly_digest: ChartColumn,
  member_joined: UserPlus,
}

const URGENT = new Set<NotificationKind>(['connection_broken', 'compliance_alert', 'needs_human'])

export function NotificationCenter() {
  const { t, i18n } = useTranslation('common')
  const navigate = useNavigate()
  const session = useSession()
  const [open, setOpen] = useState(false)
  const { locationId } = useSelectedLocation(session)
  const { data: summary } = useNavSummary(locationId)
  const notifications = useNotifications(open)
  const bannersQuery = useBanners()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const patch = usePatchAccount()
  const ctx = useLocaleContext(session)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const banners = (bannersQuery.data ?? []).filter((item) => !dismissed.has(item.id))
  const unread = summary?.unreadNotifications ?? 0
  const badge = unread + banners.length
  const danger = banners.some((item) => item.severity === 'danger')

  const bannerParams = (banner: BannerData) => {
    const result: Record<string, string | number> = { ...banner.params }
    if (banner.kind === 'connection_broken') {
      result.connection = t(`connections.${banner.params.connection}`)
      result.problem = t(`connections.problems.${banner.params.problem}`)
    }
    return result
  }

  const bannerAction = (banner: BannerData) => {
    const allowed = !banner.fixCapability || can(session.membership.role, banner.fixCapability)
    if (!allowed) return null
    if (banner.kind === 'ai_paused') {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={patch.isPending}
          onClick={() => patch.mutate({ aiMode: 'on' }, { onSuccess: () => toast.success(t('ai.resumedToast')) })}
        >
          {t('banners.ai_paused.fix')}
        </Button>
      )
    }
    if (!banner.fixHref) return null
    return (
      <Button asChild size="sm" variant="outline">
        <Link
          to={banner.fixHref}
          onClick={() => setOpen(false)}
        >
          {t(`banners.${banner.kind}.fix`)}
        </Link>
      </Button>
    )
  }

  const describe = (n: Notification) => {
    const params: Record<string, string | number> = { ...n.params }
    if (n.kind === 'payment_received') params.amount = formatMoney(Number(n.params.amount), String(n.params.currency), ctx.locale)
    if (n.kind === 'booking_new') params.time = formatDateTime(String(n.params.time), ctx, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    if (n.kind === 'connection_broken') params.connection = t(`connections.${n.params.connection}`)
    if (n.kind === 'usage_threshold') params.meter = t(`meters.${n.params.meter}`)
    if (n.kind === 'template_status') params.status = t(`notifications.templateStatus.${n.params.status}`)
    if (n.kind === 'compliance_alert') params.item = t(`compliance.${n.params.item}`)
    return t(`notifications.kinds.${n.kind}`, params)
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={t('topbar.alertsCount', { count: badge })}
        onClick={() => setOpen(true)}
      >
        <Bell />
        <CountBadge
          count={badge}
          className={cn('absolute end-0.5 top-0.5 h-4 min-w-4 text-[10px]', danger && 'bg-danger text-danger-fg')}
        />
      </Button>
      <DrawerContent side="end" className="flex h-full flex-col gap-0 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3 pe-12">
          <DrawerTitle className="text-sm">{t('notifications.alertsTitle')}</DrawerTitle>
          <Button variant="link" size="sm" disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            {t('notifications.markAllRead')}
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite">
          {banners.length > 0 && (
            <section className="border-b border-border p-4" aria-label={t('a11y.notices')}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('notifications.attention')}</h3>
              <ul className="space-y-3">
                {banners.map((banner) => (
                  <li key={banner.id} className="rounded-md border border-border p-3">
                    <p className="text-sm font-medium">{t(`banners.${banner.kind}.title`, bannerParams(banner))}</p>
                    <p className="mt-1 text-sm text-fg-muted">{t(`banners.${banner.kind}.body`, bannerParams(banner))}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {bannerAction(banner)}
                      {banner.kind === 'trial' && (
                        <Button size="sm" variant="ghost" onClick={() => setDismissed((s) => new Set(s).add(banner.id))}>
                          {t('actions.dismiss')}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('notifications.activity')}</h3>
            {notifications.isPending && (
              <ul className="flex flex-col gap-3 p-4" aria-busy>
                {[0, 1, 2, 3].map((i) => (
                  <li key={i} className="flex gap-3">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {notifications.isError && (
              <ErrorState
                className="py-8"
                supportCode={(notifications.error as { supportCode?: string }).supportCode}
                onRetry={() => void notifications.refetch()}
                retrying={notifications.isFetching}
              />
            )}
            {notifications.data?.length === 0 && banners.length === 0 && (
              <EmptyState className="py-8" icon={Bell} title={t('notifications.empty')} description={t('notifications.emptyHint')} />
            )}
            {notifications.data?.length === 0 && banners.length > 0 && (
              <p className="px-4 py-6 text-sm text-fg-muted">{t('notifications.emptyHint')}</p>
            )}
            {notifications.data && notifications.data.length > 0 && (
              <ul className="divide-y divide-border">
                {notifications.data.map((n) => {
                  const Icon = ICONS[n.kind]
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!n.read) markRead.mutate(n.id)
                          setOpen(false)
                          void navigate({ to: n.href })
                        }}
                        className={cn('flex w-full gap-3 px-4 py-3 text-start transition-colors hover:bg-surface-2', !n.read && 'bg-brand/4')}
                      >
                        <span
                          className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-full',
                            URGENT.has(n.kind) ? 'bg-danger/10 text-danger' : n.kind === 'approval_waiting' ? 'bg-ai/10 text-ai' : 'bg-surface-2 text-fg-muted',
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <span className={cn('text-sm', n.read ? 'text-fg-muted' : 'text-fg')}>{describe(n)}</span>
                          <time className="text-xs text-fg-muted" dateTime={n.createdAt} title={formatDateTime(n.createdAt, ctx)}>
                            {formatRelative(n.createdAt, now(), { ...ctx, language: i18n.language })}
                          </time>
                        </span>
                        {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label={t('notifications.unread')} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
