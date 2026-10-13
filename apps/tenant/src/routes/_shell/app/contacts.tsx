import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/contacts')({
  component: () => <Outlet />,
})
