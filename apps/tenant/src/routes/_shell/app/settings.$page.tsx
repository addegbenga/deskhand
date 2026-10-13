import { createFileRoute } from '@tanstack/react-router'
import { SettingsPageIdSchema } from '@deskhand/schemas'
import { SettingsPage } from '../../../features/settings/SettingsPage'

export const Route = createFileRoute('/_shell/app/settings/$page')({
  component: function SettingsRoute() {
    const { page } = Route.useParams()
    const parsed = SettingsPageIdSchema.safeParse(page)
    return <SettingsPage page={parsed.success ? parsed.data : 'business'} />
  },
})
