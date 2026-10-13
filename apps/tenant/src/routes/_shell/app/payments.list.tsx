import { createFileRoute } from '@tanstack/react-router'
import { PaymentsListPage } from '../../../features/grow/PaymentsPages'

export const Route = createFileRoute('/_shell/app/payments/list')({ component: PaymentsListPage })
