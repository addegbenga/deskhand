import type { Meta, StoryObj } from '@storybook/react-vite'
import { ConnectionTile, InviteResults, UpgradePrompt, UsageBar } from '../components/settings'
import { Button } from '../components/button'

const meta = { title: 'Settings/Surfaces' } satisfies Meta
export default meta
type Story = StoryObj

export const Meter: Story = {
  render: () => <UsageBar label="AI conversations" meter={{ unit: 'aiConversations', used: 2000, included: 2000, percent: 100, alert: 'cap' }} />,
}

export const Upgrade: Story = {
  render: () => <UpgradePrompt title="You have reached a plan limit." action={<Button size="sm">Upgrade</Button>} />,
}

export const Invites: Story = {
  render: () => (
    <InviteResults
      results={[
        { email: 'a@salon.ng', result: 'sent' },
        { email: 'x@mailinator.com', result: 'blocked' },
      ]}
      label={(result) => result}
    />
  ),
}

export const Connection: Story = {
  render: () => (
    <ConnectionTile
      title="Email"
      status="Needs attention"
      model="We manage"
      problem="DNS records are not verified yet."
      card={{
        kind: 'email',
        group: 'messaging',
        ownerModel: 'we_manage',
        status: 'needs_attention',
        health: 'degraded',
        problem: 'dns_unverified',
        connectedBy: 'Amaka',
        scopes: ['send'],
        lastSyncAt: null,
        id: '1',
      }}
    />
  ),
}
