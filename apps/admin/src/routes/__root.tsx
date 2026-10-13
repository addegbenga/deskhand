import type { QueryClient } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { DemoRibbon, EmptyState, Toaster, TooltipProvider, usePreferencesEffect } from '@deskhand/ui'
import { Compass } from 'lucide-react'
import { useDataSync } from '../lib/sync'

const SHOW_TOOLBAR = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true'
const DevToolbar = lazy(() => import('@deskhand/mock-api/toolbar').then((m) => ({ default: m.DevToolbar })))

function Root() {
  const queryClient = useQueryClient()
  usePreferencesEffect()
  useDataSync(queryClient)
  useTranslation()
  return (
    <TooltipProvider delayDuration={300}>
      <Outlet />
      <Toaster />
      <DemoRibbon />
      {SHOW_TOOLBAR && (
        <Suspense fallback={null}>
          <DevToolbar variant="admin" />
        </Suspense>
      )}
    </TooltipProvider>
  )
}

function NotFound() {
  const { t } = useTranslation('common')
  return <EmptyState icon={Compass} title={t('states.notFound.title')} description={t('states.notFound.body')} />
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: Root,
  notFoundComponent: NotFound,
})
