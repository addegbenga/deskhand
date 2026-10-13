import { createFileRoute } from '@tanstack/react-router'
import { ScenariosPage } from '../../../features/dev/ScenariosPage'

export const Route = createFileRoute('/_shell/dev/scenarios')({ component: ScenariosPage })
