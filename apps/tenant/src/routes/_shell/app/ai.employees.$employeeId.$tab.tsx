import { createFileRoute } from '@tanstack/react-router'
import { EmployeeDetailPage } from '../../../features/ai/EmployeeDetailPage'

export const Route = createFileRoute('/_shell/app/ai/employees/$employeeId/$tab')({
  component: function EmployeeDetailRoute() {
    const { employeeId, tab } = Route.useParams()
    return <EmployeeDetailPage employeeId={employeeId} tab={tab} />
  },
})
