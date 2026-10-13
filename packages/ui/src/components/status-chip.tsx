import {
  Ban,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDot,
  Clock,
  Flag,
  FlaskConical,
  Hourglass,
  Pause,
  Pencil,
  Radio,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { Badge, type BadgeProps } from './display'
import { Tooltip } from './overlays'

type Tone = NonNullable<BadgeProps['tone']>
type Entry = { tone: Tone; icon: LucideIcon }

/** One fixed map so the same state always looks the same (FE-DOC 4.4). Icons mean color is never the only signal. */
export const STATUS_MAP = {
  account: {
    trial: { tone: 'info', icon: Hourglass },
    trial_expired: { tone: 'attention', icon: Clock },
    active: { tone: 'success', icon: CircleCheck },
    past_due: { tone: 'attention', icon: TriangleAlert },
    suspended: { tone: 'danger', icon: Ban },
    paused: { tone: 'neutral', icon: Pause },
    cancelled: { tone: 'neutral', icon: X },
  },
  connection: {
    healthy: { tone: 'success', icon: CircleCheck },
    degraded: { tone: 'attention', icon: TriangleAlert },
    broken: { tone: 'danger', icon: CircleAlert },
  },
  template: {
    draft: { tone: 'neutral', icon: Pencil },
    pending: { tone: 'info', icon: Hourglass },
    approved: { tone: 'success', icon: Check },
    rejected: { tone: 'danger', icon: X },
  },
  post: {
    draft: { tone: 'ai', icon: Sparkles },
    approved: { tone: 'success', icon: Check },
    scheduled: { tone: 'info', icon: Clock },
    published: { tone: 'brand', icon: Radio },
  },
  campaign: {
    draft: { tone: 'neutral', icon: Pencil },
    checked: { tone: 'info', icon: CircleCheck },
    sent: { tone: 'success', icon: Check },
  },
  booking: {
    booked: { tone: 'brand', icon: CircleDot },
    completed: { tone: 'success', icon: Check },
    no_show: { tone: 'attention', icon: TriangleAlert },
    cancelled: { tone: 'neutral', icon: X },
  },
  payment: {
    pending: { tone: 'info', icon: Hourglass },
    paid: { tone: 'success', icon: Check },
    failed: { tone: 'danger', icon: X },
    refunded: { tone: 'neutral', icon: RotateCcw },
  },
  review: {
    new: { tone: 'info', icon: CircleDot },
    needs_reply: { tone: 'attention', icon: CircleAlert },
    replied: { tone: 'success', icon: Check },
    flagged: { tone: 'danger', icon: Flag },
  },
  knowledge: {
    verified: { tone: 'success', icon: CircleCheck },
    unverified: { tone: 'attention', icon: TriangleAlert },
    needs_review: { tone: 'danger', icon: CircleAlert },
  },
  consent: {
    granted: { tone: 'success', icon: Check },
    withdrawn: { tone: 'danger', icon: Ban },
    missing: { tone: 'attention', icon: CircleAlert },
  },
  compliance: {
    done: { tone: 'success', icon: CircleCheck },
    needs_attention: { tone: 'attention', icon: TriangleAlert },
    blocking: { tone: 'danger', icon: Ban },
  },
  employee: {
    draft: { tone: 'neutral', icon: Pencil },
    testing: { tone: 'info', icon: FlaskConical },
    shadow: { tone: 'ai', icon: Sparkles },
    live: { tone: 'success', icon: Radio },
    paused: { tone: 'attention', icon: Pause },
    archived: { tone: 'neutral', icon: X },
  },
} satisfies Record<string, Record<string, Entry>>

export type StatusDomain = keyof typeof STATUS_MAP
export type StatusValue<D extends StatusDomain> = keyof (typeof STATUS_MAP)[D] & string

export function StatusChip<D extends StatusDomain>({
  domain,
  value,
  detail,
  className,
}: {
  domain: D
  value: StatusValue<D>
  /** Exact problem, shown on hover (e.g. connection health). */
  detail?: string
  className?: string
}) {
  const { t } = useTranslation('common')
  const entry = (STATUS_MAP[domain] as Record<string, Entry>)[value]
  if (!entry) return null
  const Icon = entry.icon
  const chip = (
    <Badge tone={entry.tone} className={className}>
      <Icon aria-hidden />
      {t(`status.${domain}.${value}`)}
    </Badge>
  )
  if (!detail) return chip
  return (
    <Tooltip content={detail}>
      <span tabIndex={0} className="inline-flex rounded-full">
        {chip}
      </span>
    </Tooltip>
  )
}
