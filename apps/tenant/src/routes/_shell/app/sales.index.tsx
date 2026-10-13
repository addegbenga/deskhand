import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/sales/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/sales/$page', params: { page: 'leads' } })
  },
})
