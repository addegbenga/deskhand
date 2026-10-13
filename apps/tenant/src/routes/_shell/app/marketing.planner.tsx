import { createFileRoute } from '@tanstack/react-router'
import { PlannerPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/planner')({ component: PlannerPage })
