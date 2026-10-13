import { createFileRoute } from '@tanstack/react-router'
import { ReputationLayout } from '../../../features/grow/ReputationPages'

export const Route = createFileRoute('/_shell/app/reputation')({ component: ReputationLayout })
