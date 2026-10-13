import { createFileRoute } from '@tanstack/react-router'
import { LinksPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/links')({ component: LinksPage })
