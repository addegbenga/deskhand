import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouterState } from '@tanstack/react-router'
import { lazy, Suspense, useEffect } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { onChange } from '@deskhand/mock-api/runtime'
import { DemoRibbon, EmptyState, Toaster, TooltipProvider, usePreferencesEffect } from '@deskhand/ui'
import { Compass } from 'lucide-react'

const SHOW_TOOLBAR = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true'
const DevToolbar = lazy(() => import('@deskhand/mock-api/toolbar').then((m) => ({ default: m.DevToolbar })))

function Root() {
  const queryClient = useQueryClient()
  const embed = useRouterState({ select: (state) => state.location.pathname.includes('/embed/widget') })
  usePreferencesEffect()
  useTranslation()
  useEffect(
    () =>
      onChange(({ topics }) => {
        if (
          topics.includes('*') ||
          topics.includes('session') ||
          topics.includes('slots') ||
          topics.includes('appointments') ||
          topics.includes('public-booking')
        ) {
          void queryClient.invalidateQueries({
            predicate: (query) => query.queryKey[0] !== 'public-widget',
          })
        }
      }),
    [queryClient],
  )
  return (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <Toaster />
      {!embed && <DemoRibbon />}
      {SHOW_TOOLBAR && !embed && (
        <Suspense fallback={null}>
          <DevToolbar variant="public" />
        </Suspense>
      )}
    </TooltipProvider>
  )
}

export function PublicNotFound() {
  const { t } = useTranslation('public')
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <EmptyState icon={Compass} title={t('notFound.title')} description={t('notFound.body')} />
    </main>
  )
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: PublicNotFound,
})
