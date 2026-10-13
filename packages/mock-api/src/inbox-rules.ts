import type { Contact, Conversation, MessageTemplate, SendBlockReason, Session } from '@deskhand/schemas'
import { HOUR, now } from './clock'
import type { ConnectionRecord } from './db'

export const WHATSAPP_WINDOW_MS = 24 * HOUR

export function aiVisible(session: Session) {
  return session.account.aiMode !== 'manual' && session.account.aiMode !== 'off'
}

export function windowState(conversation: Conversation) {
  if (conversation.channel !== 'whatsapp') return { open: true, closesAt: null as string | null }
  const closes = new Date(conversation.lastInboundAt).getTime() + WHATSAPP_WINDOW_MS
  const open = now().getTime() < closes
  return { open, closesAt: open ? new Date(closes).toISOString() : null }
}

export function sendBlock(
  session: Session,
  contact: Contact,
  conversation: Conversation,
  connections: ConnectionRecord[],
  template: MessageTemplate | undefined,
  isNote: boolean,
): SendBlockReason | null {
  if (isNote) return null
  if (session.membership.role === 'readonly') return 'readonly'
  const connection = connections.find((c) => c.kind === conversation.channel)
  if (connection?.health === 'broken') return 'channel_down'
  if (contact.optedOut) return 'opted_out'
  const consent = contact.consents.find((c) => c.channel === conversation.channel)
  if (!consent || consent.status === 'missing') return 'consent_missing'
  if (consent.status === 'withdrawn') return 'opted_out'
  if (conversation.channel === 'whatsapp' && !windowState(conversation).open) {
    if (!template || template.status !== 'approved') return 'window_closed'
  }
  return null
}

export function applyTemplate(body: string, contact: Contact) {
  return body.replaceAll('{{1}}', contact.firstName).replaceAll('{{2}}', 'Saturday 10am').replaceAll('{{3}}', contact.firstName)
}

const PIDGIN: Record<string, string> = {
  Hello: 'How far',
  Hi: 'How far',
  thanks: 'thank you well well',
  Saturday: 'Saturday',
  available: 'dey available',
}

export function mockTranslate(text: string, to: string) {
  if (to === 'pcm') {
    return Object.entries(PIDGIN).reduce((acc, [from, into]) => acc.replaceAll(from, into), text)
  }
  if (to === 'fr') return `[fr] ${text}`
  if (to === 'ar') return `[ar] ${text}`
  return text
}

export const INTENTS = ['price', 'booking', 'complaint', 'unknown', 'pidgin', 'opt_out', 'photo'] as const
export type Intent = (typeof INTENTS)[number]

export const INTENT_BODIES: Record<Intent, string[]> = {
  price: ['Hi, how much is knotless braids medium length?', 'Wetin be the price for passion twist?'],
  booking: ['Do you have space this Saturday by 10am?', 'Can I book for tomorrow afternoon?'],
  complaint: ['The braids from last week are already loosening, not happy', 'This is taking too long, I want a refund'],
  unknown: ['Do you do wig colouring as well?', 'Can you bleach on 4C hair?'],
  pidgin: ['Abeg how much for small cornrows? I wan come tomorrow', 'Una dey open on Sunday?'],
  opt_out: ['STOP', 'Please stop messaging me'],
  photo: ['This is the style I want'],
}
