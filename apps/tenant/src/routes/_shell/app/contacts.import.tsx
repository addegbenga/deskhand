import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '../../../features/contacts/ImportPage'

export const Route = createFileRoute('/_shell/app/contacts/import')({ component: ImportPage })
