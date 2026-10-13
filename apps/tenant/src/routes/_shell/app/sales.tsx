import { createFileRoute } from '@tanstack/react-router'
import { SalesLayout } from '../../../features/sales/SalesLayout'

export const Route = createFileRoute('/_shell/app/sales')({ component: SalesLayout })
