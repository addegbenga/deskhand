import { createFileRoute } from '@tanstack/react-router'
import { FormResponsesPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/forms/$formId/responses')({
  component: function FormResponsesRoute() {
    const { formId } = Route.useParams()
    return <FormResponsesPage formId={formId} />
  },
})
