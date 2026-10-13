import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CONTACT_TABS, ContactDetailPage } from '../../../features/contacts/ContactDetailPage'

const SearchSchema = z.object({
  tab: z.enum(CONTACT_TABS).optional(),
})

export const Route = createFileRoute('/_shell/app/contacts/$contactId')({
  validateSearch: (raw: Record<string, unknown>) => SearchSchema.parse({ tab: raw.tab }),
  component: function ContactDetail() {
    const { contactId } = Route.useParams()
    const { tab } = Route.useSearch()
    return <ContactDetailPage contactId={contactId} tab={tab ?? 'overview'} />
  },
})
