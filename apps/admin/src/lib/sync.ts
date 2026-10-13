import type { QueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onChange } from '@deskhand/mock-api/runtime'

/** Admin views are read-mostly, so every mock data change refreshes the matching queries right away. */
export function useDataSync(queryClient: QueryClient) {
  useEffect(
    () =>
      onChange(({ topics }) => {
        if (topics.includes('*')) {
          void queryClient.invalidateQueries()
          return
        }
        for (const topic of topics) void queryClient.invalidateQueries({ queryKey: [topic] })
      }),
    [queryClient],
  )
}
