import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate } from '@tanstack/react-router'
import { z } from 'zod'
import { ErrorState, Skeleton } from '@deskhand/ui'
import { signupQuery } from '../api/auth'
import { AuthLayout } from '../features/auth/AuthLayout'
import { AboutYouStep } from '../features/auth/signup/AboutYouStep'
import { AccountStep } from '../features/auth/signup/AccountStep'
import { BusinessStep } from '../features/auth/signup/BusinessStep'
import { PlanStep } from '../features/auth/signup/PlanStep'
import { WaitlistStep } from '../features/auth/signup/WaitlistStep'
import { WorkspaceStep } from '../features/auth/signup/WorkspaceStep'

const STEPS = ['about_you', 'business', 'plan', 'done'] as const
type Step = (typeof STEPS)[number]

export function AuthSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-1 w-full" />
      <Skeleton className="mt-4 h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-4 h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  )
}

/**
 * Sign-up (PRD 27.1). The server keeps the sign-up in progress, so leaving and coming back resumes at the
 * furthest step reached; the step search param only lets people go back to earlier screens.
 */
function SignupPage() {
  const { step } = Route.useSearch()
  const navigate = Route.useNavigate()
  const query = useQuery(signupQuery)
  const go = (next: Step) => void navigate({ search: { step: next } })

  if (query.isPending) {
    return (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    )
  }
  if (query.isError) {
    return (
      <AuthLayout>
        <ErrorState onRetry={() => void query.refetch()} />
      </AuthLayout>
    )
  }

  const signup = query.data
  if (!signup) {
    return (
      <AuthLayout>
        <AccountStep />
      </AuthLayout>
    )
  }
  if (signup.step === 'verify') return <Navigate to="/verify" replace />
  if (signup.step === 'waitlist') {
    return (
      <AuthLayout>
        <WaitlistStep signup={signup} />
      </AuthLayout>
    )
  }

  const reached = STEPS.indexOf(signup.step)
  const screen: Step = step && STEPS.indexOf(step) <= reached ? step : signup.step
  return (
    <AuthLayout>
      {screen === 'about_you' && <AboutYouStep key={screen} signup={signup} onDone={() => go('business')} />}
      {screen === 'business' && <BusinessStep key={screen} signup={signup} onDone={() => go('plan')} onBack={() => go('about_you')} />}
      {screen === 'plan' && <PlanStep key={screen} signup={signup} onDone={() => go('done')} onBack={() => go('business')} />}
      {screen === 'done' && <WorkspaceStep key={screen} signup={signup} onBack={() => go('plan')} />}
    </AuthLayout>
  )
}

export const Route = createFileRoute('/signup')({
  validateSearch: z.object({ step: z.enum(STEPS).optional() }),
  component: SignupPage,
})
