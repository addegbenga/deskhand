import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8)

export function CalendarStaffGrid({
  staff,
  hourLabel,
  cells,
}: {
  staff: { id: string; name: string }[]
  hourLabel: (hour: number) => string
  cells: (staffId: string, hour: number) => ReactNode
}) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="grid min-w-[40rem]" style={{ gridTemplateColumns: `4rem repeat(${Math.max(staff.length, 1)}, minmax(8rem, 1fr))` }}>
        <div className="sticky start-0 z-10 border-b border-border bg-surface" />
        {staff.map((member) => (
          <div key={member.id} className="border-b border-s border-border px-2 py-2 text-sm font-medium">
            {member.name}
          </div>
        ))}
        {HOURS.map((hour) => (
          <div key={`h-${hour}`} className="contents">
            <div className="sticky start-0 border-b border-border bg-surface px-1 py-3 text-xs text-fg-muted">{hourLabel(hour)}</div>
            {staff.map((member) => (
              <div key={`${member.id}-${hour}`} className="relative min-h-16 border-b border-s border-border p-1">
                {cells(member.id, hour)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function AppointmentChip({
  children,
  tone = 'brand',
  className,
  onClick,
  draggable,
  onDragStart,
  onDrop,
}: {
  children: ReactNode
  tone?: 'brand' | 'attention' | 'neutral' | 'danger'
  className?: string
  onClick?: () => void
  draggable?: boolean
  onDragStart?: () => void
  onDrop?: () => void
}) {
  const tones = {
    brand: 'bg-brand/15 text-fg',
    attention: 'bg-attention/15 text-fg',
    neutral: 'bg-surface-2 text-fg',
    danger: 'bg-danger/15 text-fg',
  }
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault()
        onDrop?.()
      }}
      onClick={onClick}
      className={cn('mb-1 w-full rounded-md px-2 py-1 text-start text-xs', tones[tone], className)}
    >
      {children}
    </button>
  )
}

export { HOURS as CALENDAR_HOURS }
