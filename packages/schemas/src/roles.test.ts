import { describe, expect, it } from 'vitest'
import { CapabilitySchema, can, canSeeArea, canView, lowestRoleWith, PERMISSION_MATRIX, ROLES, scopeFor } from './roles'

describe('permission matrix (PRD 12.2)', () => {
  it('covers every capability for every role', () => {
    for (const capability of CapabilitySchema.options) {
      for (const role of ROLES) expect(PERMISSION_MATRIX[capability][role]).toMatch(/^(all|own|view|none)$/)
    }
  })

  it('gives the owner full access to everything', () => {
    for (const capability of CapabilitySchema.options) expect(scopeFor('owner', capability)).toBe('all')
  })

  it('keeps billing and account deletion owner-only', () => {
    for (const role of ROLES.filter((r) => r !== 'owner')) {
      expect(can(role, 'billing.manage')).toBe(false)
      expect(can(role, 'account.delete')).toBe(false)
    }
  })

  it('lets read-only users view but never act', () => {
    expect(canView('readonly', 'conversations.view')).toBe(true)
    expect(can('readonly', 'messages.send')).toBe(false)
    expect(scopeFor('readonly', 'contacts.edit')).toBe('view')
  })

  it('limits staff to their own records', () => {
    expect(scopeFor('staff', 'conversations.view')).toBe('own')
    expect(can('staff', 'ai.approve')).toBe(true)
    expect(can('staff', 'contacts.export')).toBe(false)
  })

  it('names the least-privileged role for no-permission messages', () => {
    expect(lowestRoleWith('billing.manage')).toBe('owner')
    expect(lowestRoleWith('contacts.export')).toBe('admin')
    expect(lowestRoleWith('messages.send')).toBe('staff')
    expect(lowestRoleWith('reports.view')).toBe('readonly')
  })
})

describe('navigation visibility (PRD 28.1)', () => {
  it('shows home and settings to everyone', () => {
    for (const role of ROLES) {
      expect(canSeeArea(role, 'home')).toBe(true)
      expect(canSeeArea(role, 'settings')).toBe(true)
    }
  })

  it('hides admin-only areas from managers and below', () => {
    for (const area of ['automations', 'connections'] as const) {
      expect(canSeeArea('admin', area)).toBe(true)
      expect(canSeeArea('manager', area)).toBe(false)
    }
  })

  it('lets operators open Sales and Bookings', () => {
    expect(canSeeArea('staff', 'sales')).toBe(true)
    expect(canSeeArea('staff', 'bookings')).toBe(true)
    expect(canSeeArea('readonly', 'sales')).toBe(false)
  })

  it('lets managers open the compliance center read-only (PRD 30.1)', () => {
    expect(canSeeArea('manager', 'compliance')).toBe(true)
    expect(canSeeArea('staff', 'compliance')).toBe(false)
  })

  it('gives read-only users reports but not the inbox', () => {
    expect(canSeeArea('readonly', 'reports')).toBe(true)
    expect(canSeeArea('readonly', 'inbox')).toBe(false)
  })
})
