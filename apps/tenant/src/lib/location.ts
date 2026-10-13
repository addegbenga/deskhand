import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Location, Session } from '@deskhand/schemas'

type LocationState = {
  locationId: string | null
  setLocationId: (locationId: string | null) => void
}

/** Selected location; null means all locations the user can see (PRD 28.2). */
export const useLocationStore = create<LocationState>()(
  persist((set) => ({ locationId: null, setLocationId: (locationId) => set({ locationId }) }), {
    name: 'deskhand-location',
  }),
)

/** Resolves the selected location against the session, falling back to all locations. */
export function useSelectedLocation(session: Session): { locationId: string | null; location: Location | null } {
  const locationId = useLocationStore((s) => s.locationId)
  const location = session.locations.find((l) => l.id === locationId) ?? null
  if (session.locations.length === 1) return { locationId: session.locations[0]!.id, location: session.locations[0]! }
  return { locationId: location?.id ?? null, location }
}

/** Locale context for formatting: the selected location, or the first one. */
export function useLocaleContext(session: Session) {
  const { location } = useSelectedLocation(session)
  const source = location ?? session.locations[0]
  return {
    locale: source?.locale ?? 'en',
    timeZone: source?.timezone ?? 'UTC',
    currency: source?.currency ?? 'USD',
  }
}
