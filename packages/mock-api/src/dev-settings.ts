import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminPersona, Role } from '@deskhand/schemas'
import type { ScenarioId } from './scenarios'

/** 'instant' skips simulated latency; tests use it, the toolbar does not offer it. */
export type NetworkMode = 'fast' | 'slow' | 'offline' | 'failing' | 'instant'

type DevSettings = {
  scenario: ScenarioId
  role: Role
  /** The person signed in through the login, sign-up or invite flows. Null means the seeded person for the role. */
  userId: string | null
  adminPersona: AdminPersona
  network: NetworkMode
  signedIn: boolean
  adminSignedIn: boolean
  impersonating: boolean
  clockOffsetMs: number
  set: (patch: Partial<Omit<DevSettings, 'set'>>) => void
}

const STORAGE_KEY = 'deskhand-dev-settings'

/** Dev toolbar state shared by the UI and the mock handlers (FE-DOC 8.3). Never used by real API code. */
export const useDevSettings = create<DevSettings>()(
  persist(
    (set) => ({
      scenario: 'A',
      role: 'owner',
      userId: null,
      adminPersona: 'support',
      network: 'fast',
      signedIn: true,
      adminSignedIn: true,
      impersonating: false,
      clockOffsetMs: 0,
      set: (patch) => set(patch),
    }),
    { name: STORAGE_KEY },
  ),
)

export const devSettings = () => useDevSettings.getState()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) void useDevSettings.persist.rehydrate()
  })
}
