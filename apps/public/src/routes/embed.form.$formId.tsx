import { createFileRoute } from '@tanstack/react-router'
import { PublicForm } from '../features/PublicForm'

export const Route = createFileRoute('/embed/form/$formId')({
  component: function FormEmbed() {
    return <PublicForm formId={Route.useParams().formId} framed />
  },
})
