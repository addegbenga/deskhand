import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/calendar')({
  beforeLoad: () => {
    throw redirect({ to: '/app/bookings' })
  },
})

