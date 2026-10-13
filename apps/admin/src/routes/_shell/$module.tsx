import { createFileRoute } from '@tanstack/react-router'
import { ModulePlaceholder } from '../../features/ModulePlaceholder'

function Module() {
  const { module } = Route.useParams()
  return <ModulePlaceholder module={module} />
}

export const Route = createFileRoute('/_shell/$module')({ component: Module })
