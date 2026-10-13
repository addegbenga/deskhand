import type { Employee, KnowledgeItem, WidgetCard } from '@deskhand/schemas'
import { sandboxReply } from './ai-engine'

export function widgetReply(input: {
  employee: Employee | undefined
  knowledge: KnowledgeItem[]
  message: string
  aiEnabled: boolean
  afterHours: boolean
  nextHuman: string
  bookingHref: string
  paymentHref: string | null
  city: string
  serviceName: string
  servicePrice: string | null
}) {
  const cards: WidgetCard[] = []
  const q = input.message.toLowerCase()
  if (/book|slot|available|appointment|when/.test(q)) {
    cards.push({
      type: 'slots',
      title: 'Next times',
      slots: [
        { label: 'Tomorrow 10:00', startsAt: 'tomorrow-10' },
        { label: 'Tomorrow 14:00', startsAt: 'tomorrow-14' },
        { label: 'Wednesday 11:00', startsAt: 'wed-11' },
      ],
      href: input.bookingHref,
    })
  }
  if (/pay|deposit|link/.test(q) && input.paymentHref) {
    cards.push({ type: 'payment', title: 'Pay a deposit', amountLabel: input.servicePrice ?? '', href: input.paymentHref })
  }
  if (/where|map|address|location/.test(q)) {
    cards.push({ type: 'location', title: input.city, address: input.city })
  }
  if (/braid|service|cornrow|twist|press/.test(q)) {
    cards.push({ type: 'service', title: input.serviceName, priceLabel: input.servicePrice, href: input.bookingHref })
  }

  if (!input.aiEnabled || !input.employee) {
    return {
      body: input.afterHours
        ? `Thanks — the team is away. ${input.nextHuman}`
        : 'Thanks, a person on the team will pick this up here.',
      cards,
      disclosure: false,
      handedOff: true,
    }
  }

  const reply = sandboxReply(input.employee, input.knowledge, input.message, undefined, 'en')
  const extra = input.afterHours ? ` ${input.nextHuman}` : ''
  return {
    body: `${reply.text}${extra}`,
    cards,
    disclosure: reply.disclosureShown,
    handedOff: reply.handedOff,
  }
}
