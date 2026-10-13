import { createFileRoute } from '@tanstack/react-router'
import { ReportIdSchema } from '@deskhand/schemas'
import { ReportsPage } from '../../../features/insight/ReportsPage'

export const Route = createFileRoute('/_shell/app/reports/$reportId')({
  component: function ReportRoute() {
    const { reportId } = Route.useParams()
    const parsed = ReportIdSchema.safeParse(reportId)
    return <ReportsPage reportId={parsed.success ? parsed.data : 'overview'} />
  },
})
