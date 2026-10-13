import { z } from 'zod'

/** Tenant roles (PRD 12.1). */
export const RoleSchema = z.enum(['owner', 'admin', 'manager', 'staff', 'readonly'])
export type Role = z.infer<typeof RoleSchema>
export const ROLES = RoleSchema.options

/** Capabilities from the permission matrix (PRD 12.2). */
export const CapabilitySchema = z.enum([
  'billing.manage',
  'connections.manage',
  'ai.manage',
  'ai.approve',
  'compliance.manage',
  'conversations.view',
  'messages.send',
  'contacts.edit',
  'contacts.export',
  'pipeline.edit',
  'calendar.edit',
  'publishing.approve',
  'reports.view',
  'team.manage',
  'audit.view',
  'account.delete',
])
export type Capability = z.infer<typeof CapabilitySchema>

/**
 * all: full access. own: limited to assigned or own records. view: read-only. none: no access.
 */
export type Scope = 'all' | 'own' | 'view' | 'none'

export const PERMISSION_MATRIX: Record<Capability, Record<Role, Scope>> = {
  'billing.manage': { owner: 'all', admin: 'none', manager: 'none', staff: 'none', readonly: 'none' },
  'connections.manage': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'ai.manage': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'ai.approve': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'none' },
  'compliance.manage': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'conversations.view': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'view' },
  'messages.send': { owner: 'all', admin: 'all', manager: 'all', staff: 'all', readonly: 'none' },
  'contacts.edit': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'view' },
  'contacts.export': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'pipeline.edit': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'view' },
  'calendar.edit': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'view' },
  'publishing.approve': { owner: 'all', admin: 'all', manager: 'all', staff: 'none', readonly: 'none' },
  'reports.view': { owner: 'all', admin: 'all', manager: 'all', staff: 'own', readonly: 'all' },
  'team.manage': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'audit.view': { owner: 'all', admin: 'all', manager: 'none', staff: 'none', readonly: 'none' },
  'account.delete': { owner: 'all', admin: 'none', manager: 'none', staff: 'none', readonly: 'none' },
}

export function scopeFor(role: Role, capability: Capability): Scope {
  return PERMISSION_MATRIX[capability][role]
}

/** True when the role can act (not just view) with the capability. */
export function can(role: Role, capability: Capability): boolean {
  const scope = scopeFor(role, capability)
  return scope === 'all' || scope === 'own'
}

/** True when the role can at least see the data behind the capability. */
export function canView(role: Role, capability: Capability): boolean {
  return scopeFor(role, capability) !== 'none'
}

/** The least-privileged role that has full access, used in no-permission messages. */
export function lowestRoleWith(capability: Capability): Role {
  const order: Role[] = ['readonly', 'staff', 'manager', 'admin', 'owner']
  return order.find((role) => PERMISSION_MATRIX[capability][role] === 'all') ?? 'owner'
}

/** Navigation areas and who can see them (PRD 28.1). */
export const NavAreaSchema = z.enum([
  'home',
  'inbox',
  'contacts',
  'sales',
  'bookings',
  'tasks',
  'ai',
  'automations',
  'marketing',
  'reputation',
  'payments',
  'reports',
  'compliance',
  'connections',
  'settings',
])
export type NavArea = z.infer<typeof NavAreaSchema>

const everyone: Role[] = ['owner', 'admin', 'manager', 'staff', 'readonly']
const operators: Role[] = ['owner', 'admin', 'manager', 'staff']

export const NAV_VISIBILITY: Record<NavArea, Role[]> = {
  home: everyone,
  inbox: operators,
  contacts: operators,
  sales: operators,
  bookings: operators,
  tasks: operators,
  ai: operators,
  automations: ['owner', 'admin'],
  marketing: ['owner', 'admin', 'manager'],
  reputation: ['owner', 'admin', 'manager'],
  payments: ['owner', 'admin', 'manager'],
  reports: ['owner', 'admin', 'manager', 'readonly'],
  compliance: ['owner', 'admin', 'manager'],
  connections: ['owner', 'admin'],
  settings: everyone,
}

export function canSeeArea(role: Role, area: NavArea): boolean {
  return NAV_VISIBILITY[area].includes(role)
}
