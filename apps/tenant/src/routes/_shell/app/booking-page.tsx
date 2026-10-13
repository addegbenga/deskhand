import { createFileRoute } from '@tanstack/react-router'
import { BookingPageSettings } from '../../../features/calendar/BookingPageSettings'

export const Route = createFileRoute('/_shell/app/booking-page')({ component: BookingPageSettings })
