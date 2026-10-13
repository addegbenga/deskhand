import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/pipeline')({
  beforeLoad: () => {
    throw redirect({ to: '/app/sales/$page', params: { page: 'pipeline' } })
  },
})

