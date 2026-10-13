import { createFileRoute } from '@tanstack/react-router'
import { ModuleGate } from '../../features/ModuleGate'
import { OverviewPage } from '../../features/OverviewPage'

export const Route = createFileRoute('/_shell/')({
  component: () => (
    <ModuleGate module="overview">
      <OverviewPage />
    </ModuleGate>
  ),
})
