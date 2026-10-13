import type { Meta, StoryObj } from '@storybook/react-vite'
import { FunnelView, MetricHint, PageCanvas } from '../components/insight'
import { StatCard } from '../components/messaging'

const meta = { title: 'Insight/Surfaces' } satisfies Meta
export default meta
type Story = StoryObj

export const Metric: Story = {
  render: () => (
    <StatCard
      label="Leads"
      hint={<MetricHint label="Leads" definition="New contacts created in the selected range." />}
      value="128"
      sparkline={[4, 6, 5, 9, 8, 12]}
    />
  ),
}

export const Funnel: Story = {
  render: () => (
    <FunnelView
      steps={[
        { id: '1', kind: 'landing', label: 'Landing', visits: 640, completed: 640 },
        { id: '2', kind: 'form', label: 'Form', visits: 210, completed: 160 },
        { id: '3', kind: 'booking', label: 'Booking', visits: 96, completed: 58 },
      ]}
      dropOffLabel={(from, to, rate) => `${rate}% drop from ${from} to ${to}`}
    />
  ),
}

export const Blocks: Story = {
  render: () => (
    <PageCanvas
      className="max-w-md"
      blocks={[{ id: 'hero', type: 'hero', heading: 'Bridal braids', body: 'Two chairs left Saturday.', cta: 'Book' }]}
    />
  ),
}
