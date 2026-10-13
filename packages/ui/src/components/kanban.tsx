import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

export function KanbanBoard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-full min-h-[24rem] gap-3 overflow-x-auto pb-4', className)}>
      {children}
    </div>
  )
}

export function KanbanColumn({
  title,
  meta,
  hint,
  children,
  onDrop,
}: {
  title: string
  meta?: ReactNode
  hint?: ReactNode
  children: ReactNode
  onDrop?: () => void
}) {
  return (
    <section
      className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-surface-2/60"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.()
      }}
    >
      <header className="border-b border-border px-3 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold">{title}</h2>
          {meta && <span className="text-xs text-fg-muted">{meta}</span>}
        </div>
        {hint && <p className="mt-1 text-xs text-attention">{hint}</p>}
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">{children}</div>
    </section>
  )
}

export function KanbanCard({
  children,
  onDragStart,
  className,
}: {
  children: ReactNode
  onDragStart?: () => void
  className?: string
}) {
  return (
    <article
      draggable={Boolean(onDragStart)}
      onDragStart={onDragStart}
      className={cn('cursor-grab rounded-md border border-border bg-surface p-3 text-sm shadow-sm active:cursor-grabbing', className)}
    >
      {children}
    </article>
  )
}
