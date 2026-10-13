import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppointmentChip, CalendarStaffGrid, KanbanBoard, KanbanCard, KanbanColumn } from '../index'

const meta = { title: 'Booking/Surfaces' } satisfies Meta
export default meta
type Story = StoryObj

export const Kanban: Story = {
  render: () => (
    <KanbanBoard>
      <KanbanColumn title="New" meta="2">
        <KanbanCard>Ireti Ademayowa</KanbanCard>
        <KanbanCard>Tola Bello</KanbanCard>
      </KanbanColumn>
      <KanbanColumn title="Booked" meta="1" hint="Oldest card is 8 days in this stage">
        <KanbanCard>Chizoba Okunola</KanbanCard>
      </KanbanColumn>
    </KanbanBoard>
  ),
}

export const DayGrid: Story = {
  render: () => (
    <CalendarStaffGrid
      staff={[
        { id: '1', name: 'Tola' },
        { id: '2', name: 'Funke' },
      ]}
      hourLabel={(hour) => `${hour}:00`}
      cells={(id, hour) =>
        id === '1' && hour === 10 ? <AppointmentChip>Knotless · Ireti</AppointmentChip> : null
      }
    />
  ),
}
