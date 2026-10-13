import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '../../../features/ai/ActivityPage'

export const Route = createFileRoute('/_shell/app/ai/activity')({ component: ActivityPage })
