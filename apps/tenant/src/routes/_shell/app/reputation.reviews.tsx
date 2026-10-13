import { createFileRoute } from '@tanstack/react-router'
import { ReviewsPage } from '../../../features/grow/ReputationPages'

export const Route = createFileRoute('/_shell/app/reputation/reviews')({ component: ReviewsPage })
