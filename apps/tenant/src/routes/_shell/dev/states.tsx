import { createFileRoute } from '@tanstack/react-router'
import { StatesDemo } from '../../../features/dev/StatesDemo'

export const Route = createFileRoute('/_shell/dev/states')({ component: StatesDemo })
