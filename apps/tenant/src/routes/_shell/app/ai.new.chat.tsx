import { createFileRoute } from '@tanstack/react-router'
import { EmployeeWizard } from '../../../features/ai/EmployeeWizard'

export const Route = createFileRoute('/_shell/app/ai/new/chat')({
  component: () => <EmployeeWizard kind="chat" />,
})
