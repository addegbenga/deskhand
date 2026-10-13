import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/reports/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/reports/$reportId', params: { reportId: 'overview' } })
  },
})
