import { createFileRoute } from '@tanstack/react-router'
import { PagesListPage } from '../../../features/insight/PagesPages'

export const Route = createFileRoute('/_shell/app/pages/')({ component: PagesListPage })
