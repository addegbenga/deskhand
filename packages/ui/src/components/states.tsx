import { CircleAlert, Lock, RefreshCw, WifiOff, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'
import { Button } from './button'

/* Required state patterns (FE-DOC 4.5, PRD 28.3). */

function StateFrame({ icon: Icon, tone, title, children, action, className }: {
  icon: LucideIcon
  tone: 'neutral' | 'danger' | 'attention'
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  const toneClass = {
    neutral: 'bg-surface-2 text-fg-muted',
    danger: 'bg-danger/10 text-danger',
    attention: 'bg-attention/10 text-attention',
  }[tone]
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-12 text-center', className)}>
      <span className={cn('flex size-12 items-center justify-center rounded-full', toneClass)}>
        <Icon className="size-6" aria-hidden />
      </span>
      <h2 className="text-base font-semibold text-fg">{title}</h2>
      {children && <div className="text-sm text-fg-muted">{children}</div>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

/** One icon, one sentence on the value, one primary action. */
export function EmptyState({ icon, title, description, action, className }: {
  icon: LucideIcon
  title: ReactNode
  description: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <StateFrame icon={icon} tone="neutral" title={title} action={action} className={className}>
      {description}
    </StateFrame>
  )
}

/** Plain-language cause, Retry, and a support code. */
export function ErrorState({ title, description, supportCode, onRetry, retrying, className }: {
  title?: ReactNode
  description?: ReactNode
  supportCode?: string
  onRetry?: () => void
  retrying?: boolean
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <StateFrame
      icon={CircleAlert}
      tone="danger"
      title={title ?? t('states.error.title')}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" onClick={onRetry} disabled={retrying}>
            <RefreshCw className={cn(retrying && 'animate-spin')} />
            {t('actions.retry')}
          </Button>
        )
      }
    >
      <p>{description ?? t('states.error.body')}</p>
      {supportCode && (
        <p className="mt-2 text-xs">
          {t('states.error.supportCode', { code: supportCode })}
        </p>
      )}
    </StateFrame>
  )
}

/** Names the role that can do it and, where possible, offers Request access. */
export function NoPermissionState({ roleLabel, onRequestAccess, className }: {
  roleLabel: string
  onRequestAccess?: () => void
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <StateFrame
      icon={Lock}
      tone="neutral"
      title={t('states.noPermission.title')}
      className={className}
      action={
        onRequestAccess && (
          <Button variant="outline" onClick={onRequestAccess}>
            {t('states.noPermission.request')}
          </Button>
        )
      }
    >
      {t('states.noPermission.body', { role: roleLabel })}
    </StateFrame>
  )
}

export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 bg-fg px-4 py-2 text-sm text-bg', className)}
    >
      <WifiOff className="size-4" aria-hidden />
      {t('states.offline.body')}
    </div>
  )
}

/** Shown when data changed underneath instead of silently swapping it (PRD 28.3). */
export function StaleBanner({ onRefresh, className }: { onRefresh: () => void; className?: string }) {
  const { t } = useTranslation('common')
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-between gap-3 rounded-md border border-info/25 bg-info/8 px-4 py-2 text-sm',
        className,
      )}
    >
      <span>{t('states.stale.body')}</span>
      <Button size="sm" variant="outline" onClick={onRefresh}>
        <RefreshCw />
        {t('actions.refresh')}
      </Button>
    </div>
  )
}

/** Visible whenever sample data is shown (PRD FR-O.4). */
export function DemoRibbon({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  return (
    <div
      className={cn(
        'pointer-events-none fixed bottom-3 end-3 z-40 rounded-full border border-attention/40 bg-surface px-3 py-1 text-xs font-medium text-attention shadow-sm max-md:bottom-20',
        className,
      )}
    >
      {t('app.demoData')}
    </div>
  )
}
