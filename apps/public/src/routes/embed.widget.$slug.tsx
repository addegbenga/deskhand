import { createFileRoute } from '@tanstack/react-router'
import { ChatWidget } from '../features/ChatWidget'

export const Route = createFileRoute('/embed/widget/$slug')({
  component: function WidgetEmbed() {
    return (
      <div className="min-h-dvh bg-transparent">
        <ChatWidget slug={Route.useParams().slug} />
      </div>
    )
  },
})
