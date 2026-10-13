import { createFileRoute } from '@tanstack/react-router'
import { PageEditorPage } from '../../../features/insight/PagesPages'

export const Route = createFileRoute('/_shell/app/pages/$pageId')({
  component: function PageEditorRoute() {
    const { pageId } = Route.useParams()
    return <PageEditorPage pageId={pageId} />
  },
})
