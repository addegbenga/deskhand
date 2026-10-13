import { createFileRoute, redirect } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { isApiError } from '@deskhand/schemas'
import { ErrorState, Skeleton } from '@deskhand/ui'
import { adminSessionQuery } from '../api/queries'
import { AdminShell } from '../shell/AdminShell'

function ShellSkeleton() {
  return (
    <div className="flex h-dvh">
      <div className="w-60 bg-sidebar p-4 max-md:hidden">
        <Skeleton className="h-5 w-28 opacity-30" />
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton key={i} className="h-7 w-full opacity-30" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center gap-3 border-b border-border px-4">
          <Skeleton className="h-9 w-full max-w-md" />
          <Skeleton className="ms-auto size-8 rounded-full" />
        </div>
        <div className="mx-auto w-full max-w-6xl p-8">
          <Skeleton className="h-8 w-56" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ShellError({ error, reset }: { error: unknown; reset: () => void }) {
  const { t } = useTranslation('common')
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <ErrorState
        supportCode={isApiError(error) ? error.supportCode : undefined}
        description={isApiError(error, 'network_error') ? t('states.offline.body') : undefined}
        onRetry={reset}
      />
    </div>
  )
}

export const Route = createFileRoute('/_shell')({
  beforeLoad: async ({ context }) => {
    try {
      await context.queryClient.ensureQueryData(adminSessionQuery)
    } catch (error) {
      if (isApiError(error, 'unauthenticated')) throw redirect({ to: '/login' })
      throw error
    }
  },
  pendingComponent: ShellSkeleton,
  errorComponent: ({ error, reset }) => <ShellError error={error} reset={reset} />,
  component: AdminShell,
})
