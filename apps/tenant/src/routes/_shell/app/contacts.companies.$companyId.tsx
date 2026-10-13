import { createFileRoute } from '@tanstack/react-router'
import { CompanyDetailPage } from '../../../features/contacts/CompanyDetailPage'

export const Route = createFileRoute('/_shell/app/contacts/companies/$companyId')({
  component: function CompanyDetail() {
    const { companyId } = Route.useParams()
    return <CompanyDetailPage companyId={companyId} />
  },
})
