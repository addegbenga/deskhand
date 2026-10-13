import { createFileRoute } from '@tanstack/react-router'
import { PaymentsLayout } from '../../../features/grow/PaymentsPages'

export const Route = createFileRoute('/_shell/app/payments')({ component: PaymentsLayout })
