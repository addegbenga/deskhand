import { create } from 'zustand'

type Connectivity = {
  browserOnline: boolean
  reachable: boolean
  setReachable: (reachable: boolean) => void
}

/** Offline when the browser says so or the last request could not reach the API. */
export const useConnectivity = create<Connectivity>()((set) => ({
  browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
  reachable: true,
  setReachable: (reachable) => set((s) => (s.reachable === reachable ? s : { reachable })),
}))

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => useConnectivity.setState({ browserOnline: true }))
  window.addEventListener('offline', () => useConnectivity.setState({ browserOnline: false }))
}

export function useIsOffline() {
  return useConnectivity((s) => !s.browserOnline || !s.reachable)
}
