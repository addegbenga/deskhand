import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/ai/knowledge/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/ai/knowledge/overview' })
  },
})
