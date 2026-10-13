import { createFileRoute } from '@tanstack/react-router'
import { CompliancePageIdSchema } from '@deskhand/schemas'
import { CompliancePage } from '../../../features/compliance/CompliancePage'

export const Route = createFileRoute('/_shell/app/compliance/$page')({
  validateSearch: (search: Record<string, unknown>): { market?: string } => {
    if (typeof search.market === 'string') return { market: search.market }
    return {}
  },
  component: function ComplianceRoute() {
    const { page } = Route.useParams()
    const { market } = Route.useSearch()
    const parsed = CompliancePageIdSchema.safeParse(page)
    return <CompliancePage page={parsed.success ? parsed.data : 'overview'} marketPreview={market} />
  },
})
