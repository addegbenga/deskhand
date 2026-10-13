import { createFileRoute } from '@tanstack/react-router'
import { MarketingLayout } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing')({ component: MarketingLayout })
