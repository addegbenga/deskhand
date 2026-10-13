import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { TasksPage } from '../../../features/tasks/TasksPage'

export const Route = createFileRoute('/_shell/app/tasks')({
  validateSearch: z.object({ create: z.boolean().optional(), task: z.string().optional() }),
  component: function Tasks() {
    const { create, task } = Route.useSearch()
    return <TasksPage create={create} taskId={task} />
  },
})
