import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MarketCodeSchema } from '@deskhand/schemas'
import { ModuleGate } from '../../features/ModuleGate'
import { TenantsPage } from '../../features/TenantsPage'

const SearchSchema = z.object({
  q: z.string().optional().catch(undefined),
  market: MarketCodeSchema.optional().catch(undefined),
})

function Tenants() {
  const { q, market } = Route.useSearch()
  return (
    <ModuleGate module="tenants">
      <TenantsPage q={q ?? ''} market={market} />
    </ModuleGate>
  )
}

export const Route = createFileRoute('/_shell/tenants')({
  validateSearch: (search) => SearchSchema.parse(search),
  component: Tenants,
})
