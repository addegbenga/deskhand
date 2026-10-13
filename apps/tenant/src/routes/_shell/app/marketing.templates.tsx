import { createFileRoute } from '@tanstack/react-router'
import { TemplatesPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/templates')({ component: TemplatesPage })
