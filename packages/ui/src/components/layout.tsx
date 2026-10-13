import { ChevronRight } from 'lucide-react'
import { Slot } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef, type HTMLAttributes, type ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'
import { CountBadge } from './display'

/* Sidebar. Items use asChild so each app passes its own router link; active state reads data-status="active". */

export function Sidebar({ collapsed, className, children }: { collapsed?: boolean; className?: string; children: ReactNode }) {
  return (
    <aside
      data-collapsed={collapsed || undefined}
      className={cn(
        'group/sidebar flex h-full shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-fg transition-[width] duration-200 ease-out',
        collapsed ? 'w-16' : 'w-60',
        className,
      )}
    >
      {children}
    </aside>
  )
}

/** Footer button for the sidebar (collapse toggle and similar). */
export const SidebarButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'> & { icon: ReactNode; label: string }>(
  ({ icon, label, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'flex h-9 w-full items-center gap-3 rounded-md px-2 text-sm text-sidebar-fg-muted hover:bg-sidebar-hover hover:text-sidebar-fg group-data-[collapsed]/sidebar:justify-center [&_svg]:size-[18px] [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {icon}
      <span className="truncate group-data-[collapsed]/sidebar:sr-only">{label}</span>
    </button>
  ),
)
SidebarButton.displayName = 'SidebarButton'

export function SidebarGroup({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-2 py-2">
      {label && (
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-fg-muted group-data-[collapsed]/sidebar:sr-only">
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

export const SidebarItem = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<'a'> & { asChild?: boolean; icon: ReactNode; label: string; badge?: number; badgeLabel?: string }
>(({ asChild, icon, label, badge = 0, badgeLabel, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      ref={ref}
      title={label}
      className={cn(
        'relative flex h-9 items-center gap-3 rounded-md px-2 text-sm font-medium text-sidebar-fg-muted transition-colors duration-120 hover:bg-sidebar-hover hover:text-sidebar-fg data-[status=active]:bg-sidebar-active data-[status=active]:text-sidebar-active-fg group-data-[collapsed]/sidebar:justify-center [&_svg]:size-[18px] [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      {icon}
      <span className="flex-1 truncate group-data-[collapsed]/sidebar:sr-only">{label}</span>
      <CountBadge
        count={badge}
        label={badgeLabel}
        className="group-data-[collapsed]/sidebar:absolute group-data-[collapsed]/sidebar:-end-0.5 group-data-[collapsed]/sidebar:-top-0.5 group-data-[collapsed]/sidebar:h-4 group-data-[collapsed]/sidebar:min-w-4 group-data-[collapsed]/sidebar:text-[10px]"
      />
    </Comp>
  )
})
SidebarItem.displayName = 'SidebarItem'

/* Mobile bottom navigation (FE-DOC 5). */
export function BottomNav({ children, label }: { children: ReactNode; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {children}
    </nav>
  )
}

export const BottomNavItem = forwardRef<
  HTMLAnchorElement,
  ComponentPropsWithoutRef<'a'> & { asChild?: boolean; icon: ReactNode; label: string; badge?: number }
>(({ asChild, icon, label, badge = 0, className, children, ...props }, ref) => {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      ref={ref}
      className={cn(
        'relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-fg-muted data-[status=active]:text-brand [&_svg]:size-5',
        className,
      )}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
      <span className="relative">
        {icon}
        <CountBadge count={badge} className="absolute -end-3 -top-2 h-4 min-w-4 text-[10px]" />
      </span>
      <span>{label}</span>
    </Comp>
  )
})
BottomNavItem.displayName = 'BottomNavItem'

/* Page header: title, breadcrumbs, one primary action, tabs. */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  action,
  tabs,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  breadcrumbs?: ReactNode
  action?: ReactNode
  tabs?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('flex flex-col gap-3 pb-4', className)}>
      {breadcrumbs}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </div>
      {tabs}
    </header>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; render?: (children: ReactNode) => ReactNode }[] }) {
  const { t } = useTranslation('common')
  return (
    <nav aria-label={t('a11y.breadcrumbs')}>
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-fg-muted">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={item.label} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-fg">
                  {item.label}
                </span>
              ) : (
                (item.render?.(item.label) ?? item.label)
              )}
              {!last && <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

/* List and detail layout; on phones only one pane shows at a time. */
export function SplitPane({
  list,
  detail,
  showDetail,
  className,
}: {
  list: ReactNode
  detail: ReactNode
  showDetail: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-h-0 flex-1', className)}>
      <div className={cn('w-full shrink-0 border-e border-border md:w-80 lg:w-96', showDetail && 'max-md:hidden')}>{list}</div>
      <div className={cn('min-w-0 flex-1', !showDetail && 'max-md:hidden')}>{detail}</div>
    </div>
  )
}

export function PageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto h-full w-full max-w-6xl overflow-y-auto px-4 py-6 sm:px-6 lg:px-8', className)} {...props} />
}

/** Inbox: list, thread and contact panel. On phones one pane at a time (FE-DOC 5, PRD 29.2). */
export function ThreePane({
  list,
  thread,
  panel,
  showThread,
  showPanel,
  className,
}: {
  list: ReactNode
  thread: ReactNode
  panel: ReactNode
  showThread: boolean
  showPanel?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex h-full min-h-0 flex-1 overflow-hidden', className)}>
      <div className={cn('flex w-full shrink-0 flex-col border-e border-border md:w-80 lg:w-96', showThread && 'max-md:hidden')}>
        {list}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col', !showThread && 'max-md:hidden')}>{thread}</div>
      <div className={cn('hidden w-80 shrink-0 flex-col border-s border-border xl:flex', showPanel === false && 'xl:hidden')}>
        {panel}
      </div>
    </div>
  )
}
