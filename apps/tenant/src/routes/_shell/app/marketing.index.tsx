import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/marketing/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/marketing/planner' })
  },
})
