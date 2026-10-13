import {
  Camera,
  Check,
  CheckCheck,
  CircleAlert,
  Clock,
  Globe,
  Mail,
  MessageCircle,
  Mic,
  Phone,
  StickyNote,
  type LucideIcon,
} from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import type { ChannelKind, Message } from '@deskhand/schemas'
import type { DeliveryStatus as Delivery } from '@deskhand/schemas'
import { cn } from '../lib/cn'
import { AIBadge, AISurface, WhyPopover } from './ai'
import { Badge } from './display'

const CHANNEL_ICONS: Record<ChannelKind, LucideIcon> = {
  whatsapp: MessageCircle,
  webchat: Globe,
  email: Mail,
  sms: Phone,
  messenger: MessageCircle,
  instagram: Camera,
  voice: Mic,
}

export function ChannelIcon({ channel, className }: { channel: ChannelKind; className?: string }) {
  const { t } = useTranslation('common')
  const Icon = CHANNEL_ICONS[channel]
  return <Icon className={cn('size-4', className)} aria-label={t(`channels.${channel}`)} />
}

function DeliveryIcon({ status }: { status: Delivery }) {
  if (status === 'read' || status === 'delivered') return <CheckCheck className="size-3.5" aria-hidden />
  if (status === 'failed') return <CircleAlert className="size-3.5 text-danger" aria-hidden />
  if (status === 'pending') return <Clock className="size-3.5" aria-hidden />
  return <Check className="size-3.5" aria-hidden />
}

export function DeliveryStatus({ status, className }: { status: Delivery; className?: string }) {
  const { t } = useTranslation('common')
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] text-fg-muted', className)}>
      <DeliveryIcon status={status} />
      {t(`delivery.${status}`)}
    </span>
  )
}

export function MessageBubble({
  message,
  time,
  onRate,
  showAi = true,
}: {
  message: Message
  time: string
  onRate?: (rating: 'good' | 'bad') => void
  showAi?: boolean
}) {
  const { t } = useTranslation('common')
  if (message.kind === 'system') {
    return (
      <p className="px-4 py-1 text-center text-xs text-fg-muted" role="status">
        {message.body}
      </p>
    )
  }
  if (message.kind === 'note') {
    return (
      <div className="mx-4 my-2 rounded-md border border-dashed border-border bg-surface-2 px-3 py-2 text-sm">
        <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
          <StickyNote className="size-3.5" aria-hidden />
          {message.authorName}
        </p>
        <p className="mt-1">{message.body}</p>
      </div>
    )
  }
  const mine = message.kind === 'outbound'
  const ai = message.authorKind === 'ai_employee'
  const bubble = (
    <div
      className={cn(
        'max-w-[min(32rem,85%)] rounded-lg px-3 py-2 text-sm',
        mine ? 'bg-brand/10 text-fg' : 'bg-surface-2',
        ai && 'border-s-2 border-ai bg-ai/6',
      )}
    >
      <div className="mb-1 flex flex-wrap items-center gap-2">
        {ai && showAi ? <AIBadge name={message.authorName} /> : <span className="text-xs font-medium text-fg-muted">{message.authorName}</span>}
        <ChannelIcon channel={message.channel} className="size-3 text-fg-muted" />
        <time className="text-[11px] text-fg-muted" dateTime={message.createdAt}>
          {time}
        </time>
      </div>
      <p className="whitespace-pre-wrap">{message.body}</p>
      {message.attachment && (
        <p className="mt-2 rounded-md border border-border bg-surface px-2 py-1 text-xs text-fg-muted">{message.attachment.name}</p>
      )}
      {message.transcript && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-fg-muted">{t('channels.voice')}</summary>
          <pre className="mt-1 whitespace-pre-wrap font-sans">{message.transcript}</pre>
        </details>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {message.deliveryStatus && <DeliveryStatus status={message.deliveryStatus} />}
        {showAi && message.why && <WhyPopover sources={message.why.sources} rules={message.why.rules} tools={message.why.tools} />}
        {ai && onRate && (
          <span className="flex gap-1">
            <button type="button" className="text-xs text-fg-muted hover:text-fg" onClick={() => onRate('good')}>
              {t('ai.rateGood')}
            </button>
            <button type="button" className="text-xs text-fg-muted hover:text-fg" onClick={() => onRate('bad')}>
              {t('ai.rateBad')}
            </button>
          </span>
        )}
      </div>
    </div>
  )
  return (
    <div className={cn('flex px-4 py-1', mine ? 'justify-end' : 'justify-start')}>
      {ai && showAi ? <AISurface className="max-w-[min(32rem,85%)] p-0">{bubble}</AISurface> : bubble}
    </div>
  )
}

export function StatCard({
  label,
  value,
  change,
  sparkline,
  href,
  hint,
  className,
}: {
  label: ReactNode
  value: ReactNode
  change?: ReactNode
  sparkline?: number[]
  href?: string
  hint?: ReactNode
  className?: string
}) {
  const max = sparkline?.length ? Math.max(...sparkline, 1) : 1
  const inner = (
    <>
      <p className="text-sm text-fg-muted">{hint ?? label}</p>
      <p className="tabular mt-1 text-2xl font-semibold">{value}</p>
      {change && <p className="mt-1 text-xs text-fg-muted">{change}</p>}
      {sparkline && sparkline.length > 1 && (
        <svg viewBox={`0 0 ${sparkline.length * 8} 24`} className="mt-3 h-8 w-full text-brand" aria-hidden>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points={sparkline.map((n, i) => `${i * 8},${24 - (n / max) * 22}`).join(' ')}
          />
        </svg>
      )}
    </>
  )
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-4', className)}>
      {href ? (
        <a href={href} className="block">
          {inner}
        </a>
      ) : (
        inner
      )}
    </div>
  )
}

export function ConsentBadge({ status }: { status: 'granted' | 'withdrawn' | 'missing' }) {
  const { t } = useTranslation('common')
  const tone = status === 'granted' ? 'success' : status === 'withdrawn' ? 'danger' : 'attention'
  return <Badge tone={tone}>{t(`status.consent.${status}`)}</Badge>
}

export function CreatedByChip({ kind }: { kind: string }) {
  const { t } = useTranslation('common')
  return (
    <Badge tone={kind === 'ai_employee' ? 'ai' : 'neutral'}>
      {t(`createdBy.${kind}`)}
    </Badge>
  )
}

export function Pane({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)} {...props} />
}
