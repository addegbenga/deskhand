import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { CampaignsPage } from '../../../features/grow/MarketingPages'

export const Route = createFileRoute('/_shell/app/marketing/campaigns')({
  validateSearch: z.object({ listId: z.string().optional() }),
  component: function Campaigns() {
    const { listId } = Route.useSearch()
    return <CampaignsPage presetListId={listId} />
  },
})
