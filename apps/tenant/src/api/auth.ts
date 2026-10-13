import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import {
  InvitationPreviewSchema,
  LoginResultSchema,
  OutboxMessageSchema,
  ResetTokenSchema,
  SignupSchema,
  SlugCheckSchema,
  type AboutBusiness,
  type AboutYou,
  type AcceptInvitation,
  type Login,
  type LoginResult,
  type Signup,
  type SignupStart,
} from '@deskhand/schemas'
import { api, isApiError } from './client'
import { sessionQuery } from './queries'

/** The sign-up in progress, or null when there is none (so the first screen shows). */
export const signupQuery = queryOptions({
  queryKey: ['signup'],
  queryFn: async ({ signal }) => {
    try {
      return await api('/auth/signup', { schema: SignupSchema, signal })
    } catch (error) {
      if (isApiError(error, 'not_found')) return null
      throw error
    }
  },
  staleTime: 0,
})

function useSignupMutation<V>(fn: (variables: V) => Promise<Signup>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (signup) => queryClient.setQueryData(signupQuery.queryKey, signup),
  })
}

export function useStartSignup() {
  return useSignupMutation((body: SignupStart) => api('/auth/signup', { method: 'POST', body, schema: SignupSchema }))
}

export function useVerifyCode() {
  return useSignupMutation((code: string) => api('/auth/signup/verify', { method: 'POST', body: { code }, schema: SignupSchema }))
}

export function useResendCode() {
  return useSignupMutation(() => api('/auth/signup/resend', { method: 'POST', schema: SignupSchema }))
}

export function usePatchSignup() {
  return useSignupMutation(
    (body: { aboutYou: AboutYou } | { business: AboutBusiness } | { plan: 'starter' | 'growth' | 'pro' }) =>
      api('/auth/signup', { method: 'PATCH', body, schema: SignupSchema }),
  )
}

export function useAbandonSignup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api('/auth/signup', { method: 'DELETE' }),
    onSuccess: () => queryClient.setQueryData(signupQuery.queryKey, null),
  })
}

export function useSlugCheck(slug: string) {
  return useQuery({
    queryKey: ['signup', 'slug', slug],
    queryFn: ({ signal }) => api('/auth/slug-check', { schema: SlugCheckSchema, query: { slug }, signal }),
    enabled: slug.length >= 3,
    placeholderData: (previous) => previous,
  })
}

export function useBusinessCheck(link: string) {
  return useQuery({
    queryKey: ['signup', 'business-check', link],
    queryFn: ({ signal }) => api('/auth/business-check', { schema: z.object({ match: z.string().nullable() }), query: { link }, signal }),
    enabled: link.trim().length >= 4,
  })
}

/** Every successful sign-in path primes the session and clears anything left from the previous person. */
function useSignInMutation<V>(fn: (variables: V) => Promise<LoginResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'signup' })
      queryClient.setQueryData(sessionQuery.queryKey, result.session)
    },
  })
}

export function useCompleteSignup() {
  return useSignInMutation((slug: string) => api('/auth/signup/complete', { method: 'POST', body: { slug }, schema: LoginResultSchema }))
}

export function useLogin() {
  return useSignInMutation((body: Login) => api('/auth/login', { method: 'POST', body, schema: LoginResultSchema }))
}

export function useConsumeMagicLink() {
  return useSignInMutation((token: string) => api('/auth/magic-link/consume', { method: 'POST', body: { token }, schema: LoginResultSchema }))
}

export function useAcceptInvitation(token: string) {
  return useSignInMutation((body: AcceptInvitation) =>
    api(`/invitations/${token}/accept`, { method: 'POST', body, schema: LoginResultSchema }),
  )
}

export function useMagicLink() {
  return useMutation({ mutationFn: (email: string) => api('/auth/magic-link', { method: 'POST', body: { email } }) })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: (email: string) => api('/auth/forgot', { method: 'POST', body: { email } }) })
}

export function useResetToken(token: string | undefined) {
  return useQuery({
    queryKey: ['reset', token],
    queryFn: ({ signal }) => api(`/auth/reset/${token}`, { schema: ResetTokenSchema, signal }),
    enabled: Boolean(token),
    retry: false,
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (body: { token: string; password: string }) => api('/auth/reset', { method: 'POST', body }),
  })
}

export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: ({ signal }) => api(`/invitations/${token}`, { schema: InvitationPreviewSchema, signal }),
    retry: false,
  })
}

/** Mock-only mailbox: polls so a code or link shows up as soon as it is "sent". */
export function useOutbox(to: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['outbox', to],
    queryFn: ({ signal }) => api('/dev/outbox', { schema: z.array(OutboxMessageSchema), query: { to }, signal }),
    enabled: enabled && Boolean(to),
    refetchInterval: 4000,
  })
}
