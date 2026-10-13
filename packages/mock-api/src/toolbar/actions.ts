import { useEffect, useState } from 'react'
import type { Account, AccountPatch, AdminPersona, Role } from '@deskhand/schemas'
import { devSettings, type NetworkMode } from '../dev-settings'
import type { Dump } from '../db'
import type { ScenarioId } from '../scenarios'
import { db, dumpScenario, ensureSeeded, restoreDump, write } from '../store'
import { notifyChange, onChange } from '../sync'

export async function switchScenario(scenario: ScenarioId) {
  devSettings().set({ scenario, userId: null })
  await ensureSeeded(scenario)
  notifyChange(['*'])
}

export function switchRole(role: Role) {
  devSettings().set({ role, userId: null, signedIn: true })
  notifyChange(['*'])
}

export function switchPersona(adminPersona: AdminPersona) {
  devSettings().set({ adminPersona, adminSignedIn: true })
  notifyChange(['*'])
}

export function setNetwork(network: NetworkMode) {
  devSettings().set({ network })
  if (network !== 'offline') notifyChange(['*'])
}

export function setClockOffset(clockOffsetMs: number) {
  devSettings().set({ clockOffsetMs })
  notifyChange(['*'])
}

export function setImpersonating(impersonating: boolean) {
  devSettings().set({ impersonating })
  notifyChange(['admin-session'])
}

export async function patchAccount(patch: AccountPatch) {
  await write(['session', 'banners', 'nav-summary'], (database) => database.accounts.toCollection().modify(patch))
}

export async function simulateInboundNow() {
  const { simulateInbound } = await import('../simulators')
  return simulateInbound()
}

export async function simulateReviewNow() {
  const { simulateReviewArrival } = await import('../simulators')
  return simulateReviewArrival()
}

export async function simulatePaymentNow() {
  const { simulatePaymentWebhook } = await import('../simulators')
  return simulatePaymentWebhook()
}

export async function simulateTemplatesNow() {
  const { simulateTemplateReview } = await import('../simulators')
  return simulateTemplateReview()
}

/** Skip the simulated Meta review so a demo can go live without waiting 20 seconds. */
export async function approveWhatsAppTemplates() {
  await write(['onboarding', 'session', 'banners', 'nav-summary'], async (database) => {
    const state = await database.onboarding.toCollection().first()
    if (!state?.channels.whatsapp) return
    state.channels.whatsapp.templates = state.channels.whatsapp.templates.map((template) =>
      template.status === 'pending' ? { ...template, status: 'approved' as const } : template,
    )
    await database.onboarding.put(state)
  })
}

export async function exportScenario() {
  const dump = await dumpScenario()
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `deskhand-scenario-${dump.scenario}-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export async function importScenario(file: File) {
  const dump = JSON.parse(await file.text()) as Dump
  await restoreDump(dump)
  devSettings().set({ scenario: dump.scenario })
  notifyChange(['*'])
}

/** Current account straight from the mock database, kept fresh on every change. */
export function useMockAccount(): Account | null {
  const [account, setAccount] = useState<Account | null>(null)
  useEffect(() => {
    let alive = true
    const load = async () => {
      const database = await db()
      const next = await database.accounts.toCollection().first()
      if (alive) setAccount(next ?? null)
    }
    void load()
    const off = onChange(() => void load())
    return () => {
      alive = false
      off()
    }
  }, [])
  return account
}
