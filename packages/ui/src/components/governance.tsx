import { Link } from 'lucide-react'
import type { ChecklistStatus } from '@deskhand/schemas'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Badge } from './display'

const TONE: Record<ChecklistStatus, 'success' | 'attention' | 'danger'> = {
  done: 'success',
  attention: 'attention',
  blocking: 'danger',
}

export function ChecklistRow({
  status,
  statusLabel,
  title,
  reason,
  escalate,
  escalateLabel,
  action,
}: {
  status: ChecklistStatus
  statusLabel: string
  title: ReactNode
  reason: ReactNode
  escalate?: boolean
  escalateLabel?: string
  action?: ReactNode
}) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{title}</p>
          <Badge tone={TONE[status]}>{statusLabel}</Badge>
          {escalate && escalateLabel && <Badge tone="danger">{escalateLabel}</Badge>}
        </div>
        <p className="mt-1 text-sm text-fg-muted">{reason}</p>
      </div>
      {action}
    </li>
  )
}

export function SlaTimer({
  remainingHours: _remainingHours,
  overdue,
  escalate,
  labels,
}: {
  remainingHours: number
  overdue: boolean
  escalate: boolean
  labels: { overdue: string; left: string; escalate: string }
}) {
  return (
    <span className={cn('tabular text-sm', overdue ? 'text-danger' : escalate ? 'text-attention' : 'text-fg-muted')}>
      {overdue ? labels.overdue : labels.left}
      {escalate && !overdue ? ` · ${labels.escalate}` : null}
    </span>
  )
}

export function LedgerRow({
  name,
  meta,
  proof,
}: {
  name: string
  meta: ReactNode
  proof: string
}) {
  return (
    <li className="flex justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-fg-muted">{meta}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
        <Link className="size-3.5" aria-hidden />
        {proof}
      </span>
    </li>
  )
}
