import { Link, useRouterState } from '@tanstack/react-router'
import { cn } from '@deskhand/ui'

export function GrowTabs({ items }: { items: { to: string; label: string }[] }) {
  const path = useRouterState({ select: (state) => state.location.pathname })
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {items.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={cn(
            '-mb-px inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium',
            path === item.to || path.startsWith(`${item.to}/`)
              ? 'border-brand text-fg'
              : 'border-transparent text-fg hover:bg-surface-2',
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
