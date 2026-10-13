import { createFileRoute } from '@tanstack/react-router'
import { ComplianceLayout } from '../../../features/compliance/ComplianceLayout'

export const Route = createFileRoute('/_shell/app/compliance')({ component: ComplianceLayout })
