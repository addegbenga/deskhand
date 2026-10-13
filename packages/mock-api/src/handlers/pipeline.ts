import { http } from 'msw'
import {
  CreateTaskSchema,
  LeadListSchema,
  LeadSchema,
  MoveOpportunitySchema,
  PipelineBoardSchema,
  PipelineStageSchema,
  QualifyLeadSchema,
  TaskPageSchema,
  TaskSchema,
  type CreateTask,
  type Lead,
  type Opportunity,
  type Session,
  type Task,
} from '@deskhand/schemas'
import { now } from '../clock'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

function inScope(session: Session, locationId: string | null) {
  const allowed = new Set(session.locations.map((l) => l.id))
  return (id: string) => allowed.has(id) && (!locationId || id === locationId)
}

function staffOwns(session: Session, assignedUserId: string | null) {
  if (session.membership.role !== 'staff') return true
  return assignedUserId === session.user.id
}

function matchesQuery(q: string, parts: Array<string | null | undefined>) {
  if (!q) return true
  const haystack = parts.filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(q)
}

function earliestOpenTask(item: Opportunity, tasks: Task[]) {
  const related = tasks.filter((task) => {
    if (task.done) return false
    if (task.linkedKind === 'opportunity' && task.linkedId === item.id) return true
    return Boolean(task.contactId && task.contactId === item.contactId)
  })
  related.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  return related[0]?.title ?? item.nextTask
}

async function resolveTaskLink(input: CreateTask) {
  const database = await db()
  let linkedKind = input.linkedKind ?? (input.contactId ? ('contact' as const) : null)
  let linkedId = input.linkedId ?? input.contactId ?? null
  if (!linkedKind || !linkedId) {
    if (input.contactId) {
      const contact = await database.contacts.get(input.contactId)
      return {
        linkedKind: contact ? ('contact' as const) : null,
        linkedId: contact?.id ?? null,
        contactId: contact?.id ?? null,
        contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
        locationId: contact?.locationId ?? null,
      }
    }
    return { linkedKind: null, linkedId: null, contactId: null, contactName: null, locationId: null }
  }
  if (linkedKind === 'contact') {
    const contact = await database.contacts.get(linkedId)
    if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
    return {
      linkedKind,
      linkedId,
      contactId: contact.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      locationId: contact.locationId,
    }
  }
  if (linkedKind === 'conversation') {
    const conversation = await database.conversations.get(linkedId)
    if (!conversation) throw new MockHttpError('not_found', 'Conversation not found.')
    const contact = await database.contacts.get(conversation.contactId)
    return {
      linkedKind,
      linkedId,
      contactId: contact?.id ?? conversation.contactId,
      contactName: contact ? `${contact.firstName} ${contact.lastName}` : null,
      locationId: contact?.locationId ?? conversation.locationId,
    }
  }
  if (linkedKind === 'opportunity') {
    const opportunity = await database.opportunities.get(linkedId)
    if (!opportunity) throw new MockHttpError('not_found', 'Opportunity not found.')
    return {
      linkedKind,
      linkedId,
      contactId: opportunity.contactId,
      contactName: opportunity.contactName,
      locationId: opportunity.locationId,
    }
  }
  const appointment = await database.appointments.get(linkedId)
  if (!appointment) throw new MockHttpError('not_found', 'Booking not found.')
  return {
    linkedKind,
    linkedId,
    contactId: appointment.contactId,
    contactName: appointment.contactName,
    locationId: appointment.locationId,
  }
}

export const pipelineHandlers = [
  http.get(
    `${API}/pipeline`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'pipeline.edit', 'view')
      const url = new URL(request.url)
      const locationId = url.searchParams.get('locationId')
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const ok = inScope(session, locationId)
      const database = await db()
      const stages = (await database.pipelineStages.toArray()).sort((a, b) => a.order - b.order)
      const openTasks = (await database.tasks.toArray()).filter((task) => !task.done)
      let items = (await database.opportunities.toArray())
        .filter((item) => ok(item.locationId) && staffOwns(session, item.assignedUserId))
        .map((item) => ({ ...item, nextTask: earliestOpenTask(item, openTasks) }))
      if (q) {
        items = items.filter((item) =>
          matchesQuery(q, [item.contactName, item.source, item.assignedName, item.stageName, item.nextTask]),
        )
      }
      return json(PipelineBoardSchema, {
        stages,
        items,
        wonReasons: ['Booked', 'Paid in full', 'Referred a friend'],
        lostReasons: ['Price', 'Competitor', 'No response', 'Timing'],
      })
    }),
  ),

  http.get(
    `${API}/leads`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'pipeline.edit', 'view')
      const url = new URL(request.url)
      const locationId = url.searchParams.get('locationId')
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const ok = inScope(session, locationId)
      let items = (await (await db()).leads.toArray()).filter((item) => ok(item.locationId) && staffOwns(session, item.assignedUserId))
      if (q) {
        items = items.filter((item) => matchesQuery(q, [item.contactName, item.source, item.assignedName, item.status]))
      }
      items.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))
      return json(LeadListSchema, items)
    }),
  ),

  http.post(
    `${API}/leads/:id/qualify`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'pipeline.edit')
      const input = await parseBody(request, QualifyLeadSchema)
      const database = await db()
      const lead = await database.leads.get(String(params.id))
      if (!lead || !staffOwns(session, lead.assignedUserId)) throw new MockHttpError('not_found', 'Lead not found.')
      if (lead.opportunityId) throw new MockHttpError('conflict', 'This lead already has a deal.')
      const stages = (await database.pipelineStages.toArray()).sort((a, b) => a.order - b.order)
      const stage = stages.find((item) => !item.won && !item.lost && item.name === 'Qualified') ?? stages.find((item) => !item.won && !item.lost)
      if (!stage) throw new MockHttpError('not_found', 'No pipeline stage.')
      const opportunity: Opportunity = {
        id: `opp_${crypto.randomUUID().slice(0, 8)}`,
        accountId: lead.accountId,
        locationId: lead.locationId,
        contactId: lead.contactId,
        leadId: lead.id,
        contactName: lead.contactName,
        stageId: stage.id,
        stageName: stage.name,
        value: input.value ?? null,
        probability: stage.probability,
        expectedCloseAt: new Date(now().getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        assignedUserId: lead.assignedUserId,
        assignedName: lead.assignedName,
        source: lead.source,
        enteredStageAt: now().toISOString(),
        lastActivityAt: now().toISOString(),
        nextTask: null,
        aiWorking: false,
        wonReason: null,
        lostReason: null,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
      }
      const nextLead: Lead = {
        ...lead,
        status: 'qualified',
        opportunityId: opportunity.id,
        aiSuggested: false,
        lastActivityAt: opportunity.lastActivityAt,
      }
      await write(['leads', 'pipeline', 'home'], async (d) => {
        await d.opportunities.put(opportunity)
        await d.leads.put(nextLead)
        await d.contacts.update(lead.contactId, { stage: stage.name })
      })
      return json(LeadSchema, nextLead, 201)
    }),
  ),

  http.post(
    `${API}/opportunities/:id/move`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'pipeline.edit')
      const input = await parseBody(request, MoveOpportunitySchema)
      const database = await db()
      const opportunity = await database.opportunities.get(String(params.id))
      if (!opportunity || !staffOwns(session, opportunity.assignedUserId)) throw new MockHttpError('not_found', 'Opportunity not found.')
      const stage = await database.pipelineStages.get(input.stageId)
      if (!stage) throw new MockHttpError('not_found', 'Stage not found.')
      if ((stage.won || stage.lost) && !input.reason) {
        throw new MockHttpError('validation_failed', 'A reason is required.', { fieldErrors: { reason: ['Required'] } })
      }
      await write(['pipeline', 'home'], async (d) => {
        const patch: Partial<Opportunity> = {
          stageId: stage.id,
          stageName: stage.name,
          enteredStageAt: now().toISOString(),
          lastActivityAt: now().toISOString(),
          wonReason: stage.won ? input.reason ?? null : null,
          lostReason: stage.lost ? input.reason ?? null : null,
        }
        await d.opportunities.update(opportunity.id, patch)
        await d.contacts.update(opportunity.contactId, { stage: stage.name })
      })
      return json(PipelineStageSchema, stage)
    }),
  ),

  http.get(
    `${API}/tasks`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      const url = new URL(request.url)
      const view = url.searchParams.get('view') ?? 'mine'
      const locationId = url.searchParams.get('locationId')
      const linkedKind = url.searchParams.get('linkedKind')
      const assignedUserId = url.searchParams.get('assignedUserId')
      const createdBy = url.searchParams.get('createdBy')
      const q = (url.searchParams.get('q') ?? '').toLowerCase()
      const ok = inScope(session, locationId)
      const t0 = now().getTime()
      const items = (await (await db()).tasks.toArray()).filter((task) => {
        if (!ok(task.locationId)) return false
        if (session.membership.role === 'staff' && task.assignedUserId !== session.user.id) return false
        if (linkedKind && task.linkedKind !== linkedKind) return false
        if (assignedUserId && task.assignedUserId !== assignedUserId) return false
        if (createdBy === 'ai' && task.createdBy.kind !== 'ai_employee') return false
        if (createdBy === 'person' && task.createdBy.kind !== 'person') return false
        if (q && !matchesQuery(q, [task.title, task.notes, task.contactName, task.linkedKind])) return false
        if (view === 'mine') return task.assignedUserId === session.user.id && !task.done
        if (view === 'team') return !task.done
        if (view === 'today') {
          const due = new Date(task.dueAt)
          return !task.done && due.toDateString() === now().toDateString()
        }
        if (view === 'overdue') return !task.done && new Date(task.dueAt).getTime() < t0
        if (view === 'done') return task.done
        return true
      })
      items.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
      return json(TaskPageSchema, { items, nextCursor: null, total: items.length })
    }),
  ),

  http.get(
    `${API}/tasks/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit', 'view')
      const task = await (await db()).tasks.get(String(params.id))
      if (!task || !inScope(session, null)(task.locationId)) throw new MockHttpError('not_found', 'Task not found.')
      if (session.membership.role === 'staff' && task.assignedUserId !== session.user.id) {
        throw new MockHttpError('forbidden', 'Your role cannot do this.')
      }
      return json(TaskSchema, task)
    }),
  ),

  http.post(
    `${API}/tasks`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const input = await parseBody(request, CreateTaskSchema)
      const linked = await resolveTaskLink(input)
      const requested = input.locationId && session.locations.some((item) => item.id === input.locationId) ? input.locationId : null
      const locationId = requested ?? linked.locationId ?? session.locations[0]?.id
      if (!locationId) throw new MockHttpError('validation_failed', 'No location.')
      const task: Task = {
        id: `tsk_${crypto.randomUUID()}`,
        accountId: session.account.id,
        locationId,
        assignedUserId: input.assignedUserId ?? session.user.id,
        title: input.title,
        notes: input.notes ?? '',
        dueAt: input.dueAt,
        contactName: linked.contactName,
        contactId: linked.contactId,
        done: false,
        priority: input.priority ?? 'normal',
        linkedKind: linked.linkedKind,
        linkedId: linked.linkedId,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
      }
      await write(['tasks', 'home', 'pipeline', 'contacts'], (d) => d.tasks.put(task))
      return json(TaskSchema, task, 201)
    }),
  ),

  http.patch(
    `${API}/tasks/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'calendar.edit')
      const patch = await parseBody(
        request,
        TaskSchema.pick({ done: true, assignedUserId: true, dueAt: true, title: true, notes: true, priority: true }).partial(),
      )
      const task = await (await db()).tasks.get(String(params.id))
      if (!task) throw new MockHttpError('not_found', 'Task not found.')
      if (session.membership.role === 'staff' && task.assignedUserId !== session.user.id) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      await write(['tasks', 'home', 'pipeline', 'contacts'], (d) => d.tasks.update(task.id, patch))
      const updated = await (await db()).tasks.get(task.id)
      return json(TaskSchema, updated!)
    }),
  ),
]
