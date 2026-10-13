import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Recipe } from '@deskhand/schemas'
import { CampaignCheckPanel, QrPoster, RecipeCard, ReviewCard } from '../components/grow'

const recipe: Recipe = {
  id: '1',
  accountId: 'a',
  goal: 'respond',
  name: 'Instant lead response',
  description: 'Reply on the same channel within a minute.',
  expected: 'Faster first reply.',
  requiredConnections: ['whatsapp'],
  enabled: true,
  packKey: 'instant_lead',
  enrolled: 86,
  completed: 71,
  replied: 54,
  converted: 19,
  lastRunAt: null,
  error: null,
  delayHours: [0],
  channels: ['whatsapp'],
  stopOnReply: true,
  stopOnBook: true,
  stopOnConvert: true,
  stopOnOptOut: true,
  onlyIfNoReply: false,
  quietHours: true,
  employeeId: null,
  templateId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  createdBy: { kind: 'person' },
}

const meta = { title: 'Grow/Surfaces' } satisfies Meta
export default meta
type Story = StoryObj

export const RecipeSurface: Story = {
  render: () => (
    <RecipeCard
      recipe={recipe}
      labels={{
        on: 'On',
        off: 'Off',
        enrolled: 'Enrolled',
        completed: 'Finished',
        replied: 'Replied',
        converted: 'Converted',
        lastRun: 'Last run',
        never: 'Never',
        needsConnection: 'Needs',
      }}
    />
  ),
}

export const CampaignCheck: Story = {
  render: () => (
    <CampaignCheckPanel
      audience={150}
      sendable={120}
      excludedConsent={18}
      excludedOptOut={11}
      excludedQuietHours={1}
      templateOk
      templateStatus="approved"
      canSend
      labels={{
        audience: 'Audience',
        sendable: 'Can send',
        consent: 'No consent',
        optOut: 'Opted out',
        quiet: 'Quiet hours',
        template: 'Template',
        ready: 'Ready to send',
        blocked: 'Cannot send yet',
      }}
    />
  ),
}

export const Review: Story = {
  render: () => (
    <ReviewCard name="Chioma Eze" rating={2} body="The braids loosened after four days." topics={['quality']} draft="I'm sorry — come in this week for a retouch." />
  ),
}

export const Poster: Story = {
  render: () => <QrPoster href="http://localhost:5170/b/amaka-braids" title="Amaka Braids" subtitle="Scan to book" />,
}
