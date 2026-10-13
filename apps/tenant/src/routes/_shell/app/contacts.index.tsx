import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { ContactsPage } from '../../../features/contacts/ContactsPage'

export const Route = createFileRoute('/_shell/app/contacts/')({
  validateSearch: z.object({ create: z.boolean().optional() }),
  component: function Contacts() {
    const { create } = Route.useSearch()
    return <ContactsPage create={create} />
  },
})
