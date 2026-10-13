import { CircleHelp } from 'lucide-react'
import type { FunnelStep, PageBlock } from '@deskhand/schemas'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Tooltip } from './overlays'
import { Button } from './button'

export function MetricHint({ label, definition }: { label: ReactNode; definition: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Tooltip content={definition}>
        <button type="button" className="rounded-sm text-fg-muted hover:text-fg" aria-label={definition}>
          <CircleHelp className="size-3.5" aria-hidden />
        </button>
      </Tooltip>
    </span>
  )
}

export function FunnelView({
  steps,
  dropOffLabel,
}: {
  steps: FunnelStep[]
  dropOffLabel: (from: string, to: string, rate: number) => string
}) {
  const max = Math.max(...steps.map((step) => step.visits), 1)
  return (
    <ol className="flex flex-col gap-3">
      {steps.map((step, index) => {
        const next = steps[index + 1]
        const drop = next && step.visits ? Math.round((1 - next.visits / step.visits) * 100) : null
        return (
          <li key={step.id}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium">{step.label}</span>
              <span className="tabular text-fg-muted">{step.visits}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(step.visits / max) * 100}%` }} />
            </div>
            {drop != null && next && <p className="mt-1 text-xs text-fg-muted">{dropOffLabel(step.label, next.label, drop)}</p>}
          </li>
        )
      })}
    </ol>
  )
}

export function PageCanvas({ blocks, className }: { blocks: PageBlock[]; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {blocks.map((block) => (
        <section key={block.id} className="rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wide text-fg-muted">{block.type}</p>
          {block.heading && <h2 className="mt-1 text-lg font-semibold">{block.heading}</h2>}
          {block.body && <p className="mt-1 text-sm text-fg-muted">{block.body}</p>}
          {block.cta && (
            <Button className="mt-3" size="sm" type="button">
              {block.cta}
            </Button>
          )}
        </section>
      ))}
    </div>
  )
}
