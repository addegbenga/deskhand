import type { Meta, StoryObj } from '@storybook/react-vite'
import { AISurface, ChannelIcon, ConfidenceMeter, MessageBubble, StatCard } from '../index'
import type { Message } from '@deskhand/schemas'

const meta = { title: 'Messaging/Inbox' } satisfies Meta
export default meta
type Story = StoryObj

const base: Message = {
  id: '1',
  accountId: 'a',
  conversationId: 'c',
  kind: 'outbound',
  authorKind: 'ai_employee',
  authorName: 'Ada',
  channel: 'whatsapp',
  body: 'Medium knotless braids are ₦35,000 and take about 5 hours.',
  deliveryStatus: 'read',
  attachment: null,
  why: { sources: ['Price list'], rules: ['Ground prices'], tools: ['lookup_service'] },
  scheduledFor: null,
  rating: null,
  language: 'en',
  createdAt: new Date().toISOString(),
  createdBy: { kind: 'ai_employee', name: 'Ada' },
  transcript: null,
  summary: null,
}

export const AiBubble: Story = {
  render: () => <MessageBubble message={base} time="2 min ago" />,
}

export const Note: Story = {
  render: () => <MessageBubble message={{ ...base, kind: 'note', authorKind: 'person', authorName: 'Funke', why: null, deliveryStatus: null }} time="now" />,
}

export const ChannelIcons: Story = {
  render: () => (
    <div className="flex gap-3">
      <ChannelIcon channel="whatsapp" />
      <ChannelIcon channel="email" />
      <ChannelIcon channel="webchat" />
    </div>
  ),
}

export const Metric: Story = {
  render: () => (
    <div className="max-w-xs">
      <StatCard label="Leads" value="42" change="Up from 34" sparkline={[12, 14, 11, 16, 18, 17, 20, 22]} />
    </div>
  ),
}

export const DraftSurface: Story = {
  render: () => (
    <AISurface className="max-w-md">
      <ConfidenceMeter level="high" />
      <p className="mt-2 text-sm">I can book Saturday at 10am or 1pm.</p>
    </AISurface>
  ),
}
