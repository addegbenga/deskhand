import { createFileRoute, redirect } from '@tanstack/react-router'
import { isApiError, scopeFor } from '@deskhand/schemas'
import { onboardingQuery } from '../api/onboarding'
import { sessionQuery } from '../api/queries'

/** Signed-out people go to login; owners who have not gone live yet go back to where setup stopped (PRD 6.3). */
export const Route = createFileRoute('/')({
  beforeLoad: async ({ context }) => {
    try {
      const session = await context.queryClient.ensureQueryData(sessionQuery)
      if (scopeFor(session.membership.role, 'connections.manage') === 'all') {
        const view = await context.queryClient.ensureQueryData(onboardingQuery)
        if (!view.state.liveAt) throw redirect({ to: '/onboarding/$step', params: { step: view.state.currentStep } })
      }
    } catch (error) {
      if (isApiError(error, 'unauthenticated')) throw redirect({ to: '/login', search: {} })
      if (isApiError(error)) throw redirect({ to: '/app/home' })
      throw error
    }
    throw redirect({ to: '/app/home' })
  },
})
