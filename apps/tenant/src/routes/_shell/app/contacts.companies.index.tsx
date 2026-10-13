import { createFileRoute } from '@tanstack/react-router'
import { CompaniesPage } from '../../../features/contacts/CompaniesPage'

export const Route = createFileRoute('/_shell/app/contacts/companies/')({ component: CompaniesPage })
