import { createFileRoute } from '@tanstack/react-router'
import { ReviewInsightsPage } from '../../../features/grow/ReputationPages'

export const Route = createFileRoute('/_shell/app/reputation/insights')({ component: ReviewInsightsPage })
