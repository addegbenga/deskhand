import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  BulkConversationActionSchema,
  ConversationPageSchema,
  ConversationPatchSchema,
  ConversationSchema,
  ConversationThreadSchema,
  MessageSchema,
  SavedReplyListSchema,
  SendMessageSchema,
  TeamMemberListSchema,
  TemplateListSchema,
  TranslatePreviewSchema,
  type Conversation,
  type ConversationListItem,
  type InboxView,
  type Message,
  type Session,
} from '@deskhand/schemas'
import { DAY, HOUR, MINUTE, now } from '../clock'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { applyTemplate, mockTranslate, sendBlock, windowState } from '../inbox-rules'
import { db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

function locationOk(session: Session, locationId: string | null) {
  const allowed = new Set(session.locations.map((l) => l.id))
  return (id: string) => allowed.has(id) && (!locationId || id === locationId)
}

function staffFilter(session: Session, assignedUserId: string | null) {
  if (session.membership.role !== 'staff') return true
  return assignedUserId === session.user.id
}

function matchesView(view: InboxView, conversation: Conversation, userId: string) {
  switch (view) {
    case 'all':
      return conversation.status !== 'closed' && conversation.status !== 'snoozed'
    case 'mine':
      return conversation.assignedUserId === userId && conversation.status !== 'closed'
    case 'unassigned':
      return conversation.assignedUserId == null && conversation.status !== 'closed'
    case 'needs_human':
      return conversation.status === 'needs_human'
    case 'ai_handled':
      return conversation.status === 'ai_handled'
    case 'waiting':
      return conversation.lastDirection === 'outbound' && conversation.status !== 'closed' && conversation.status !== 'snoozed'
    case 'snoozed':
      return conversation.status === 'snoozed'
    case 'closed':
      return conversation.status === 'closed'
  }
}

async function toListItem(conversation: Conversation, waitFrom: number, names: Map<string, string>): Promise<ConversationListItem> {
  const database = await db()
  const contact = await database.contacts.get(conversation.contactId)
  return {
    ...conversation,
    contactName: contact ? `${contact.firstName} ${contact.lastName}` : '',
    assignedName: conversation.assignedUserId ? (names.get(conversation.assignedUserId) ?? '') : '',
    waitMinutes: conversation.lastDirection === 'inbound' ? Math.max(0, Math.round((waitFrom - new Date(conversation.lastInboundAt).getTime()) / MINUTE)) : 0,
    windowOpen: windowState(conversation).open,
  }
}

export const inboxHandlers = [
  http.get(
    `${API}/conversations`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'conversations.view', 'view')
      const url = new URL(request.url)
      const view = (url.searchParams.get('view') as InboxView | null) ?? 'all'
      const channel = url.searchParams.get('channel')
      const assignedUserId = url.searchParams.get('assignedUserId')
      const tag = url.searchParams.get('tag')
      const stage = url.searchParams.get('stage')
      const language = url.searchParams.get('language')
      const since = url.searchParams.get('since')
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const locationId = url.searchParams.get('locationId')
      const cursor = Number(url.searchParams.get('cursor') ?? '0')
      const limit = Math.min(50, Number(url.searchParams.get('limit') ?? '30') || 30)
      const scoped = locationOk(session, locationId)
      const database = await db()
      const contacts = await database.contacts.toArray()
      const users = await database.users.toArray()
      const names = new Map(users.map((user) => [user.id, user.name]))
      const byId = new Map(contacts.map((c) => [c.id, c]))
      const t0 = now().getTime()
      const startOfDay = new Date(now())
      startOfDay.setHours(0, 0, 0, 0)
      const sinceMs = since === 'today' ? startOfDay.getTime() : since === '7d' ? t0 - 7 * DAY : since === '30d' ? t0 - 30 * DAY : 0
      const all = (await database.conversations.toArray()).filter((c) => scoped(c.locationId) && staffFilter(session, c.assignedUserId))
      const tags = [...new Set(all.flatMap((c) => [...c.tags, ...(byId.get(c.contactId)?.tags ?? [])]))].sort()
      const stages = [...new Set(all.map((c) => byId.get(c.contactId)?.stage).filter(Boolean) as string[])].sort()
      const languages = [...new Set(all.map((c) => c.language).filter(Boolean))].sort()
      let items = all
        .filter((c) => matchesView(view, c, session.user.id))
        .filter((c) => !channel || c.channel === channel)
        .filter((c) => !assignedUserId || c.assignedUserId === assignedUserId)
        .filter((c) => {
          if (!tag) return true
          const contact = byId.get(c.contactId)
          return c.tags.includes(tag) || Boolean(contact?.tags.includes(tag))
        })
        .filter((c) => !stage || byId.get(c.contactId)?.stage === stage)
        .filter((c) => !language || c.language === language)
        .filter((c) => !sinceMs || new Date(c.lastMessageAt).getTime() >= sinceMs)
        .filter((c) => {
          if (!q) return true
          const contact = byId.get(c.contactId)
          const name = contact ? `${contact.firstName} ${contact.lastName}`.toLowerCase() : ''
          return name.includes(q) || c.lastMessagePreview.toLowerCase().includes(q)
        })
        .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      const total = items.length
      items = items.slice(cursor, cursor + limit)
      const listed = await Promise.all(items.map((c) => toListItem(c, t0, names)))
      return json(ConversationPageSchema, {
        items: listed,
        nextCursor: cursor + limit < total ? String(cursor + limit) : null,
        total,
        tags,
        stages,
        languages,
      })
    }),
  ),

  http.get(
    `${API}/conversations/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'conversations.view', 'view')
      const database = await db()
      const conversation = await database.conversations.get(String(params.id))
      if (!conversation) throw new MockHttpError('not_found', 'Conversation not found.')
      if (!staffFilter(session, conversation.assignedUserId)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const contact = await database.contacts.get(conversation.contactId)
      if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
      const messages = await database.messages.where('conversationId').equals(conversation.id).sortBy('createdAt')
      const connections = await database.connections.toArray()
      const block = sendBlock(session, contact, conversation, connections, undefined, false)
      const appointments = (await database.appointments.toArray()).filter(
        (a) => a.contactId === contact.id && a.status === 'booked' && new Date(a.startsAt).getTime() > now().getTime(),
      )
      const payments = (await database.payments.toArray())
        .filter((p) => p.contactId === contact.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      if (conversation.unreadCount > 0) {
        await write(['conversations', 'nav-summary'], (d) => d.conversations.update(conversation.id, { unreadCount: 0 }))
      }
      return json(ConversationThreadSchema, {
        conversation: { ...conversation, unreadCount: 0 },
        contact,
        messages,
        window: windowState(conversation),
        sendBlock: block ? { reason: block } : null,
        othersViewing: conversation.lockedByName ? [conversation.lockedByName] : [],
        nextAction: conversation.draft ? 'Review the suggested reply' : conversation.status === 'needs_human' ? 'Reply or assign' : null,
        summary: messages.find((m) => m.summary)?.summary ?? null,
        upcomingBookings: appointments.slice(0, 3).map((a) => ({
          id: a.id,
          startsAt: a.startsAt,
          service: a.service,
          staffName: a.staffName,
        })),
        recentPayments: payments.slice(0, 5).map((p) => ({
          id: p.id,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          at: p.paidAt ?? p.createdAt,
        })),
      })
    }),
  ),

  http.patch(
    `${API}/conversations/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const patch = await parseBody(request, ConversationPatchSchema)
      await write(['conversations', 'nav-summary', 'home'], async (database) => {
        const conversation = await database.conversations.get(String(params.id))
        if (!conversation) throw new MockHttpError('not_found', 'Conversation not found.')
        await database.conversations.update(conversation.id, patch)
      })
      const updated = await (await db()).conversations.get(String(params.id))
      return json(ConversationSchema, updated!)
    }),
  ),

  http.post(
    `${API}/conversations/:id/messages`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const input = await parseBody(request, SendMessageSchema)
      const isNote = Boolean(input.note)
      const database = await db()
      const conversation = await database.conversations.get(String(params.id))
      if (!conversation) throw new MockHttpError('not_found', 'Conversation not found.')
      const contact = await database.contacts.get(conversation.contactId)
      if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
      const template = input.templateId ? await database.templates.get(input.templateId) : undefined
      const saved = input.savedReplyId ? await database.savedReplies.get(input.savedReplyId) : undefined
      const connections = await database.connections.toArray()
      const block = sendBlock(session, contact, conversation, connections, template, isNote)
      if (block) {
        throw new MockHttpError('validation_failed', 'This message cannot be sent.', { fieldErrors: { send: [block] } })
      }
      let body = input.body?.trim() ?? ''
      if (saved) body = saved.body
      if (template) body = applyTemplate(template.body, contact)
      if (!body) throw new MockHttpError('validation_failed', 'Write a message.', { fieldErrors: { body: ['required'] } })
      if (input.translateTo) body = mockTranslate(body, input.translateTo)

      const message: Message = {
        id: `msg_${crypto.randomUUID()}`,
        accountId: session.account.id,
        conversationId: conversation.id,
        kind: isNote ? 'note' : input.scheduledFor ? 'outbound' : 'outbound',
        authorKind: 'person',
        authorName: session.user.name,
        channel: conversation.channel,
        body,
        deliveryStatus: isNote ? null : 'sent',
        attachment: input.attachmentName ? { name: input.attachmentName, type: 'file' } : null,
        why: null,
        scheduledFor: input.scheduledFor ?? null,
        rating: null,
        language: conversation.language,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
        transcript: null,
        summary: null,
      }

      await write(['conversations', 'messages', 'nav-summary', 'home'], async (d) => {
        await d.messages.add(message)
        if (!isNote) {
          await d.conversations.update(conversation.id, {
            lastMessageAt: message.createdAt,
            lastMessagePreview: body,
            lastDirection: 'outbound',
            unreadCount: 0,
            status: conversation.status === 'closed' ? 'open' : conversation.status === 'ai_handled' ? 'open' : conversation.status,
            draft: null,
            lockedByName: null,
          })
        }
      })
      return json(MessageSchema, message, 201)
    }),
  ),

  http.post(
    `${API}/conversations/:id/draft/accept`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const input = await parseBody(request, SendMessageSchema)
      const database = await db()
      const conversation = await database.conversations.get(String(params.id))
      if (!conversation?.draft) throw new MockHttpError('not_found', 'No suggested reply.')
      const body = input.body?.trim() || conversation.draft.body
      const message: Message = {
        id: `msg_${crypto.randomUUID()}`,
        accountId: session.account.id,
        conversationId: conversation.id,
        kind: 'outbound',
        authorKind: 'person',
        authorName: session.user.name,
        channel: conversation.channel,
        body,
        deliveryStatus: 'sent',
        attachment: null,
        why: conversation.draft.why,
        scheduledFor: null,
        rating: null,
        language: conversation.language,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
        transcript: null,
        summary: null,
      }
      await write(['conversations', 'messages', 'nav-summary'], async (d) => {
        await d.messages.add(message)
        await d.conversations.update(conversation.id, {
          lastMessageAt: message.createdAt,
          lastMessagePreview: body,
          lastDirection: 'outbound',
          draft: null,
          status: 'open',
        })
      })
      return json(MessageSchema, message, 201)
    }),
  ),

  http.post(
    `${API}/conversations/:id/draft/discard`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      await write(['conversations'], (d) => d.conversations.update(String(params.id), { draft: null }))
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/messages/:id/rate`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const rating = ((await request.json()) as { rating: 'good' | 'bad' }).rating
      await write(['messages'], (d) => d.messages.update(String(params.id), { rating }))
      const message = await (await db()).messages.get(String(params.id))
      if (!message) throw new MockHttpError('not_found', 'Message not found.')
      return json(MessageSchema, message)
    }),
  ),

  http.post(
    `${API}/conversations/bulk`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const input = await parseBody(request, BulkConversationActionSchema)
      await write(['conversations', 'nav-summary'], async (database) => {
        for (const id of input.ids) {
          if (input.action === 'assign_me') await database.conversations.update(id, { assignedUserId: session.user.id })
          if (input.action === 'close') await database.conversations.update(id, { status: 'closed' })
          if (input.action === 'reopen') await database.conversations.update(id, { status: 'open' })
          if (input.action === 'snooze') await database.conversations.update(id, { status: 'snoozed', snoozedUntil: input.snoozedUntil ?? new Date(now().getTime() + 4 * HOUR).toISOString() })
          if (input.action === 'mark_read') await database.conversations.update(id, { unreadCount: 0 })
        }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/templates`,
    route(async () => {
      await loadSession()
      const items = await (await db()).templates.toArray()
      return json(TemplateListSchema, items)
    }),
  ),

  http.get(
    `${API}/saved-replies`,
    route(async () => {
      await loadSession()
      const items = await (await db()).savedReplies.toArray()
      return json(SavedReplyListSchema, items)
    }),
  ),

  http.get(
    `${API}/team/options`,
    route(async () => {
      const session = await loadSession()
      const database = await db()
      const memberships = await database.memberships.toArray()
      const users = await database.users.toArray()
      const items = memberships.map((m) => ({
        id: m.userId,
        name: users.find((u) => u.id === m.userId)?.name ?? m.userId,
        role: m.role,
      }))
      void session
      return json(TeamMemberListSchema, items)
    }),
  ),

  http.post(
    `${API}/translate`,
    route(async ({ request }) => {
      await loadSession()
      const body = (await request.json()) as { text: string; to: string; from?: string }
      return json(TranslatePreviewSchema, {
        from: body.from ?? 'en',
        to: body.to,
        original: body.text,
        translated: mockTranslate(body.text, body.to),
      })
    }),
  ),

  http.post(
    `${API}/inbox/test-message`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'messages.send')
      const { simulateInbound } = await import('../simulators')
      const result = await simulateInbound('price')
      if (!result) throw new MockHttpError('not_found', 'No conversation to write to.')
      return json(z.object({ conversationId: z.string() }), { conversationId: result.conversationId })
    }),
  ),
]
