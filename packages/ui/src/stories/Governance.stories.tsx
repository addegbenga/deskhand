import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../components/button'
import { ChecklistRow, SlaTimer } from '../components/governance'

const meta = { title: 'Governance/Surfaces' } satisfies Meta
export default meta
type Story = StoryObj

export const Checklist: Story = {
  render: () => (
    <ul className="max-w-lg">
      <ChecklistRow status="done" statusLabel="Done" title="AI disclosure" reason="Verified on WhatsApp." />
      <ChecklistRow
        status="blocking"
        statusLabel="Blocking"
        title="AI disclosure"
        reason="The test conversation did not include the disclosure."
        action={<Button size="sm">Fix</Button>}
      />
      <ChecklistRow status="attention" statusLabel="Needs attention" title="Request due soon" reason="Due in 20 hours." escalate escalateLabel="Escalated" />
    </ul>
  ),
}

export const Timers: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <SlaTimer remainingHours={20} overdue={false} escalate labels={{ overdue: 'Overdue', left: '20 hours left', escalate: 'Escalated' }} />
      <SlaTimer remainingHours={-10} overdue escalate={false} labels={{ overdue: 'Overdue', left: '10 hours left', escalate: 'Escalated' }} />
    </div>
  ),
}
