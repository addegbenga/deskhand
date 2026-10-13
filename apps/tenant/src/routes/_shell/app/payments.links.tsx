import { createFileRoute } from '@tanstack/react-router'
import { PaymentLinksPage } from '../../../features/grow/PaymentsPages'

export const Route = createFileRoute('/_shell/app/payments/links')({ component: PaymentLinksPage })
