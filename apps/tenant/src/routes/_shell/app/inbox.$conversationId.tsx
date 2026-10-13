import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/app/inbox/$conversationId')({
  component: function InboxThread() {
    return null
  },
})
