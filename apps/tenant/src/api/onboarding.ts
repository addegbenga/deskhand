import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ImportResultSchema,
  OnboardingViewSchema,
  SandboxChatReplySchema,
  type ChannelKind,
  type OnboardingStep,
  type OnboardingView,
  type SandboxScript,
} from '@deskhand/schemas'
import { toast } from '@deskhand/ui'
import { i18next } from '@deskhand/i18n'
import { api } from './client'
import { sessionQuery } from './queries'

export const onboardingQuery = queryOptions({
  queryKey: ['onboarding'],
  queryFn: ({ signal }) => api('/onboarding', { schema: OnboardingViewSchema, signal }),
  staleTime: 5_000,
})

export function useOnboarding() {
  return useQuery(onboardingQuery)
}

/** Every onboarding write returns the full view: put it in the cache and celebrate new milestones. */
function useOnboardingMutation<V>(fn: (variables: V) => Promise<OnboardingView>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (view) => {
      queryClient.setQueryData(onboardingQuery.queryKey, view)
      for (const milestone of view.newMilestones) {
        toast.success(i18next.t(`onboarding:milestones.${milestone}`))
      }
      if (view.newMilestones.length || view.state.liveAt) void queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}

const post = (path: string, body?: unknown) => api(`/onboarding${path}`, { method: 'POST', body, schema: OnboardingViewSchema })

export function useSaveStep() {
  return useOnboardingMutation(
    ({ step, data, complete, skip }: { step: OnboardingStep; data?: object; complete?: boolean; skip?: boolean }) =>
      api(`/onboarding/steps/${step}`, { method: 'PUT', body: { data, complete, skip }, schema: OnboardingViewSchema }),
  )
}

export function useImportLink() {
  return useMutation({
    mutationFn: (url: string) => api('/onboarding/import', { method: 'POST', body: { url }, schema: ImportResultSchema }),
  })
}

export function useConnectWhatsApp() {
  return useOnboardingMutation((body: { businessPortfolio: string; number: string; displayName: string }) => post('/channels/whatsapp', body))
}

export function useEmailManaged() {
  return useOnboardingMutation(() => post('/channels/email/managed'))
}

export function useEmailDomain() {
  return useOnboardingMutation((body: { domain: string; address: string }) => post('/channels/email/domain', body))
}

export function useVerifyDns() {
  return useOnboardingMutation(() => post('/channels/email/verify'))
}

export function useConnectSimple() {
  return useOnboardingMutation(({ kind, value }: { kind: 'webchat' | 'messenger' | 'instagram' | 'sms'; value: string }) =>
    post(`/channels/${kind}`, { value }),
  )
}

export function useDisconnectChannel() {
  return useOnboardingMutation((kind: Exclude<ChannelKind, 'voice'>) =>
    api(`/onboarding/channels/${kind}`, { method: 'DELETE', schema: OnboardingViewSchema }),
  )
}

export function useConnectCalendar() {
  return useOnboardingMutation((body: { provider: 'google' | 'outlook'; account: string }) => post('/calendar', body))
}

export function useDisconnectCalendar() {
  return useOnboardingMutation(() => api('/onboarding/calendar', { method: 'DELETE', schema: OnboardingViewSchema }))
}

export function useRunSandbox() {
  return useOnboardingMutation((scripts: SandboxScript[]) => post('/sandbox/run', { scripts }))
}

export function useSandboxVerdict() {
  return useOnboardingMutation(({ script, verdict }: { script: SandboxScript; verdict: 'right' | 'wrong' }) =>
    post(`/sandbox/${script}/verdict`, { verdict }),
  )
}

export function useAcceptAllSandbox() {
  return useOnboardingMutation(() => post('/sandbox/verdicts'))
}

export function useSandboxChat() {
  return useMutation({
    mutationFn: (message: string) => api('/onboarding/sandbox/chat', { method: 'POST', body: { message }, schema: SandboxChatReplySchema }),
  })
}

export function useTestMessage() {
  return useOnboardingMutation((body: { channel: ChannelKind; to: string }) => post('/test-message', body))
}

export function useSetHandoff() {
  return useOnboardingMutation((body: { userId: string; channel: 'email' | 'whatsapp' | 'in_app' }) => post('/handoff', body))
}

export function useConfirmHandoff() {
  return useOnboardingMutation(() => post('/handoff/confirm'))
}

export function useGoLive() {
  return useOnboardingMutation(() => post('/go-live'))
}
