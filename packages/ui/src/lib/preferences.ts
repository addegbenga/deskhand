import { useEffect } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'

type PreferencesState = {
  theme: Theme
  density: Density
  sidebarCollapsed: boolean
  setTheme: (theme: Theme) => void
  setDensity: (density: Density) => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

/** Per-user display preferences (FE-DOC 4.2: dark mode and density toggle). */
export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      density: 'comfortable',
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: 'deskhand-preferences' },
  ),
)

function prefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/** Applies theme and density to the document root. Mount once per app. */
export function usePreferencesEffect() {
  const theme = usePreferences((s) => s.theme)
  const density = usePreferences((s) => s.density)

  useEffect(() => {
    const root = document.documentElement
    const apply = () => root.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark()))
    apply()
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.density = density
  }, [density])
}
