import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/payments/')({
  beforeLoad: () => {
    throw redirect({ to: '/app/payments/links' })
  },
})
