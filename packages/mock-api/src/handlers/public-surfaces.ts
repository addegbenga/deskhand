import { http } from 'msw'
import {
  PreferenceCenterSchema,
  PreferencePatchSchema,
  PrivacyPageSchema,
  PrivacySubmitResultSchema,
  PrivacySubmitSchema,
  PrivacyVerifyResultSchema,
  PrivacyVerifySchema,
  FormSchema,
  PublicFormPageSchema,
  PublicFormResultSchema,
  PublicFormSubmitSchema,
  PublicLinkResolveSchema,
  PublicPayReceiptSchema,
  PublicPaymentPageSchema,
  PublicPaySchema,
  PublicReviewLandingSchema,
  WidgetBootstrapSchema,
  WidgetConsentSchema,
  WidgetIdentifySchema,
  WidgetCardSchema,
  WidgetMessageWriteSchema,
  WidgetSessionSchema,
  type Contact,
  type Conversation,
  type Lead,
  type Message,
  type PaymentRecord,
  type WidgetChatMessage,
} from '@deskhand/schemas'
import { now } from '../clock'
import { DEFAULT_REVIEW_SETTINGS } from '../grow-rules'
import { json, MockHttpError, parseBody, route } from '../http'
import { bySlug, findAcross, publicTenantFor, waHref } from '../public-account'
import { notifyChange } from '../sync'
import { widgetReply } from '../widget-engine'
import type { MockDb } from '../db'

async function save(_database: MockDb, topics: string[], fn: () => Promise<void>) {
  await fn()
  notifyChange(topics)
}

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

async function grantWebchatConsent(database: MockDb, contactId: string, visitorId: string) {
  const contact = await database.contacts.get(contactId)
  if (!contact || contact.optedOut) return
  const at = now().toISOString()
  const row = {
    channel: 'webchat' as const,
    status: 'granted' as const,
    source: 'widget' as const,
    wordingVersion: 'widget-v1',
    recordedAt: at,
  }
  const consents = contact.consents.some((item) => item.channel === 'webchat')
    ? contact.consents.map((item) => (item.channel === 'webchat' ? row : item))
    : [...contact.consents, row]
  await database.contacts.update(contactId, { consents })
  await database.consentLedger.add({
    id: localId('led'),
    accountId: contact.accountId,
    contactId: contact.id,
    contactName: `${contact.firstName} ${contact.lastName}`,
    purpose: 'service',
    channel: 'webchat',
    status: 'granted',
    source: 'widget',
    wordingVersion: 'widget-v1',
    recordedAt: at,
    proof: `widget:${visitorId}`,
  })
}

function cardsFromSummary(summary: string | null) {
  if (!summary) return []
  try {
    return WidgetCardSchema.array().parse(JSON.parse(summary))
  } catch {
    return []
  }
}

function digits(value: string) {
  return value.replace(/\D/g, '')
}

function afterHours(timezone: string) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(now()),
  )
  return hour < 9 || hour >= 18
}

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
  } catch {
    return `${amount} ${currency}`
  }
}

async function configFor(slug: string) {
  const { database, account } = await bySlug(slug)
  const tenant = await publicTenantFor(database, account)
  const location = await database.locations.where('accountId').equals(account.id).first()
  const owner = (await database.users.toArray()).find((user) => user.id.includes('_owner')) ?? (await database.users.toCollection().first())
  const employee = (await database.employees.toArray()).find((item) => item.accountId === account.id)
  const payment = (await database.paymentLinks.toArray()).find((item) => item.accountId === account.id && item.status === 'open')
  const service = (await database.services.toArray()).find((item) => item.accountId === account.id)
  const state = await database.complianceState.get(account.id)
  const hours = afterHours(tenant.timezone)
  return {
    database,
    account,
    location,
    employee,
    payment,
    service,
    owner,
    tenant,
    config: {
      ...tenant,
      employeeName: employee?.name ?? account.name,
      greeting: `Hi — I’m ${employee?.name ?? 'the assistant'} for ${account.name}. I can help with bookings and questions.`,
      suggested: ['What are your hours?', 'Book a slot', 'How much for knotless braids?'],
      afterHours: hours,
      offlineMessage: hours ? 'We reply in person from 9:00. I can still take your details now.' : 'A person is usually nearby if you ask.',
      whatsappHref: waHref(owner?.phone, `Hi ${account.name}`),
      bookingHref: `/b/${account.slug}`,
      requireConsent: true,
      storedNotice: state?.storedNotice ?? 'This chat is stored so the team can help you.',
      aiEnabled: account.aiMode === 'on' || account.aiMode === 'suggest_only',
    },
  }
}

async function loadWidgetMessages(database: MockDb, conversationId: string | undefined): Promise<WidgetChatMessage[]> {
  if (!conversationId) return []
  const rows = (await database.messages.toArray()).filter((row) => row.conversationId === conversationId)
  rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return rows.map((row) => ({
    id: row.id,
    role: row.authorKind === 'contact' ? 'visitor' : row.authorKind === 'ai_employee' ? 'ai' : 'system',
    body: row.body,
    at: row.createdAt,
    cards: cardsFromSummary(row.summary),
    disclosure: row.authorKind === 'ai_employee',
  }))
}

async function widgetConversation(database: MockDb, visitorId: string) {
  const tag = `visitor:${visitorId}`
  return (await database.conversations.toArray()).find((row) => row.tags.includes(tag))
}

export const publicSurfaceHandlers = [
  http.get(
    '/api/public/widget/:slug',
    route(async ({ params, request }) => {
      const visitorId = new URL(request.url).searchParams.get('visitorId') || localId('vis')
      const ctx = await configFor(String(params.slug))
      const conversation = await widgetConversation(ctx.database, visitorId)
      const consented = Boolean(conversation?.tags.includes('consented')) || !ctx.config.requireConsent
      return json(WidgetBootstrapSchema, {
        config: ctx.config,
        session: {
          visitorId,
          contactId: conversation?.contactId ?? null,
          consented,
          identified: Boolean(conversation && !conversation.tags.includes('anonymous')),
          messages: consented ? await loadWidgetMessages(ctx.database, conversation?.id) : [],
        },
      })
    }),
  ),

  http.post(
    '/api/public/widget/:slug/consent',
    route(async ({ params, request }) => {
      const input = await parseBody(request, WidgetConsentSchema)
      const ctx = await configFor(String(params.slug))
      if (!input.granted) throw new MockHttpError('validation_failed', 'Consent is required to chat.', { fieldErrors: { granted: ['required'] } })
      let conversation = await widgetConversation(ctx.database, input.visitorId)
      await save(ctx.database, ['inbox', 'contacts'], async () => {
        if (!conversation) {
          conversation = await createVisitorThread(ctx.database, ctx.account.id, ctx.location?.id ?? '', ctx.config.employeeName, input.visitorId, true)
        } else if (!conversation.tags.includes('consented')) {
          conversation = { ...conversation, tags: [...conversation.tags, 'consented'] }
          await ctx.database.conversations.put(conversation)
        }
        if (conversation) await grantWebchatConsent(ctx.database, conversation.contactId, input.visitorId)
      })
      const next = await widgetConversation(ctx.database, input.visitorId)
      return json(WidgetSessionSchema, {
        visitorId: input.visitorId,
        contactId: next?.contactId ?? null,
        consented: true,
        identified: Boolean(next && !next.tags.includes('anonymous')),
        messages: await loadWidgetMessages(ctx.database, next?.id),
      })
    }),
  ),

  http.post(
    '/api/public/widget/:slug/identify',
    route(async ({ params, request }) => {
      const input = await parseBody(request, WidgetIdentifySchema)
      const ctx = await configFor(String(params.slug))
      if (ctx.config.requireConsent) {
        const existing = await widgetConversation(ctx.database, input.visitorId)
        if (!existing?.tags.includes('consented')) {
          throw new MockHttpError('validation_failed', 'Allow chat storage first.', { fieldErrors: { consent: ['required'] } })
        }
      }
      const parts = input.name.trim().split(/\s+/)
      const firstName = parts[0] ?? input.name
      const lastName = parts.slice(1).join(' ')
      const at = now().toISOString()
      let contactId = ''
      await save(ctx.database, ['contacts', 'leads', 'inbox'], async () => {
        let conversation = await widgetConversation(ctx.database, input.visitorId)
        if (!conversation) {
          conversation = await createVisitorThread(ctx.database, ctx.account.id, ctx.location?.id ?? '', ctx.config.employeeName, input.visitorId, true)
        }
        const phoneKey = digits(input.phone)
        const match = (await ctx.database.contacts.toArray()).find((row) => row.phone && digits(row.phone) === phoneKey)
        if (match) {
          contactId = match.id
          await ctx.database.conversations.update(conversation.id, {
            contactId: match.id,
            tags: conversation.tags.filter((tag) => tag !== 'anonymous'),
          })
        } else {
          const contact = await ctx.database.contacts.get(conversation.contactId)
          if (contact) {
            const next: Contact = {
              ...contact,
              firstName,
              lastName,
              phone: input.phone,
              sourceLabel: 'webchat',
            }
            await ctx.database.contacts.put(next)
            contactId = next.id
          }
          await ctx.database.conversations.update(conversation.id, { tags: conversation.tags.filter((tag) => tag !== 'anonymous') })
        }
        if (contactId) await grantWebchatConsent(ctx.database, contactId, input.visitorId)
        const lead: Lead = {
          id: localId('lead'),
          accountId: ctx.account.id,
          locationId: ctx.location?.id ?? '',
          contactId,
          contactName: `${firstName} ${lastName}`.trim(),
          status: 'new',
          source: 'webchat',
          assignedUserId: null,
          assignedName: null,
          lastActivityAt: at,
          nextFollowUpAt: at,
          opportunityId: null,
          aiSuggested: ctx.config.aiEnabled,
          createdAt: at,
          createdBy: { kind: 'api' },
        }
        const dup = (await ctx.database.leads.toArray()).find((row) => row.contactId === contactId)
        if (!dup && contactId) await ctx.database.leads.put(lead)
      })
      const conversation = await widgetConversation(ctx.database, input.visitorId)
      return json(WidgetSessionSchema, {
        visitorId: input.visitorId,
        contactId,
        consented: true,
        identified: true,
        messages: await loadWidgetMessages(ctx.database, conversation?.id),
      })
    }),
  ),

  http.post(
    '/api/public/widget/:slug/messages',
    route(async ({ params, request }) => {
      const input = await parseBody(request, WidgetMessageWriteSchema)
      const ctx = await configFor(String(params.slug))
      if (ctx.config.requireConsent) {
        const existing = await widgetConversation(ctx.database, input.visitorId)
        if (!existing?.tags.includes('consented')) {
          throw new MockHttpError('validation_failed', 'Allow chat storage first.', { fieldErrors: { consent: ['required'] } })
        }
      }
      const knowledge = await ctx.database.knowledgeItems.toArray()
      const reply = widgetReply({
        employee: ctx.employee,
        knowledge,
        message: input.body,
        aiEnabled: ctx.config.aiEnabled,
        afterHours: ctx.config.afterHours,
        nextHuman: ctx.config.offlineMessage,
        bookingHref: ctx.config.bookingHref,
        paymentHref: ctx.payment ? `/pay/${ctx.payment.id}` : null,
        city: ctx.tenant.city,
        serviceName: ctx.service?.name ?? 'Visit',
        servicePrice: ctx.service ? money(ctx.service.price, ctx.tenant.currency) : null,
      })
      const at = now().toISOString()
      let conversationId = ''
      await save(ctx.database, ['inbox', 'contacts'], async () => {
        let conversation = await widgetConversation(ctx.database, input.visitorId)
        if (!conversation) {
          conversation = await createVisitorThread(ctx.database, ctx.account.id, ctx.location?.id ?? '', ctx.config.employeeName, input.visitorId, !ctx.config.requireConsent)
        }
        conversationId = conversation.id
        const inbound: Message = {
          id: localId('msg'),
          accountId: ctx.account.id,
          conversationId: conversation.id,
          kind: 'inbound',
          authorKind: 'contact',
          authorName: 'Visitor',
          channel: 'webchat',
          body: input.body,
          deliveryStatus: 'delivered',
          attachment: null,
          why: null,
          scheduledFor: null,
          rating: null,
          language: 'en',
          transcript: null,
          summary: null,
          createdAt: at,
          createdBy: { kind: 'api' },
        }
        const outbound: Message = {
          id: localId('msg'),
          accountId: ctx.account.id,
          conversationId: conversation.id,
          kind: 'outbound',
          authorKind: reply.handedOff && !ctx.config.aiEnabled ? 'system' : 'ai_employee',
          authorName: ctx.config.employeeName,
          channel: 'webchat',
          body: reply.body,
          deliveryStatus: 'sent',
          attachment: null,
          why: reply.disclosure ? { sources: [], rules: ['Widget'], tools: [] } : null,
          scheduledFor: null,
          rating: null,
          language: 'en',
          transcript: null,
          summary: JSON.stringify(reply.cards),
          createdAt: new Date(now().getTime() + 400).toISOString(),
          createdBy: { kind: 'ai_employee', name: ctx.config.employeeName },
        }
        await ctx.database.messages.bulkPut([inbound, outbound])
        await ctx.database.conversations.update(conversation.id, {
          lastMessageAt: outbound.createdAt,
          lastMessagePreview: outbound.body.slice(0, 80),
          lastInboundAt: inbound.createdAt,
          lastDirection: 'inbound',
          unreadCount: 1,
          status: reply.handedOff ? 'needs_human' : 'ai_handled',
        })
      })
      const history = await loadWidgetMessages(ctx.database, conversationId)
      const conversation = await widgetConversation(ctx.database, input.visitorId)
      return json(WidgetSessionSchema, {
        visitorId: input.visitorId,
        contactId: conversation?.contactId ?? null,
        consented: true,
        identified: Boolean(conversation && !conversation.tags.includes('anonymous')),
        messages: history,
      })
    }),
  ),

  http.get(
    '/api/public/forms/:id',
    route(async ({ params }) => {
      const found = await findAcross(async (database) => database.forms.get(String(params.id)))
      if (!found || found.value.status !== 'live') throw new MockHttpError('not_found', 'This form is not live.')
      return json(PublicFormPageSchema, {
        ...(await publicTenantFor(found.database, found.account)),
        form: FormSchema.parse({
          ...found.value,
          thankYou: found.value.thankYou ?? 'Thanks — we will be in touch shortly.',
          redirectUrl: found.value.redirectUrl ?? null,
          successAction: found.value.successAction ?? 'message',
          allowedOrigins: found.value.allowedOrigins ?? [],
          notifyStaff: found.value.notifyStaff ?? true,
          spamProtection: found.value.spamProtection ?? true,
          fields: found.value.fields.map((field) => ({
            ...field,
            placeholder: field.placeholder ?? '',
            help: field.help ?? '',
          })),
        }),
      })
    }),
  ),

  http.post(
    '/api/public/forms/:id/submit',
    route(async ({ params, request }) => {
      const input = await parseBody(request, PublicFormSubmitSchema)
      if (input.honeypot) return json(PublicFormResultSchema, { ok: true, contactId: null })
      const found = await findAcross(async (database) => database.forms.get(String(params.id)))
      if (!found || found.value.status !== 'live') throw new MockHttpError('not_found', 'This form is not live.')
      const consentField = found.value.fields.find((field) => field.type === 'consent' && field.required)
      if (consentField && input.answers[consentField.id] !== 'yes') {
        throw new MockHttpError('validation_failed', 'Consent is required.', { fieldErrors: { [consentField.id]: ['required'] } })
      }
      const location = await found.database.locations.where('accountId').equals(found.account.id).first()
      const name = input.answers.name ?? input.answers.fullName ?? 'Guest'
      const [firstName, ...rest] = name.split(' ')
      const phone = input.answers.phone ?? null
      const at = now().toISOString()
      const contactId = localId('con')
      await save(found.database, ['contacts', 'leads', 'forms'], async () => {
        const existing = phone
          ? (await found.database.contacts.toArray()).find((row) => row.phone && digits(row.phone) === digits(phone))
          : undefined
        const id = existing?.id ?? contactId
        if (!existing) {
          await found.database.contacts.put({
            id,
            accountId: found.account.id,
            locationId: location?.id ?? '',
            firstName: firstName || 'Guest',
            lastName: rest.join(' '),
            phone,
            email: input.answers.email ?? null,
            tags: ['Form'],
            language: 'en',
            assignedUserId: null,
            stage: 'New',
            value: null,
            sourceLabel: 'form',
            customFields: {},
            consents: consentField
              ? [{ channel: 'whatsapp', status: 'granted', source: 'form', wordingVersion: 'v1', recordedAt: at }]
              : [],
            optedOut: false,
            companyId: null,
            createdAt: at,
            createdBy: { kind: 'form' },
          })
          await found.database.leads.put({
            id: localId('lead'),
            accountId: found.account.id,
            locationId: location?.id ?? '',
            contactId: id,
            contactName: name,
            status: 'new',
            source: 'form',
            assignedUserId: null,
            assignedName: null,
            lastActivityAt: at,
            nextFollowUpAt: at,
            opportunityId: null,
            aiSuggested: false,
            createdAt: at,
            createdBy: { kind: 'form' },
          })
        }
        await found.database.formResponses.add({
          id: localId('fres'),
          accountId: found.account.id,
          formId: found.value.id,
          contactName: name,
          answers: input.answers,
          createdAt: at,
          createdBy: { kind: 'form' },
        })
        await found.database.forms.update(found.value.id, { submissions: found.value.submissions + 1 })
      })
      const saved = phone
        ? (await found.database.contacts.toArray()).find((row) => row.phone && digits(row.phone) === digits(phone))
        : await found.database.contacts.get(contactId)
      return json(PublicFormResultSchema, { ok: true, contactId: saved?.id ?? null })
    }),
  ),

  http.get(
    '/api/public/pay/:id',
    route(async ({ params }) => {
      const found = await findAcross(async (database) => database.paymentLinks.get(String(params.id)))
      if (!found) throw new MockHttpError('not_found', 'This payment link is not available.')
      const tenant = await publicTenantFor(found.database, found.account)
      const expired = new Date(found.value.expiresAt).getTime() < now().getTime()
      return json(PublicPaymentPageSchema, {
        ...tenant,
        paymentId: found.value.id,
        amount: found.value.amount,
        currency: found.value.currency,
        purpose: found.value.purpose,
        contactName: found.value.contactName,
        status: expired && found.value.status === 'open' ? 'expired' : found.value.status,
        expiresAt: found.value.expiresAt,
      })
    }),
  ),

  http.post(
    '/api/public/pay/:id',
    route(async ({ params, request }) => {
      await parseBody(request, PublicPaySchema)
      const found = await findAcross(async (database) => database.paymentLinks.get(String(params.id)))
      if (!found) throw new MockHttpError('not_found', 'This payment link is not available.')
      if (found.value.status !== 'open') throw new MockHttpError('conflict', 'This link is no longer open.')
      const location = await found.database.locations.where('accountId').equals(found.account.id).first()
      const at = now().toISOString()
      await save(found.database, ['payments'], async () => {
        await found.database.paymentLinks.update(found.value.id, { status: 'paid' })
        const fallbackContact = (await found.database.contacts.toArray())[0]
        const record: PaymentRecord = {
          id: localId('pay'),
          accountId: found.account.id,
          locationId: location?.id ?? '',
          contactId: found.value.contactId ?? fallbackContact?.id ?? localId('con'),
          contactName: found.value.contactName,
          amount: found.value.amount,
          currency: found.value.currency,
          status: 'paid',
          paidAt: at,
          source: 'link',
          gatewayRef: localId('PSK'),
          createdAt: at,
          createdBy: { kind: 'api' },
        }
        await found.database.payments.put(record)
      })
      return json(PublicPayReceiptSchema, { status: 'paid', receipt: `R-${found.value.id.slice(-6).toUpperCase()}` })
    }),
  ),

  http.get(
    '/api/public/reviews/:slug',
    route(async ({ params }) => {
      const { database, account } = await bySlug(String(params.slug))
      const tenant = await publicTenantFor(database, account)
      const location = await database.locations.where('accountId').equals(account.id).first()
      return json(PublicReviewLandingSchema, {
        ...tenant,
        locationName: location?.name ?? account.name,
        googleHref: DEFAULT_REVIEW_SETTINGS.landingUrl.replace('amaka-braids', account.slug),
      })
    }),
  ),

  http.get(
    '/api/public/l/:slug',
    route(async ({ params }) => {
      const slug = String(params.slug)
      try {
        const { database, account } = await bySlug(slug)
        const tenant = await publicTenantFor(database, account)
        const owner = (await database.users.toArray()).find((user) => user.id.includes('_owner'))
        return json(PublicLinkResolveSchema, {
          kind: 'hub',
          hub: {
            ...tenant,
            phone: owner?.phone ?? null,
            buttons: [
              { id: 'book', href: `/b/${account.slug}` },
              { id: 'whatsapp', href: waHref(owner?.phone, `Hi ${account.name}`) },
              { id: 'call', href: owner?.phone ? `tel:${digits(owner.phone)}` : `/b/${account.slug}` },
              { id: 'directions', href: `https://maps.google.com/?q=${encodeURIComponent(tenant.city)}` },
              { id: 'reviews', href: `/r/${account.slug}` },
              { id: 'menu', href: `/p/${account.slug}-offer` },
            ],
          },
        })
      } catch {
        const found = await findAcross(async (database) =>
          (await database.trackLinks.toArray()).find((row) => row.code.toLowerCase() === slug.toLowerCase()),
        )
        if (!found) throw new MockHttpError('not_found', 'This link does not exist.')
        await save(found.database, ['links'], async () => {
          await found.database.trackLinks.update(found.value.id, { clicks: found.value.clicks + 1 })
        })
        return json(PublicLinkResolveSchema, { kind: 'track', href: found.value.href, label: found.value.label })
      }
    }),
  ),

  http.get(
    '/api/public/preferences/:token',
    route(async ({ params }) => {
      const token = String(params.token)
      const found = await findAcross(async (database) => {
        const contacts = await database.contacts.toArray()
        return (
          contacts.find((row) => row.customFields.prefToken === token) ??
          contacts.find((row) => row.id === token || `pref_${row.id}` === token)
        )
      })
      if (!found) throw new MockHttpError('not_found', 'This preference link has expired.')
      const tenant = await publicTenantFor(found.database, found.account)
      return json(PreferenceCenterSchema, {
        ...tenant,
        contactName: `${found.value.firstName} ${found.value.lastName}`.trim(),
        token,
        optedOut: found.value.optedOut,
        channels: found.value.consents.map((row) => ({
          channel: row.channel,
          purpose: 'service',
          granted: row.status === 'granted',
        })),
      })
    }),
  ),

  http.patch(
    '/api/public/preferences/:token',
    route(async ({ params, request }) => {
      const token = String(params.token)
      const input = await parseBody(request, PreferencePatchSchema)
      const found = await findAcross(async (database) => {
        const contacts = await database.contacts.toArray()
        return (
          contacts.find((row) => row.customFields.prefToken === token) ??
          contacts.find((row) => row.id === token || `pref_${row.id}` === token)
        )
      })
      if (!found) throw new MockHttpError('not_found', 'This preference link has expired.')
      const at = now().toISOString()
      await save(found.database, ['contacts', 'compliance'], async () => {
        const contact = found.value
        const next: Contact = input.unsubscribeAll
          ? {
              ...contact,
              optedOut: true,
              consents: contact.consents.map((row) => ({ ...row, status: 'withdrawn' as const, recordedAt: at, source: 'preference_center' })),
            }
          : {
              ...contact,
              consents: contact.consents.map((row) =>
                row.channel === input.channel ? { ...row, status: input.granted ? 'granted' : 'withdrawn', recordedAt: at, source: 'preference_center' } : row,
              ),
            }
        await found.database.contacts.put(next)
        await found.database.consentLedger.add({
          id: localId('led'),
          accountId: found.account.id,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          purpose: 'service',
          channel: input.channel ?? contact.consents[0]?.channel ?? 'whatsapp',
          status: input.unsubscribeAll || input.granted === false ? 'withdrawn' : 'granted',
          source: 'preference_center',
          wordingVersion: 'v1',
          recordedAt: at,
          proof: `token:${token}`,
        })
      })
      const updated = await found.database.contacts.get(found.value.id)
      const tenant = await publicTenantFor(found.database, found.account)
      return json(PreferenceCenterSchema, {
        ...tenant,
        contactName: `${updated?.firstName ?? ''} ${updated?.lastName ?? ''}`.trim(),
        token,
        optedOut: Boolean(updated?.optedOut),
        channels: (updated?.consents ?? []).map((row) => ({
          channel: row.channel,
          purpose: 'service',
          granted: row.status === 'granted',
        })),
      })
    }),
  ),

  http.get(
    '/api/public/privacy/:slug',
    route(async ({ params }) => {
      const { database, account } = await bySlug(String(params.slug))
      const tenant = await publicTenantFor(database, account)
      const disclosure = await database.complianceState.get(account.id)
      return json(PrivacyPageSchema, {
        ...tenant,
        legalName: account.name,
        privacyEmail: disclosure ? 'privacy@' + account.slug.replace(/-/g, '') + '.com' : `privacy@${account.slug.replace(/-/g, '')}.com`,
      })
    }),
  ),

  http.post(
    '/api/public/privacy/:slug',
    route(async ({ params, request }) => {
      const input = await parseBody(request, PrivacySubmitSchema)
      if (input.honeypot) return json(PrivacySubmitResultSchema, { requestId: localId('dsar'), verifyRequired: true })
      const { database, account } = await bySlug(String(params.slug))
      const id = localId('dsar')
      await save(database, ['compliance'], async () => {
        await database.dsarRequests.add({
          id,
          accountId: account.id,
          type: input.type,
          requester: `${input.name} <${input.email}>`,
          contactId: null,
          receivedAt: now().toISOString(),
          status: 'received',
          assignee: null,
        })
      })
      return json(PrivacySubmitResultSchema, { requestId: id, verifyRequired: true })
    }),
  ),

  http.post(
    '/api/public/privacy/:slug/verify',
    route(async ({ params, request }) => {
      const input = await parseBody(request, PrivacyVerifySchema)
      const { database } = await bySlug(String(params.slug))
      const row = await database.dsarRequests.get(input.requestId)
      if (!row) throw new MockHttpError('not_found', 'Request not found.')
      if (input.code !== '123456') {
        throw new MockHttpError('validation_failed', 'That code does not match.', { fieldErrors: { code: ['invalid'] } })
      }
      await save(database, ['compliance'], async () => {
        await database.dsarRequests.update(row.id, { status: 'verified' })
      })
      return json(PrivacyVerifyResultSchema, { verified: true })
    }),
  ),
]

async function createVisitorThread(
  database: MockDb,
  accountId: string,
  locationId: string,
  employeeName: string,
  visitorId: string,
  consented: boolean,
): Promise<Conversation> {
  const at = now().toISOString()
  const contactId = localId('con')
  const conversationId = localId('cnv')
  const contact: Contact = {
    id: contactId,
    accountId,
    locationId,
    firstName: 'Visitor',
    lastName: visitorId.slice(-4),
    phone: null,
    email: null,
    tags: ['Web chat'],
    language: 'en',
    assignedUserId: null,
    stage: 'New',
    value: null,
    sourceLabel: 'webchat',
    customFields: { visitorId },
    consents: consented
      ? [
          {
            channel: 'webchat',
            status: 'granted',
            source: 'widget',
            wordingVersion: 'widget-v1',
            recordedAt: at,
          },
        ]
      : [],
    optedOut: false,
    companyId: null,
    createdAt: at,
    createdBy: { kind: 'api' },
  }
  const conversation: Conversation = {
    id: conversationId,
    accountId,
    locationId,
    contactId,
    channel: 'webchat',
    kind: 'chat',
    status: 'open',
    unreadCount: 0,
    assignedUserId: null,
    lastMessageAt: at,
    lastMessagePreview: '',
    lastInboundAt: at,
    lastDirection: 'inbound',
    language: 'en',
    aiControl: 'ai',
    snoozedUntil: null,
    tags: [`visitor:${visitorId}`, 'anonymous', ...(consented ? ['consented'] : [])],
    draft: null,
    recordingNotice: false,
    lockedByName: null,
    createdAt: at,
    createdBy: { kind: 'ai_employee', name: employeeName },
  }
  await database.contacts.put(contact)
  await database.conversations.put(conversation)
  return conversation
}
