import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onChange } from '@deskhand/mock-api/runtime'
import { useConnectivity } from './connectivity'

/** Topics that update live; anything else changed from another tab shows the refresh prompt (PRD 28.3). */
const LIVE_TOPICS = new Set([
  'conversations',
  'messages',
  'approvals',
  'notifications',
  'nav-summary',
  'bookings',
  'home',
  'contacts',
  'appointments',
  'slots',
  'pipeline',
  'leads',
  'tasks',
  'public-booking',
  'employees',
  'knowledge',
  'transcripts',
  'training',
  'recipes',
  'campaigns',
  'reviews',
  'payments',
  'forms',
  'planner',
  'templates',
  'links',
  'reports',
  'pages',
  'connections',
  'team',
  'billing',
  'usage',
  'settings',
  'compliance',
])

export function useDataSync(queryClient: QueryClient) {
  useEffect(
    () =>
      onChange(({ topics, remote }) => {
        if (topics.includes('*')) {
          useConnectivity.getState().setStale(false)
          void queryClient.invalidateQueries()
          return
        }
        const live = topics.filter((topic) => LIVE_TOPICS.has(topic))
        for (const topic of live) void queryClient.invalidateQueries({ queryKey: [topic] })
        const rest = topics.filter((topic) => !LIVE_TOPICS.has(topic) && topic !== 'storage-full')
        if (rest.length === 0) return
        if (remote) useConnectivity.getState().setStale(true)
        else for (const topic of rest) void queryClient.invalidateQueries({ queryKey: [topic] })
      }),
    [queryClient],
  )
}

export function refreshStale(queryClient: QueryClient) {
  useConnectivity.getState().setStale(false)
  void queryClient.invalidateQueries()
}
