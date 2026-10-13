import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRouter, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initI18n } from '@deskhand/i18n'
import { isApiError } from '@deskhand/schemas'
import { routeTree } from './routeTree.gen'
import './index.css'

initI18n('common')

const PUBLIC_PATHS = ['/login', '/signup', '/verify', '/forgot', '/invite/']

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (count, error) => count < 2 && (isApiError(error, 'server_error') || isApiError(error, 'network_error')),
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      const path = window.location.pathname
      if (isApiError(error, 'unauthenticated') && !PUBLIC_PATHS.some((prefix) => path.startsWith(prefix))) {
        void router.navigate({ to: '/login' })
      }
    },
  }),
  mutationCache: new MutationCache(),
})

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

async function boot() {
  if (!import.meta.env.VITE_API_BASE_URL) {
    const { startMockApi } = await import('@deskhand/mock-api')
    await startMockApi()
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void boot()
