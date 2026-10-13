import { Outlet, createFileRoute, useParams } from '@tanstack/react-router'
import { InboxPage } from '../../../features/inbox/InboxPage'

function InboxLayout() {
  const { conversationId } = useParams({ strict: false }) as { conversationId?: string }
  return (
    <>
      <InboxPage conversationId={conversationId} />
      <Outlet />
    </>
  )
}

export const Route = createFileRoute('/_shell/app/inbox')({ component: InboxLayout })
