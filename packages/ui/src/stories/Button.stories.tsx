import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { Button, IconButton } from '../components/button'

const meta = {
  title: 'Foundation/Button',
  component: Button,
  args: { children: 'Save changes', variant: 'primary', size: 'md' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'danger-outline', 'ai', 'link'] },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button>
        <Plus />
        New booking
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="ai">
        <Sparkles />
        Draft with AI
      </Button>
      <Button variant="danger">
        <Trash2 />
        Delete 3 contacts
      </Button>
      <Button variant="danger-outline">Remove</Button>
      <Button variant="link">Learn more</Button>
      <Button disabled>Disabled</Button>
      <IconButton label="Add" variant="outline">
        <Plus />
      </IconButton>
    </div>
  ),
}
