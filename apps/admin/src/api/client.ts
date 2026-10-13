import { createApiClient } from '@deskhand/schemas'
import { useConnectivity } from '../lib/connectivity'

export { ApiError, isApiError } from '@deskhand/schemas'

export const api = createApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  onReachable: (ok) => useConnectivity.getState().setReachable(ok),
})
