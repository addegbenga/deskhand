import { createFileRoute } from '@tanstack/react-router'
import { AutomationsPage } from '../../../features/grow/AutomationsPage'

export const Route = createFileRoute('/_shell/app/automations/')({ component: AutomationsPage })
