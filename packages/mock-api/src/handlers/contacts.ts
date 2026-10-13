import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import {
  AiMemoryItemSchema,
  ContactDetailSchema,
  ContactNoteSchema,
  ContactPageSchema,
  ContactSchema,
  ContactConsentWriteSchema,
  CompanyDetailSchema,
  CompanyListSchema,
  CompanySchema,
  CompanyWriteSchema,
  ContactWriteSchema,
  CustomFieldListSchema,
  DuplicateListSchema,
  ImportJobSchema,
  ImportPreviewSchema,
  ImportRunSchema,
  MergeContactsSchema,
  SmartListFiltersSchema,
  SmartListListSchema,
  SmartListSchema,
  SmartListWriteSchema,
  type Contact,
  type DuplicateGroup,
  type ImportPreviewRow,
  type Session,
  type SmartListFilters,
} from '@deskhand/schemas'
import { DAY, now } from '../clock'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

function locationOk(session: Session, locationId: string | null) {
  const allowed = new Set(session.locations.map((l) => l.id))
  return (id: string) => allowed.has(id) && (!locationId || id === locationId)
}

function staffOwns(session: Session, assignedUserId: string | null) {
  if (session.membership.role !== 'staff') return true
  return assignedUserId === session.user.id
}

function queryValue(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key)?.trim()
  if (!value || value === 'all') return undefined
  return value
}

function sinceCutoff(since?: string): number | null {
  const t = now().getTime()
  if (since === '7d') return t - 7 * DAY
  if (since === '30d') return t - 30 * DAY
  if (since === '90d') return t - 90 * DAY
  return null
}

export async function activityByContact() {
  const conversations = await (await db()).conversations.toArray()
  const activity = new Map<string, string>()
  for (const conversation of conversations) {
    const prev = activity.get(conversation.contactId)
    if (!prev || conversation.lastMessageAt > prev) activity.set(conversation.contactId, conversation.lastMessageAt)
  }
  return activity
}

export function applyContactFilters(items: Contact[], filters: SmartListFilters, activity: Map<string, string>) {
  const cutoff = sinceCutoff(filters.since)
  return items.filter((contact) => {
    if (filters.tag && !contact.tags.includes(filters.tag)) return false
    if (filters.source && contact.sourceLabel !== filters.source) return false
    if (filters.stage && contact.stage !== filters.stage) return false
    if (filters.companyId && contact.companyId !== filters.companyId) return false
    if (filters.fieldKey) {
      const value = String(contact.customFields[filters.fieldKey] ?? '')
      if (filters.fieldValue && value !== filters.fieldValue) return false
    }
    if (cutoff != null) {
      const at = activity.get(contact.id) ?? contact.createdAt
      if (new Date(at).getTime() < cutoff) return false
    }
    return true
  })
}

function parseCsv(csv: string): string[][] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')))
}

export const contactsHandlers = [
  http.get(
    `${API}/contacts`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const url = new URL(request.url)
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
      const locationId = url.searchParams.get('locationId')
      const cursor = Number(url.searchParams.get('cursor') ?? '0')
      const limit = Math.min(50, Number(url.searchParams.get('limit') ?? '30') || 30)
      const scoped = locationOk(session, locationId)
      const database = await db()
      const listId = queryValue(url, 'listId')
      const listed = listId ? await database.smartLists.get(listId) : undefined
      const fromQuery = SmartListFiltersSchema.parse({
        tag: queryValue(url, 'tag'),
        source: queryValue(url, 'source'),
        stage: queryValue(url, 'stage'),
        fieldKey: queryValue(url, 'fieldKey'),
        fieldValue: queryValue(url, 'fieldValue'),
        since: queryValue(url, 'since'),
        companyId: queryValue(url, 'companyId'),
      })
      const overlays = Object.fromEntries(Object.entries(fromQuery).filter(([, value]) => value != null && value !== ''))
      const filters: SmartListFilters = { ...(listed?.filters ?? {}), ...overlays }
      const activity = await activityByContact()
      let items = applyContactFilters(
        (await database.contacts.toArray()).filter((c) => scoped(c.locationId) && staffOwns(session, c.assignedUserId)),
        filters,
        activity,
      )
        .filter((c) => {
          if (!q) return true
          return `${c.firstName} ${c.lastName} ${c.phone ?? ''} ${c.email ?? ''} ${c.tags.join(' ')}`.toLowerCase().includes(q)
        })
        .sort((a, b) => a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName))
      const total = items.length
      items = items.slice(cursor, cursor + limit)
      return json(ContactPageSchema, { items, nextCursor: cursor + limit < total ? String(cursor + limit) : null, total })
    }),
  ),

  http.post(
    `${API}/contacts`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, ContactWriteSchema)
      const locationId = input.locationId ?? session.locations[0]?.id
      if (!locationId) throw new MockHttpError('validation_failed', 'Pick a location.')
      const contact: Contact = {
        id: `con_${crypto.randomUUID()}`,
        accountId: session.account.id,
        locationId,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? null,
        email: input.email ? input.email : null,
        tags: input.tags ?? [],
        language: input.language ?? 'en',
        assignedUserId: input.assignedUserId ?? session.user.id,
        stage: input.stage ?? 'New',
        value: input.value ?? null,
        sourceLabel: 'manual',
        customFields: input.customFields ?? {},
        consents: [],
        optedOut: false,
        companyId: input.companyId ?? null,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person', id: session.user.id, name: session.user.name },
      }
      await write(['contacts', 'home'], (d) => d.contacts.add(contact))
      return json(ContactSchema, contact, 201)
    }),
  ),

  http.get(
    `${API}/contacts/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const database = await db()
      const contact = await database.contacts.get(String(params.id))
      if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
      if (!staffOwns(session, contact.assignedUserId)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const conversations = (await database.conversations.toArray()).filter((c) => c.contactId === contact.id)
      const t0 = now().getTime()
      const listed = conversations.map((c) => ({
        ...c,
        contactName: `${contact.firstName} ${contact.lastName}`,
        waitMinutes: c.lastDirection === 'inbound' ? Math.max(0, Math.round((t0 - new Date(c.lastInboundAt).getTime()) / 60000)) : 0,
        windowOpen: c.channel !== 'whatsapp' || t0 - new Date(c.lastInboundAt).getTime() < 24 * 60 * 60 * 1000,
      }))
      const notes = await database.notes.where('contactId').equals(contact.id).reverse().sortBy('createdAt')
      const memories = await database.memories.where('contactId').equals(contact.id).toArray()
      const bookings = (await database.appointments.toArray())
        .filter((a) => a.contactId === contact.id)
        .map((a) => ({ id: a.id, startsAt: a.startsAt, service: a.service, staffName: a.staffName, status: a.status }))
      const payments = (await database.payments.toArray())
        .filter((p) => p.contactId === contact.id)
        .map((p) => ({ id: p.id, amount: p.amount, currency: p.currency, status: p.status, at: p.paidAt ?? p.createdAt }))
      const files = (await database.messages.toArray())
        .filter((message) => conversations.some((item) => item.id === message.conversationId) && message.attachment)
        .map((message) => ({ id: message.id, name: message.attachment!.name, at: message.createdAt }))
      const ledger = (await database.consentLedger.toArray())
        .filter((row) => row.contactId === contact.id)
        .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
        .map((row) => ({
          id: row.id,
          purpose: row.purpose,
          channel: row.channel,
          status: row.status,
          source: row.source,
          wordingVersion: row.wordingVersion,
          recordedAt: row.recordedAt,
          proof: row.proof,
        }))
      const tasks = (await database.tasks.toArray())
        .filter((task) => task.contactId === contact.id)
        .map((task) => ({
          id: task.id,
          title: task.title,
          dueAt: task.dueAt,
          done: task.done,
          priority: task.priority,
        }))
      const timeline = [
        ...listed.map((c) => ({
          id: `tl_${c.id}`,
          at: c.lastMessageAt,
          kind: 'message' as const,
          title: c.lastMessagePreview,
          body: null,
          createdBy: c.createdBy,
        })),
        ...notes.map((n) => ({
          id: n.id,
          at: n.createdAt,
          kind: 'note' as const,
          title: n.body,
          body: null,
          createdBy: n.createdBy,
        })),
        ...bookings.map((b) => ({
          id: `tl_${b.id}`,
          at: b.startsAt,
          kind: 'booking' as const,
          title: b.service,
          body: null,
          createdBy: contact.createdBy,
        })),
        ...payments.map((payment) => ({
          id: `tl_${payment.id}`,
          at: payment.at,
          kind: 'payment' as const,
          title: String(payment.amount),
          body: payment.status,
          createdBy: contact.createdBy,
        })),
        ...ledger.map((entry) => ({
          id: `tl_${entry.id}`,
          at: entry.recordedAt,
          kind: 'consent' as const,
          title: `${entry.channel} ${entry.status}`,
          body: entry.source,
          createdBy: contact.createdBy,
        })),
      ].sort((a, b) => b.at.localeCompare(a.at))
      return json(ContactDetailSchema, {
        contact,
        timeline,
        conversations: listed,
        notes,
        memories,
        bookings,
        payments,
        files,
        ledger,
        tasks,
      })
    }),
  ),

  http.post(
    `${API}/contacts/:id/consent`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, ContactConsentWriteSchema)
      let updated: Contact | undefined
      await write(['contacts', 'conversations'], async (database) => {
        const contact = await database.contacts.get(String(params.id))
        if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
        if (contact.optedOut) {
          throw new MockHttpError('validation_failed', 'This person opted out. They need to contact you again before you can record consent.', {
            fieldErrors: { consent: ['opted_out'] },
          })
        }
        const next = contact.consents.some((row) => row.channel === input.channel)
          ? contact.consents.map((row) =>
              row.channel === input.channel
                ? { ...row, status: 'granted' as const, source: 'inbox' as const, recordedAt: now().toISOString() }
                : row,
            )
          : [
              ...contact.consents,
              {
                channel: input.channel,
                status: 'granted' as const,
                source: 'inbox' as const,
                wordingVersion: 'inbox-staff',
                recordedAt: now().toISOString(),
              },
            ]
        await database.contacts.update(contact.id, { consents: next })
        await database.consentLedger.add({
          id: `cl_${crypto.randomUUID().slice(0, 8)}`,
          accountId: session.account.id,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          purpose: 'service',
          channel: input.channel,
          status: 'granted',
          source: 'inbox',
          wordingVersion: 'inbox-staff',
          recordedAt: now().toISOString(),
          proof: `staff_${session.user.id}`,
        })
      })
      updated = await (await db()).contacts.get(String(params.id))
      return json(ContactSchema, updated!)
    }),
  ),

  http.patch(
    `${API}/contacts/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, ContactWriteSchema.partial())
      await write(['contacts'], async (database) => {
        const contact = await database.contacts.get(String(params.id))
        if (!contact) throw new MockHttpError('not_found', 'Contact not found.')
        await database.contacts.update(contact.id, {
          ...input,
          email: input.email === '' ? null : input.email,
        })
      })
      const updated = await (await db()).contacts.get(String(params.id))
      return json(ContactSchema, updated!)
    }),
  ),

  http.post(
    `${API}/contacts/bulk-delete`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.export')
      const { ids, confirm } = (await request.json()) as { ids: string[]; confirm: string }
      if (confirm !== 'DELETE') throw new MockHttpError('validation_failed', 'Type DELETE to confirm.', { fieldErrors: { confirm: ['mismatch'] } })
      await write(['contacts', 'conversations', 'home'], async (database) => {
        await database.contacts.bulkDelete(ids)
        const conversations = await database.conversations.filter((c) => ids.includes(c.contactId)).toArray()
        await database.conversations.bulkDelete(conversations.map((c) => c.id))
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/contacts/bulk-tag`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const { ids, tag } = (await request.json()) as { ids: string[]; tag: string }
      await write(['contacts'], async (database) => {
        for (const id of ids) {
          const contact = await database.contacts.get(id)
          if (contact && !contact.tags.includes(tag)) await database.contacts.update(id, { tags: [...contact.tags, tag] })
        }
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(
    `${API}/contacts/bulk-company`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const { ids, companyId } = (await request.json()) as { ids: string[]; companyId: string | null }
      await write(['contacts', 'companies'], async (database) => {
        for (const id of ids) await database.contacts.update(id, { companyId })
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/exports/contacts`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.export')
      const locationId = new URL(request.url).searchParams.get('locationId')
      const scoped = locationOk(session, locationId)
      const items = (await (await db()).contacts.toArray()).filter((c) => scoped(c.locationId))
      const csv = ['firstName,lastName,phone,email,tags', ...items.map((c) => `${c.firstName},${c.lastName},${c.phone ?? ''},${c.email ?? ''},"${c.tags.join(';')}"`)].join('\n')
      return json(z.object({ csv: z.string(), count: z.number() }), { csv, count: items.length })
    }),
  ),

  http.get(
    `${API}/duplicates`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const contacts = await (await db()).contacts.toArray()
      const groups: DuplicateGroup[] = []
      const phones = new Map<string, Contact[]>()
      const emails = new Map<string, Contact[]>()
      for (const contact of contacts) {
        if (contact.phone) {
          const key = contact.phone.replace(/\s/g, '')
          phones.set(key, [...(phones.get(key) ?? []), contact])
        }
        if (contact.email) {
          const key = contact.email.toLowerCase()
          emails.set(key, [...(emails.get(key) ?? []), contact])
        }
      }
      let n = 0
      for (const [matchValue, list] of phones) {
        if (list.length > 1) groups.push({ id: `dup_p_${n++}`, reason: 'phone', matchValue, contacts: list })
      }
      for (const [matchValue, list] of emails) {
        if (list.length > 1) groups.push({ id: `dup_e_${n++}`, reason: 'email', matchValue, contacts: list })
      }
      return json(DuplicateListSchema, groups)
    }),
  ),

  http.post(
    `${API}/contacts/merge`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const { winnerId, loserId } = await parseBody(request, MergeContactsSchema)
      await write(['contacts', 'conversations'], async (database) => {
        const winner = await database.contacts.get(winnerId)
        const loser = await database.contacts.get(loserId)
        if (!winner || !loser) throw new MockHttpError('not_found', 'Contact not found.')
        const moved = (await database.conversations.toArray()).filter((c) => c.contactId === loserId)
        for (const conversation of moved) await database.conversations.update(conversation.id, { contactId: winnerId })
        await database.mergeUndos.add({
          id: `mrg_${crypto.randomUUID()}`,
          accountId: session.account.id,
          winnerId,
          loser,
          conversationsMoved: moved.map((c) => c.id),
          createdAt: now().toISOString(),
          undoUntil: new Date(now().getTime() + 30 * DAY).toISOString(),
        })
        const tags = [...new Set([...winner.tags, ...loser.tags])]
        await database.contacts.update(winnerId, {
          phone: winner.phone ?? loser.phone,
          email: winner.email ?? loser.email,
          tags,
        })
        await database.contacts.delete(loserId)
      })
      const winner = await (await db()).contacts.get(winnerId)
      return json(ContactSchema, winner!)
    }),
  ),

  http.post(
    `${API}/imports/preview`,
    route(async ({ request }) => {
      await loadSession()
      const { csv } = (await request.json()) as { csv: string }
      const rows = parseCsv(csv)
      const header = rows[0]?.map((h) => h.toLowerCase()) ?? []
      const data = rows.slice(1)
      const idx = (name: string) => header.findIndex((h) => h === name.toLowerCase() || h.replace(/\s/g, '') === name.toLowerCase())
      const preview: ImportPreviewRow[] = data.map((cols, i) => {
        const firstName = cols[Math.max(0, idx('firstName'))] ?? cols[0] ?? ''
        const lastName = cols[idx('lastName')] ?? cols[1] ?? ''
        const phone = cols[idx('phone')] ?? cols[2] ?? null
        const email = cols[idx('email')] ?? cols[3] ?? null
        const error = !firstName || !lastName ? 'missing_name' : null
        return { line: i + 2, firstName, lastName, phone: phone || null, email: email || null, error }
      })
      return json(ImportPreviewSchema, {
        rows: preview,
        valid: preview.filter((r) => !r.error).length,
        invalid: preview.filter((r) => r.error).length,
      })
    }),
  ),

  http.post(
    `${API}/imports`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, ImportRunSchema)
      const rows = parseCsv(input.csv).slice(1)
      const created: Contact[] = []
      const locationId = session.locations[0]!.id
      for (const cols of rows) {
        const firstName = cols[0]?.trim() ?? ''
        const lastName = cols[1]?.trim() ?? ''
        if (!firstName || !lastName) continue
        created.push({
          id: `con_${crypto.randomUUID()}`,
          accountId: session.account.id,
          locationId,
          firstName,
          lastName,
          phone: cols[2] || null,
          email: cols[3] || null,
          tags: ['Imported'],
          language: 'en',
          assignedUserId: session.user.id,
          stage: 'New',
          value: null,
          sourceLabel: 'import',
          customFields: {},
          consents: [
            {
              channel: 'whatsapp',
              status: 'granted',
              source: 'import',
              wordingVersion: '2026-09',
              recordedAt: now().toISOString(),
            },
          ],
          optedOut: false,
          companyId: null,
          createdAt: now().toISOString(),
          createdBy: { kind: 'import', name: session.user.name },
        })
      }
      const job = {
        id: `imp_${crypto.randomUUID()}`,
        accountId: session.account.id,
        status: 'complete' as const,
        createdCount: created.length,
        errorCount: Math.max(0, rows.length - created.length),
        contactIds: created.map((c) => c.id),
        undoUntil: new Date(now().getTime() + 7 * DAY).toISOString(),
        createdAt: now().toISOString(),
        createdBy: { kind: 'import' as const, name: session.user.name },
      }
      await write(['contacts', 'home'], async (database) => {
        if (created.length) await database.contacts.bulkAdd(created)
        await database.importJobs.add(job)
      })
      return json(ImportJobSchema, job, 201)
    }),
  ),

  http.post(
    `${API}/imports/:id/undo`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      await write(['contacts'], async (database) => {
        const job = await database.importJobs.get(String(params.id))
        if (!job) throw new MockHttpError('not_found', 'Import not found.')
        if (new Date(job.undoUntil).getTime() < now().getTime()) throw new MockHttpError('conflict', 'Undo window has closed.')
        await database.contacts.bulkDelete(job.contactIds)
        await database.importJobs.update(job.id, { status: 'undone' })
      })
      void session
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/custom-fields`,
    route(async () => {
      await loadSession()
      return json(CustomFieldListSchema, await (await db()).customFields.toArray())
    }),
  ),

  http.post(
    `${API}/contacts/:id/notes`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const { body } = (await request.json()) as { body: string }
      const note = {
        id: `nte_${crypto.randomUUID()}`,
        accountId: session.account.id,
        contactId: String(params.id),
        body,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
      }
      await write(['contacts'], (d) => d.notes.add(note))
      return json(ContactNoteSchema, note, 201)
    }),
  ),

  http.delete(
    `${API}/memories/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      await write(['contacts'], (d) => d.memories.delete(String(params.id)))
      void session
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.patch(
    `${API}/memories/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const { value } = (await request.json()) as { value: string }
      await write(['contacts'], (d) => d.memories.update(String(params.id), { value }))
      const item = await (await db()).memories.get(String(params.id))
      if (!item) throw new MockHttpError('not_found', 'Memory not found.')
      return json(AiMemoryItemSchema, item)
    }),
  ),

  http.get(
    `${API}/smart-lists`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const lists = (await (await db()).smartLists.toArray()).filter((list) => list.accountId === session.account.id)
      return json(SmartListListSchema, lists)
    }),
  ),

  http.post(
    `${API}/smart-lists`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, SmartListWriteSchema)
      const list = {
        id: `sl_${crypto.randomUUID()}`,
        accountId: session.account.id,
        name: input.name,
        filters: input.filters,
        createdAt: now().toISOString(),
        createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
      }
      await write(['contacts'], (d) => d.smartLists.add(list))
      return json(SmartListSchema, list, 201)
    }),
  ),

  http.patch(
    `${API}/smart-lists/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, SmartListWriteSchema.partial())
      await write(['contacts'], async (database) => {
        const list = await database.smartLists.get(String(params.id))
        if (!list) throw new MockHttpError('not_found', 'List not found.')
        await database.smartLists.update(list.id, input)
      })
      const list = await (await db()).smartLists.get(String(params.id))
      return json(SmartListSchema, list!)
    }),
  ),

  http.delete(
    `${API}/smart-lists/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      await write(['contacts'], (d) => d.smartLists.delete(String(params.id)))
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.get(
    `${API}/companies`,
    route(async () => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const database = await db()
      const allowed = new Set(session.locations.map((l) => l.id))
      const contacts = await database.contacts.toArray()
      const companies = (await database.companies.toArray())
        .filter((company) => company.accountId === session.account.id && allowed.has(company.locationId))
        .map((company) => ({
          ...company,
          contactCount: contacts.filter((contact) => contact.companyId === company.id).length,
        }))
      return json(CompanyListSchema, companies)
    }),
  ),

  http.post(
    `${API}/companies`,
    route(async ({ request }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, CompanyWriteSchema)
      const locationId = input.locationId ?? session.locations[0]?.id
      if (!locationId) throw new MockHttpError('validation_failed', 'Pick a location.')
      const company = {
        id: `co_${crypto.randomUUID()}`,
        accountId: session.account.id,
        locationId,
        name: input.name,
        notes: input.notes ?? '',
        createdAt: now().toISOString(),
        createdBy: { kind: 'person' as const, id: session.user.id, name: session.user.name },
      }
      await write(['companies'], (d) => d.companies.add(company))
      return json(CompanySchema, company, 201)
    }),
  ),

  http.get(
    `${API}/companies/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit', 'view')
      const database = await db()
      const company = await database.companies.get(String(params.id))
      if (!company) throw new MockHttpError('not_found', 'Company not found.')
      const contacts = (await database.contacts.toArray()).filter(
        (contact) => contact.companyId === company.id && staffOwns(session, contact.assignedUserId),
      )
      return json(CompanyDetailSchema, { company, contacts })
    }),
  ),

  http.patch(
    `${API}/companies/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const input = await parseBody(request, CompanyWriteSchema.partial())
      await write(['companies'], async (database) => {
        const company = await database.companies.get(String(params.id))
        if (!company) throw new MockHttpError('not_found', 'Company not found.')
        await database.companies.update(company.id, input)
      })
      const company = await (await db()).companies.get(String(params.id))
      return json(CompanySchema, company!)
    }),
  ),

  http.delete(
    `${API}/companies/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      requireCapability(session, 'contacts.edit')
      const id = String(params.id)
      await write(['companies', 'contacts'], async (database) => {
        const company = await database.companies.get(id)
        if (!company) throw new MockHttpError('not_found', 'Company not found.')
        const linked = (await database.contacts.toArray()).filter((contact) => contact.companyId === id)
        for (const contact of linked) await database.contacts.update(contact.id, { companyId: null })
        await database.companies.delete(id)
      })
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
