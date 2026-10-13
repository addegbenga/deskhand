import type { Conversation, Message, Notification, PaymentRecord, ReviewRecord } from '@deskhand/schemas'
import { now } from './clock'
import { INTENTS, INTENT_BODIES, type Intent } from './inbox-rules'
import { currentScenario, db, write } from './store'
import { SCENARIOS } from './scenarios'

const REPLIES: Record<Intent, string> = {
  price: 'Medium knotless braids are ₦35,000 and take about 5 hours. Saturday 10am or 1pm is free.',
  booking: 'I can do Saturday 10am with Tola or 1pm with Funke. Which works for you?',
  complaint: "I'm sorry this went wrong. I'm passing this to the team so a person can help.",
  unknown: "I don't want to guess. I'll check with the team and come back to you.",
  pidgin: 'Medium knotless na ₦35,000, e go take about 5 hours. Saturday 10am or 1pm dey.',
  opt_out: "You're unsubscribed. We won't message you on this channel again.",
  photo: 'That style is a medium knotless, waist length — ₦35,000, about 5 hours.',
}

function isoNow() {
  return now().toISOString()
}

export async function simulateInbound(forced?: Intent): Promise<{ conversationId: string; intent: Intent } | null> {
  const intent = forced ?? INTENTS[Math.floor(Math.random() * INTENTS.length)]!
  const result = await write(['conversations', 'messages', 'contacts', 'nav-summary', 'notifications', 'home'], async (database) => {
    const account = await database.accounts.toCollection().first()
    const conversations = (await database.conversations.toArray()).filter((c) => c.status !== 'closed' && c.kind === 'chat')
    if (!account || conversations.length === 0) return null
    const conversation = conversations[Math.floor(Math.random() * conversations.length)]!
    const contact = await database.contacts.get(conversation.contactId)
    if (!contact) return null

    const body = INTENT_BODIES[intent][0]!
    const message: Message = {
      id: `msg_live_${crypto.randomUUID()}`,
      accountId: account.id,
      conversationId: conversation.id,
      kind: 'inbound',
      authorKind: 'contact',
      authorName: `${contact.firstName} ${contact.lastName}`,
      channel: conversation.channel,
      body,
      deliveryStatus: null,
      attachment: intent === 'photo' ? { name: 'style.jpg', type: 'image' } : null,
      why: null,
      scheduledFor: null,
      rating: null,
      language: intent === 'pidgin' ? 'pcm' : contact.language,
      createdAt: isoNow(),
      createdBy: { kind: 'person' },
      transcript: null,
      summary: null,
    }
    await database.messages.add(message)

    const patch: Partial<Conversation> = {
      lastMessageAt: message.createdAt,
      lastMessagePreview: body,
      lastInboundAt: message.createdAt,
      lastDirection: 'inbound',
      unreadCount: conversation.unreadCount + 1,
      status: intent === 'complaint' || intent === 'unknown' ? 'needs_human' : conversation.status === 'closed' ? 'open' : conversation.status,
    }

    if (intent === 'opt_out') {
      const consents = contact.consents.map((c) =>
        c.channel === conversation.channel ? { ...c, status: 'withdrawn' as const, source: 'inbox' as const, recordedAt: isoNow() } : c,
      )
      await database.contacts.update(contact.id, { optedOut: true, consents })
      patch.aiControl = 'human'
      patch.status = 'closed'
    }

    await database.conversations.update(conversation.id, patch)

    const notification: Notification = {
      id: `ntf_live_${crypto.randomUUID()}`,
      accountId: account.id,
      kind: intent === 'complaint' ? 'needs_human' : 'needs_human',
      params: { contact: `${contact.firstName} ${contact.lastName}` },
      href: `/app/inbox/${conversation.id}`,
      read: false,
      createdAt: isoNow(),
    }
    if (intent === 'complaint' || intent === 'unknown') await database.notifications.add(notification)

    return { conversationId: conversation.id, intent, contact, accountId: account.id, conversation: { ...conversation, ...patch } }
  })

  if (!result) return null

  const sessionLike = await (await db()).accounts.toCollection().first()
  if (sessionLike && result.intent !== 'opt_out' && result.conversation.aiControl === 'ai' && (sessionLike.aiMode === 'on' || sessionLike.aiMode === 'suggest_only')) {
    window.setTimeout(() => {
      void simulateAiReply(result.conversationId, result.intent)
    }, 800 + Math.random() * 1200)
  }

  return { conversationId: result.conversationId, intent: result.intent }
}

export async function simulateAiReply(conversationId: string, intent: Intent) {
  const scenario = SCENARIOS[currentScenario()]
  await write(['conversations', 'messages', 'approvals', 'nav-summary', 'home'], async (database) => {
    const account = await database.accounts.toCollection().first()
    const conversation = await database.conversations.get(conversationId)
    const contact = conversation ? await database.contacts.get(conversation.contactId) : undefined
    if (!account || !conversation || !contact) return
    if (conversation.aiControl !== 'ai') return
    if (account.aiMode === 'manual' || account.aiMode === 'off' || account.aiMode === 'paused') return

    const why = {
      sources: intent === 'unknown' ? [] : ['Service catalogue', 'Price list'],
      rules: intent === 'complaint' ? ['Handoff on complaint'] : ['Ground prices only'],
      tools: intent === 'booking' ? ['offer_slots'] : ['lookup_service'],
    }
    const body = REPLIES[intent]
    const employeeName = scenario.employeeName ?? 'Ada'

    if (account.aiMode === 'suggest_only' || intent === 'complaint' || intent === 'unknown') {
      await database.conversations.update(conversationId, {
        draft: { body, confidence: intent === 'unknown' ? 'low' : 'high', employeeName, language: contact.language, why },
        status: 'needs_human',
      })
      return
    }

    const message: Message = {
      id: `msg_ai_${crypto.randomUUID()}`,
      accountId: account.id,
      conversationId,
      kind: 'outbound',
      authorKind: 'ai_employee',
      authorName: employeeName,
      channel: conversation.channel,
      body,
      deliveryStatus: 'sent',
      attachment: null,
      why,
      scheduledFor: null,
      rating: null,
      language: contact.language,
      createdAt: isoNow(),
      createdBy: { kind: 'ai_employee', id: 'emp_1', name: employeeName },
      transcript: null,
      summary: null,
    }
    await database.messages.add(message)
    await database.conversations.update(conversationId, {
      lastMessageAt: message.createdAt,
      lastMessagePreview: body,
      lastDirection: 'outbound',
      status: 'ai_handled',
      draft: null,
    })
    await database.aiActions.add({
      id: `act_live_${crypto.randomUUID()}`,
      accountId: account.id,
      employeeId: `emp_${currentScenario()}_1`,
      employeeName,
      contactName: `${contact.firstName} ${contact.lastName}`,
      action: intent === 'booking' ? 'booked' : 'replied',
      outcome: 'Sent',
      href: `/app/inbox/${conversationId}`,
      createdAt: isoNow(),
      createdBy: { kind: 'ai_employee', name: employeeName },
    })
  })
}

export async function simulateTemplateReview() {
  await write(['templates'], async (database) => {
    const pending = (await database.templates.toArray()).filter((item) => item.status === 'pending')
    for (const template of pending) {
      const reject = /promo|free|win/i.test(template.body + template.name)
      await database.templates.put({
        ...template,
        status: reject ? 'rejected' : 'approved',
        rejectionReason: reject ? 'Promotional language must go through the marketing category.' : null,
      })
    }
  })
}

export async function simulateReviewArrival() {
  await write(['reviews'], async (database) => {
    const account = await database.accounts.toCollection().first()
    const contacts = await database.contacts.toArray()
    const contact = contacts[Math.floor(Math.random() * Math.min(20, contacts.length))] 
    if (!account || !contact) return
    const review: ReviewRecord = {
      id: `rev_live_${crypto.randomUUID().slice(0, 8)}`,
      accountId: account.id,
      locationId: contact.locationId,
      locationName: 'Ikeja',
      contactName: `${contact.firstName} ${contact.lastName}`,
      rating: 4,
      status: 'new',
      source: 'google',
      body: 'Friendly staff and on time. Would come again.',
      sentiment: 'positive',
      topics: ['staff', 'wait time'],
      urgency: 'low',
      spam: false,
      staffMention: null,
      serviceMention: null,
      draftReply: `Thank you ${contact.firstName} — we are glad you had a good visit.`,
      reply: null,
      repliedAt: null,
      createdAt: isoNow(),
      createdBy: { kind: 'api' },
    }
    await database.reviews.add(review)
  })
}

export async function simulatePaymentWebhook() {
  await write(['payments'], async (database) => {
    const pending = (await database.payments.toArray()).find((item) => item.status === 'pending')
    const openLink = (await database.paymentLinks.toArray()).find((item) => item.status === 'open')
    if (pending) {
      const paid: PaymentRecord = { ...pending, status: 'paid', paidAt: isoNow() }
      await database.payments.put(paid)
    }
    if (openLink) await database.paymentLinks.put({ ...openLink, status: 'paid' })
  })
}

let timer: number | null = null

export function startSimulators() {
  if (typeof window === 'undefined') return
  if (timer != null) return
  const schedule = () => {
    const wait = 20_000 + Math.random() * 40_000
    timer = window.setTimeout(() => {
      void simulateInbound().catch(() => undefined)
      schedule()
    }, wait)
  }
  schedule()
  window.setTimeout(() => {
    void simulateTemplateReview().catch(() => undefined)
  }, 8000)
}

