import { createFileRoute } from '@tanstack/react-router'
import { FormBuilderPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/forms/$formId/')({
  component: function FormBuilderRoute() {
    const { formId } = Route.useParams()
    return <FormBuilderPage formId={formId} />
  },
})
