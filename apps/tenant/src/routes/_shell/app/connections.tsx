import { createFileRoute } from '@tanstack/react-router'
import { ConnectionsPage } from '../../../features/settings/ConnectionsPage'

export const Route = createFileRoute('/_shell/app/connections')({ component: ConnectionsPage })
