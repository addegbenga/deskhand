import { cva, type VariantProps } from 'class-variance-authority'
import { CircleAlert, Info, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'

const bannerVariants = cva('flex items-start gap-3 border px-4 py-3 text-sm sm:items-center', {
  variants: {
    severity: {
      info: 'border-info/25 bg-info/8 text-fg',
      attention: 'border-attention/30 bg-attention/10 text-fg',
      danger: 'border-danger/30 bg-danger/10 text-fg',
    },
    layout: {
      page: 'rounded-none border-x-0 border-t-0',
      inline: 'rounded-md',
    },
  },
  defaultVariants: { severity: 'info', layout: 'inline' },
})

const icons = { info: Info, attention: TriangleAlert, danger: CircleAlert }
const iconColor = { info: 'text-info', attention: 'text-attention', danger: 'text-danger' }

export type BannerProps = VariantProps<typeof bannerVariants> & {
  title?: ReactNode
  children?: ReactNode
  /** One fix button per banner (PRD 28.2). */
  action?: ReactNode
  onDismiss?: () => void
  className?: string
}

export function Banner({ severity = 'info', layout, title, children, action, onDismiss, className }: BannerProps) {
  const { t } = useTranslation('common')
  const Icon = icons[severity ?? 'info']
  return (
    <div
      role={severity === 'danger' ? 'alert' : 'status'}
      className={cn(bannerVariants({ severity, layout }), className)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0 sm:mt-0', iconColor[severity ?? 'info'])} aria-hidden />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title && <p className="font-medium">{title}</p>}
          {children && <div className={cn(title && 'text-fg-muted')}>{children}</div>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('actions.dismiss')}
          className="rounded-sm p-1 text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
