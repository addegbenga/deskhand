import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { lowestRoleWith, scopeFor, type Capability, type Role, type Scope } from '@deskhand/schemas'
import { Tooltip } from './overlays'
import { NoPermissionState } from './states'

const RoleContext = createContext<Role | null>(null)

export function PermissionProvider({ role, children }: { role: Role; children: ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export type PermissionResult = {
  allowed: boolean
  scope: Scope
  /** Role the user would need, for no-permission messages. */
  requiredRole: Role
}

/** The single permission hook (FE-DOC 3, rule 5). Mirrors the matrix in PRD 12.2. */
export function usePermission(capability: Capability): PermissionResult {
  const role = useContext(RoleContext)
  if (!role) throw new Error('usePermission must be used inside PermissionProvider')
  const scope = scopeFor(role, capability)
  return { allowed: scope === 'all' || scope === 'own', scope, requiredRole: lowestRoleWith(capability) }
}

export function useRole(): Role {
  const role = useContext(RoleContext)
  if (!role) throw new Error('useRole must be used inside PermissionProvider')
  return role
}

/**
 * hide: controls the user can never use are hidden.
 * disable: controls that could be unlocked are disabled with the reason (PRD 28.3).
 * page: replaces the content with the no-permission state.
 */
export function PermissionGate({
  capability,
  mode = 'hide',
  children,
  onRequestAccess,
}: {
  capability: Capability
  mode?: 'hide' | 'disable' | 'page'
  children: ReactElement<{ disabled?: boolean }>
  onRequestAccess?: () => void
}) {
  const { t } = useTranslation('common')
  const { allowed, requiredRole } = usePermission(capability)
  if (allowed) return children
  const roleLabel = t(`roles.${requiredRole}`)
  if (mode === 'hide') return null
  if (mode === 'page') return <NoPermissionState roleLabel={roleLabel} onRequestAccess={onRequestAccess} />
  return (
    <Tooltip content={t('states.noPermission.tooltip', { role: roleLabel })}>
      <span tabIndex={0} className="inline-flex cursor-not-allowed">
        <children.type {...children.props} disabled aria-disabled />
      </span>
    </Tooltip>
  )
}
