import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/compliance/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/compliance/$page', params: { page: 'overview' }, search: {} })
  },
})
