import { createFileRoute } from '@tanstack/react-router'
import { ApprovalsPage } from '../../../features/ai/ApprovalsPage'

export const Route = createFileRoute('/_shell/app/ai/approvals')({ component: ApprovalsPage })
