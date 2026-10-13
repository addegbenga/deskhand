import {
  ChartColumn,
  CalendarDays,
  CreditCard,
  FileText,
  House,
  Inbox,
  ListChecks,
  Megaphone,
  Plug,
  Settings,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Activity,
  SquareCheck,
  SquareKanban,
  Star,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import { canSeeArea, type AiMode, type NavArea, type Role } from '@deskhand/schemas'

export type NavItem = {
  id: string
  area: NavArea
  to: string
  icon: LucideIcon
  /** i18n key under nav.* */
  label: string
  badge?: 'unread' | 'approvals'
  /** Slice that builds the screen (FE-DOC 1). */
  slice: string
  roles?: Role[]
  aiOnly?: boolean
}

export type NavGroup = { id: string; label?: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'work',
    items: [
      { id: 'home', area: 'home', to: '/app/home', icon: House, label: 'home', slice: 'S2' },
      { id: 'inbox', area: 'inbox', to: '/app/inbox', icon: Inbox, label: 'inbox', badge: 'unread', slice: 'S2' },
      { id: 'contacts', area: 'contacts', to: '/app/contacts', icon: Users, label: 'contacts', slice: 'S2' },
      { id: 'sales', area: 'sales', to: '/app/sales', icon: SquareKanban, label: 'sales', slice: 'S3' },
      { id: 'bookings', area: 'bookings', to: '/app/bookings', icon: CalendarDays, label: 'bookings', slice: 'S3' },
      { id: 'tasks', area: 'tasks', to: '/app/tasks', icon: SquareCheck, label: 'tasks', slice: 'S3' },
    ],
  },
  {
    id: 'ai',
    label: 'ai',
    items: [
      { id: 'employees', area: 'ai', to: '/app/ai/employees', icon: Sparkles, label: 'employees', slice: 'S4', roles: ['owner', 'admin'] },
      { id: 'knowledge', area: 'ai', to: '/app/ai/knowledge', icon: BookOpen, label: 'knowledge', slice: 'S4' },
      { id: 'approvals', area: 'ai', to: '/app/ai/approvals', icon: ListChecks, label: 'approvals', badge: 'approvals', slice: 'S4', aiOnly: true },
      { id: 'activity', area: 'ai', to: '/app/ai/activity', icon: Activity, label: 'activity', slice: 'S4' },
    ],
  },
  {
    id: 'grow',
    label: 'grow',
    items: [
      { id: 'automations', area: 'automations', to: '/app/automations', icon: Workflow, label: 'automations', slice: 'S5' },
      { id: 'marketing', area: 'marketing', to: '/app/marketing', icon: Megaphone, label: 'marketing', slice: 'S5' },
      { id: 'reputation', area: 'reputation', to: '/app/reputation', icon: Star, label: 'reputation', slice: 'S5' },
      { id: 'payments', area: 'payments', to: '/app/payments', icon: CreditCard, label: 'payments', slice: 'S5' },
      { id: 'pages', area: 'marketing', to: '/app/pages', icon: FileText, label: 'pages', slice: 'S6' },
      { id: 'reports', area: 'reports', to: '/app/reports', icon: ChartColumn, label: 'reports', slice: 'S6' },
    ],
  },
  {
    id: 'manage',
    label: 'manage',
    items: [
      { id: 'compliance', area: 'compliance', to: '/app/compliance', icon: ShieldCheck, label: 'compliance', slice: 'S8' },
      { id: 'connections', area: 'connections', to: '/app/connections', icon: Plug, label: 'connections', slice: 'S7' },
      { id: 'settings', area: 'settings', to: '/app/settings', icon: Settings, label: 'settings', slice: 'S7' },
    ],
  },
]

export const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items)

/** AI-specific items appear only when an AI employee exists (PRD FR-MA.7). */
export function isNavItemVisible(item: NavItem, role: Role, aiMode: AiMode) {
  if (!canSeeArea(role, item.area)) return false
  if (item.roles && !item.roles.includes(role)) return false
  if (item.aiOnly && aiMode === 'manual') return false
  return true
}

export function visibleNavGroups(role: Role, aiMode: AiMode): NavGroup[] {
  return NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => isNavItemVisible(item, role, aiMode)) })).filter(
    (group) => group.items.length > 0,
  )
}

/** Mobile bottom bar: Home, Inbox, Calendar, Approvals, More, falling back to what the role can see (PRD 28.1). */
export function bottomNavItems(role: Role, aiMode: AiMode): NavItem[] {
  const preferred = ['home', 'inbox', 'bookings', 'approvals', 'reports', 'contacts', 'settings']
  return preferred
    .map((id) => ALL_NAV_ITEMS.find((item) => item.id === id)!)
    .filter((item) => isNavItemVisible(item, role, aiMode))
    .slice(0, 4)
}

/** Finds the nav item that owns a path, e.g. /app/ai/approvals/123 resolves to approvals. */
export function navItemForPath(path: string): NavItem | undefined {
  return [...ALL_NAV_ITEMS].sort((a, b) => b.to.length - a.to.length).find((item) => path === item.to || path.startsWith(`${item.to}/`))
}
