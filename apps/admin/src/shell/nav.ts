import {
  Activity,
  BadgeDollarSign,
  BarChart3,
  Bot,
  Building2,
  Flag,
  Gauge,
  Globe,
  LayoutDashboard,
  LifeBuoy,
  Package,
  Radio,
  Rocket,
  Scale,
  ShieldAlert,
  UserCog,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { ADMIN_MODULE_ACCESS, type AdminModule, type AdminPersona } from '@deskhand/schemas'

export type AdminNavItem = { id: AdminModule; icon: LucideIcon; slice: 'S10' | 'S11' }
export type AdminNavGroup = { id: string; label?: 'operate' | 'quality' | 'configure' | 'business'; items: AdminNavItem[] }

/** Console structure (PRD 31.2), grouped for scanning. Markets and packs are the S11 configuration editors. */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    id: 'main',
    items: [
      { id: 'overview', icon: LayoutDashboard, slice: 'S10' },
      { id: 'tenants', icon: Building2, slice: 'S10' },
    ],
  },
  {
    id: 'operate',
    label: 'operate',
    items: [
      { id: 'onboarding', icon: Rocket, slice: 'S10' },
      { id: 'support', icon: LifeBuoy, slice: 'S10' },
      { id: 'channels', icon: Radio, slice: 'S10' },
      { id: 'system', icon: Activity, slice: 'S10' },
    ],
  },
  {
    id: 'quality',
    label: 'quality',
    items: [
      { id: 'ai', icon: Bot, slice: 'S10' },
      { id: 'compliance', icon: Scale, slice: 'S10' },
      { id: 'safety', icon: ShieldAlert, slice: 'S10' },
    ],
  },
  {
    id: 'configure',
    label: 'configure',
    items: [
      { id: 'markets', icon: Globe, slice: 'S11' },
      { id: 'packs', icon: Package, slice: 'S11' },
      { id: 'plans', icon: BadgeDollarSign, slice: 'S10' },
      { id: 'flags', icon: Flag, slice: 'S10' },
    ],
  },
  {
    id: 'business',
    label: 'business',
    items: [
      { id: 'billing', icon: Wallet, slice: 'S10' },
      { id: 'usage', icon: Gauge, slice: 'S10' },
      { id: 'insights', icon: BarChart3, slice: 'S10' },
      { id: 'users', icon: UserCog, slice: 'S10' },
    ],
  },
]

export const ALL_ADMIN_ITEMS = ADMIN_NAV.flatMap((group) => group.items)

export function canOpenModule(persona: AdminPersona, module: AdminModule) {
  return ADMIN_MODULE_ACCESS[module].includes(persona)
}

export function visibleAdminNav(persona: AdminPersona): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({ ...group, items: group.items.filter((item) => canOpenModule(persona, item.id)) })).filter(
    (group) => group.items.length > 0,
  )
}

export function adminItem(module: string): AdminNavItem | undefined {
  return ALL_ADMIN_ITEMS.find((item) => item.id === module)
}
