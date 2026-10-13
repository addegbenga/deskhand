import { createFileRoute } from '@tanstack/react-router'
import { ServicesPage } from '../../../features/calendar/ServicesPage'

export const Route = createFileRoute('/_shell/app/services')({ component: ServicesPage })
