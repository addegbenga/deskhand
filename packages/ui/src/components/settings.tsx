import type { ConnectionCard, InviteAddressResult, UsageMeter } from '@deskhand/schemas'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Badge, Card } from './display'
import { Banner } from './banner'

export function UsageBar({ meter, label }: { meter: UsageMeter; label: string }) {
  const width = Math.min(100, meter.percent)
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular text-fg-muted">
          {meter.used} / {meter.included}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn('h-full rounded-full', meter.alert === 'cap' ? 'bg-danger' : meter.alert === 'warn' ? 'bg-attention' : 'bg-brand')}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

export function UpgradePrompt({ title, action }: { title: string; action?: ReactNode }) {
  return <Banner severity="attention" title={title} action={action} />
}

export function InviteResults({ results, label }: { results: InviteAddressResult[]; label: (result: InviteAddressResult['result']) => string }) {
  return (
    <ul className="space-y-1 text-sm">
      {results.map((item) => (
        <li key={item.email} className="flex justify-between gap-2">
          <span>{item.email}</span>
          <Badge tone={item.result === 'sent' ? 'success' : item.result === 'plan_limit' ? 'attention' : 'neutral'}>{label(item.result)}</Badge>
        </li>
      ))}
    </ul>
  )
}

export function ConnectionTile({
  card,
  title,
  status,
  model,
  problem,
  actions,
  footer,
}: {
  card: ConnectionCard
  title: string
  status: string
  model: string
  problem?: string | null
  actions?: ReactNode
  footer?: ReactNode
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-fg-muted">{model}</p>
        </div>
        <Badge tone={card.status === 'connected' ? 'success' : card.status === 'needs_attention' ? 'attention' : 'neutral'}>{status}</Badge>
      </div>
      {problem && <p className="text-sm text-fg-muted">{problem}</p>}
      {card.scopes.length > 0 && <p className="text-xs text-fg-muted">{card.scopes.join(', ')}</p>}
      {actions}
      {footer}
    </Card>
  )
}
