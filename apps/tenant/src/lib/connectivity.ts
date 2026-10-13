import { create } from 'zustand'

type Connectivity = {
  browserOnline: boolean
  reachable: boolean
  stale: boolean
  setReachable: (reachable: boolean) => void
  setStale: (stale: boolean) => void
}

/** Offline when the browser says so or the last request could not reach the API. */
export const useConnectivity = create<Connectivity>()((set) => ({
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  reachable: true,
  stale: false,
  setReachable: (reachable) => set((s) => (s.reachable === reachable ? s : { reachable })),
  setStale: (stale) => set({ stale }),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useConnectivity.setState({ browserOnline: true }))
  window.addEventListener('offline', () => useConnectivity.setState({ browserOnline: false }))
}

export function useIsOffline() {
  return useConnectivity((s) => !s.browserOnline || !s.reachable)
}
