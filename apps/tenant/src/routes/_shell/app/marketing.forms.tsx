import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/marketing/forms')({ component: () => <Outlet /> })
