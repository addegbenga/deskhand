import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Navigate, redirect } from '@tanstack/react-router'
import type { ComponentType } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { isApiError, OnboardingStepSchema, scopeFor, type OnboardingStep } from '@deskhand/schemas'
import { Button, ErrorState, NoPermissionState, PermissionProvider, Skeleton, Wordmark } from '@deskhand/ui'
import { onboardingQuery } from '../api/onboarding'
import { sessionQuery, useSession } from '../api/queries'
import { ChannelsStep } from '../features/onboarding/steps/ChannelsStep'
import { ComplianceStep } from '../features/onboarding/steps/ComplianceStep'
import { EmployeeStep } from '../features/onboarding/steps/EmployeeStep'
import { GoalsStep } from '../features/onboarding/steps/GoalsStep'
import { KnowledgeStep } from '../features/onboarding/steps/KnowledgeStep'
import { LaunchStep } from '../features/onboarding/steps/LaunchStep'
import { ProfileStep } from '../features/onboarding/steps/ProfileStep'
import { ServicesStep } from '../features/onboarding/steps/ServicesStep'
import type { StepProps } from '../features/onboarding/steps/types'

const STEPS: Record<OnboardingStep, ComponentType<StepProps>> = {
  profile: ProfileStep,
  goals: GoalsStep,
  knowledge: KnowledgeStep,
  channels: ChannelsStep,
  services: ServicesStep,
  employee: EmployeeStep,
  compliance: ComplianceStep,
  launch: LaunchStep,
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="h-14 border-b border-border bg-surface" />
      <div className="mx-auto flex max-w-6xl gap-10 px-4 pt-10 md:px-8">
        <div className="w-56 shrink-0 max-lg:hidden">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="mb-5 h-6 w-40" />
          ))}
        </div>
        <div className="flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-8 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <Skeleton className="mt-10 h-40 w-full" />
          <Skeleton className="mt-6 h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-14 items-center border-b border-border bg-surface px-4 md:px-8">
        <Wordmark className="text-base" />
      </header>
      <main id="main" className="flex flex-1 items-center justify-center p-4">
        {children}
      </main>
    </div>
  )
}

/** Onboarding steps 2 to 9 (PRD 6). Only people who manage connections and the AI can run setup. */
function OnboardingPage() {
  const { step } = Route.useParams()
  const { t } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation('common')
  const session = useSession()
  const allowed = scopeFor(session.membership.role, 'connections.manage') === 'all'
  const query = useQuery({
    ...onboardingQuery,
    enabled: allowed,
    // Template reviews finish on the mock clock; keep checking while any are waiting.
    refetchInterval: (q) => (q.state.data?.state.channels.whatsapp?.templates.some((tpl) => tpl.status === 'pending') ? 5000 : false),
  })

  if (!allowed) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4">
          <NoPermissionState roleLabel={tCommon(`roles.${session.membership.role}`)} />
          <Button asChild variant="outline">
            <Link to="/app/home">{t('frame.backHome')}</Link>
          </Button>
        </div>
      </Frame>
    )
  }
  if (query.isPending) return <OnboardingSkeleton />
  if (query.isError) {
    return (
      <Frame>
        <ErrorState supportCode={isApiError(query.error) ? query.error.supportCode : undefined} onRetry={() => void query.refetch()} />
      </Frame>
    )
  }

  const parsed = OnboardingStepSchema.safeParse(step)
  if (!parsed.success) return <Navigate to="/onboarding/$step" params={{ step: query.data.state.currentStep }} replace />
  const Step = STEPS[parsed.data]
  return (
    <PermissionProvider role={session.membership.role}>
      <Step key={parsed.data} view={query.data} session={session} />
    </PermissionProvider>
  )
}

export const Route = createFileRoute('/onboarding/$step')({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(sessionQuery)
    } catch (error) {
      if (isApiError(error, 'unauthenticated')) throw redirect({ to: '/login', search: {} })
      throw error
    }
  },
  pendingComponent: OnboardingSkeleton,
  component: OnboardingPage,
})
