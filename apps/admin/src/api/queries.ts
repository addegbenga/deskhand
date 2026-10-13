import { keepPreviousData, queryOptions, useInfiniteQuery, useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import {
  AdminOverviewSchema,
  AdminSessionSchema,
  pageOf,
  RevealResponseSchema,
  TenantSummarySchema,
  type DataRegion,
  type MarketCode,
  type RevealRequest,
} from '@deskhand/schemas'
import { regionParam } from '../lib/region'
import { api } from './client'

/** Query keys start with the mock change topic, so a data change invalidates exactly what it affects. */
export const adminSessionQuery = queryOptions({
  queryKey: ['admin-session'],
  queryFn: ({ signal }) => api('/admin/session', { schema: AdminSessionSchema, signal }),
  staleTime: 60_000,
})

export function useAdminSession() {
  return useSuspenseQuery(adminSessionQuery).data
}

export function useAdminOverview(region: DataRegion | 'all') {
  return useQuery({
    queryKey: ['admin-tenants', 'overview', region],
    queryFn: ({ signal }) => api('/admin/overview', { schema: AdminOverviewSchema, query: { region: regionParam(region) }, signal }),
  })
}

type TenantFilters = { q: string; market?: MarketCode; region: DataRegion | 'all' }

const TENANT_PAGE = pageOf(TenantSummarySchema)

export function useTenantSearch({ q, region }: Omit<TenantFilters, 'market'>, enabled: boolean) {
  return useQuery({
    queryKey: ['admin-tenants', 'search', q, region],
    queryFn: ({ signal }) =>
      api('/admin/tenants', { schema: TENANT_PAGE, query: { q, region: regionParam(region), limit: 8 }, signal }),
    enabled: enabled && q.trim().length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useTenants({ q, market, region }: TenantFilters) {
  return useInfiniteQuery({
    queryKey: ['admin-tenants', 'list', q, market, region],
    queryFn: ({ signal, pageParam }) =>
      api('/admin/tenants', {
        schema: TENANT_PAGE,
        query: { q, market, region: regionParam(region), limit: 25, cursor: pageParam },
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })
}

export function useAdminSignIn() {
  return useMutation({ mutationFn: () => api('/admin/auth/sign-in', { method: 'POST', schema: AdminSessionSchema }) })
}

export function useAdminSignOut() {
  return useMutation({ mutationFn: () => api('/admin/auth/sign-out', { method: 'POST' }) })
}

export function useRevealPii() {
  return useMutation({
    mutationFn: (body: RevealRequest) => api('/admin/reveal', { method: 'POST', body, schema: RevealResponseSchema }),
  })
}

export function useEndReveal() {
  return useMutation({ mutationFn: () => api('/admin/reveal/end', { method: 'POST' }) })
}

export function useEndImpersonation() {
  return useMutation({ mutationFn: () => api('/admin/impersonation/end', { method: 'POST' }) })
}
