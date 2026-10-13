import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/settings/$page', params: { page: 'business' } })
  },
})
