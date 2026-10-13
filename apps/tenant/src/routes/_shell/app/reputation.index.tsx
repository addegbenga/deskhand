import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/reputation/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/reputation/reviews' })
  },
})
