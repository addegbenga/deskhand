import { createFileRoute } from '@tanstack/react-router'
import { SalesPageIdSchema } from '@deskhand/schemas'
import { LeadsPage } from '../../../features/sales/LeadsPage'
import { OpportunitiesPage } from '../../../features/sales/OpportunitiesPage'
import { PipelinePage } from '../../../features/pipeline/PipelinePage'

export const Route = createFileRoute('/_shell/app/sales/$page')({
  component: function SalesRoute() {
    const { page } = Route.useParams()
    const parsed = SalesPageIdSchema.safeParse(page)
    const id = parsed.success ? parsed.data : 'leads'
    if (id === 'pipeline') return <PipelinePage />
    if (id === 'opportunities') return <OpportunitiesPage />
    return <LeadsPage />
  },
})
