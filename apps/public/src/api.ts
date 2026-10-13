import { queryOptions } from '@tanstack/react-query'
import { createApiClient, PublicTenantSchema } from '@deskhand/schemas'

export const api = createApiClient({ baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api' })

/** Query keys start with the mock change topic, so a data change invalidates exactly what it affects. */
export const publicTenantQuery = (slug: string) =>
  queryOptions({
    queryKey: ['session', 'public-tenant', slug],
    queryFn: ({ signal }) => api(`/public/tenants/${encodeURIComponent(slug)}`, { schema: PublicTenantSchema, signal }),
  })
