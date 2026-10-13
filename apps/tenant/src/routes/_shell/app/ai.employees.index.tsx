import { createFileRoute } from '@tanstack/react-router'
import { EmployeeListPage } from '../../../features/ai/EmployeeListPage'

export const Route = createFileRoute('/_shell/app/ai/employees/')({ component: EmployeeListPage })
