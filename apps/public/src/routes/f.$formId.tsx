import { createFileRoute } from '@tanstack/react-router'
import { PublicForm } from '../features/PublicForm'

export const Route = createFileRoute('/f/$formId')({
  component: function HostedForm() {
    return <PublicForm formId={Route.useParams().formId} />
  },
})
