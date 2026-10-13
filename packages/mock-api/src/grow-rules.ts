import type { CampaignCheck, ChannelKind, Contact, MessageTemplate, ReviewSettings } from '@deskhand/schemas'
import { REWARD_PATTERN } from '@deskhand/schemas'

export const QUIET_TAG = 'quiet-hours-window'

export const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  delayHours: 24,
  wording: {
    en: 'If you have a moment, we would love your honest review of your visit.',
    fr: 'Si vous avez un moment, nous serions heureux de lire votre avis sincère.',
    ar: 'إذا سنحت لك فرصة، يسعدنا تقييم زيارتك بصدق.',
  },
  reminder: true,
  landingUrl: 'https://g.page/r/amaka-braids',
  sent: 48,
  opened: 31,
  received: 12,
}

export function channelConsent(contact: Contact, channel: ChannelKind) {
  if (contact.optedOut) return 'opt_out' as const
  const entry = contact.consents.find((item) => item.channel === channel)
  if (!entry || entry.status !== 'granted') return 'consent' as const
  return 'ok' as const
}

export function checkCampaign(contacts: Contact[], template: MessageTemplate | undefined, channel: 'whatsapp' | 'email'): CampaignCheck {
  const templateOk = template?.status === 'approved' && template.channel === channel
  const reasons: CampaignCheck['reasons'] = []
  let excludedConsent = 0
  let excludedOptOut = 0
  let excludedQuietHours = 0
  let sendable = 0
  for (const contact of contacts) {
    const consent = channelConsent(contact, channel)
    if (consent === 'opt_out') {
      excludedOptOut += 1
      reasons.push({ contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`, reason: 'opt_out' })
      continue
    }
    if (consent === 'consent') {
      excludedConsent += 1
      reasons.push({ contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`, reason: 'consent' })
      continue
    }
    if (contact.tags.includes(QUIET_TAG)) {
      excludedQuietHours += 1
      reasons.push({ contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`, reason: 'quiet_hours' })
      continue
    }
    if (!templateOk) {
      reasons.push({ contactId: contact.id, name: `${contact.firstName} ${contact.lastName}`, reason: 'template' })
      continue
    }
    sendable += 1
  }
  return {
    audience: contacts.length,
    sendable: templateOk ? sendable : 0,
    excludedConsent,
    excludedOptOut,
    excludedQuietHours,
    templateOk,
    templateStatus: template?.status ?? 'missing',
    reasons: reasons.slice(0, 40),
    canSend: Boolean(templateOk && sendable > 0),
  }
}

export function rewardWording(text: string) {
  return REWARD_PATTERN.test(text)
}

export function reviewSettingsHaveReward(wording: Record<string, string>) {
  return Object.values(wording).some((value) => rewardWording(value))
}
