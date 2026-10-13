import { createFileRoute } from '@tanstack/react-router'
import { StaffPage } from '../../../features/calendar/StaffPage'

export const Route = createFileRoute('/_shell/app/staff')({ component: StaffPage })
