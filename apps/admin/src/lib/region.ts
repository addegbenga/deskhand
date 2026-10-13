import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DataRegion } from '@deskhand/schemas'

/** Region switch: staff work inside one data region at a time (PRD 31, data residency). */
export const useRegion = create<{ region: DataRegion | 'all'; setRegion: (region: DataRegion | 'all') => void }>()(
  persist((set) => ({ region: 'all', setRegion: (region) => set({ region }) }), { name: 'deskhand-admin-region' }),
)

export function regionParam(region: DataRegion | 'all') {
  return region === 'all' ? undefined : region
}
