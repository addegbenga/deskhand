import { createFileRoute } from '@tanstack/react-router'
import { ReviewRequestsPage } from '../../../features/grow/ReputationPages'

export const Route = createFileRoute('/_shell/app/reputation/requests')({ component: ReviewRequestsPage })
