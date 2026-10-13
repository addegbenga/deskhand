import { createFileRoute } from '@tanstack/react-router'
import { DuplicatesPage } from '../../../features/contacts/DuplicatesPage'

export const Route = createFileRoute('/_shell/app/contacts/duplicates')({ component: DuplicatesPage })
