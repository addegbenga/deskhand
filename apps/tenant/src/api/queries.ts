import { queryOptions, useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { z } from 'zod'
import {
  AccountSchema,
  BannerSchema,
  ContactSchema,
  NavSummarySchema,
  NotificationSchema,
  pageOf,
  SearchResultSchema,
  SessionSchema,
  type AccountPatch,
} from '@deskhand/schemas'
import { api } from './client'

/** Query keys start with the mock change topic, so a data change invalidates exactly what it affects. */
export const sessionQuery = queryOptions({
  queryKey: ['session'],
  queryFn: ({ signal }) => api('/session', { schema: SessionSchema, signal }),
  staleTime: 60_000,
})

export function useSession() {
  return useSuspenseQuery(sessionQuery).data
}

export function useNavSummary(locationId: string | null) {
  return useQuery({
    queryKey: ['nav-summary', locationId],
    queryFn: ({ signal }) => api('/nav-summary', { schema: NavSummarySchema, query: { locationId }, signal }),
    refetchInterval: 30_000,
  })
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: ({ signal }) => api('/notifications', { schema: z.array(NotificationSchema), signal }),
    enabled,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] })
      const previous = queryClient.getQueryData<z.infer<typeof NotificationSchema>[]>(['notifications'])
      queryClient.setQueryData(['notifications'], previous?.map((n) => (n.id === id ? { ...n, read: true } : n)))
      return { previous }
    },
    onError: (_error, _id, context) => queryClient.setQueryData(['notifications'], context?.previous),
  })
}

export function useMarkAllNotificationsRead() {
  return useMutation({ mutationFn: () => api('/notifications/read-all', { method: 'POST' }) })
}

export function useBanners() {
  return useQuery({
    queryKey: ['banners'],
    queryFn: ({ signal }) => api('/banners', { schema: z.array(BannerSchema), signal }),
  })
}

export function useSearch(q: string, locationId: string | null) {
  return useQuery({
    queryKey: ['search', q, locationId],
    queryFn: ({ signal }) => api('/search', { schema: SearchResultSchema, query: { q, locationId }, signal }),
    enabled: q.trim().length >= 2,
    placeholderData: (previous) => previous,
  })
}

export function usePatchAccount() {
  return useMutation({
    mutationFn: (patch: AccountPatch) => api('/account', { method: 'PATCH', body: patch, schema: AccountSchema }),
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/auth/sign-in', { method: 'POST', schema: SessionSchema }),
    onSuccess: (session) => queryClient.setQueryData(sessionQuery.queryKey, session),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/auth/sign-out', { method: 'POST' }),
    onSuccess: () => queryClient.clear(),
  })
}

export function useDemoContacts(mode: string) {
  return useQuery({
    queryKey: ['demo', mode],
    queryFn: ({ signal }) => api('/demo/contacts', { schema: pageOf(ContactSchema), query: { mode }, signal }),
    retry: false,
  })
}
