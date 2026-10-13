import type { Account, OnboardingState, SandboxChatReply, SandboxScript } from '@deskhand/schemas'

/**
 * Scripted sandbox replies (FE-DOC 8.4 AI reply engine). Customer and AI text is conversation
 * content in the business's language, grounded only in what the owner taught: unconfirmed prices
 * are never quoted (FR-IP.4), off-topic chat is refused (FR-G.1), complaints go to a person.
 */
type Context = { state: OnboardingState; account: Account; locale: string; ownerName: string }

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function money(ctx: Context, amount: number) {
  return new Intl.NumberFormat(ctx.locale, { style: 'currency', currency: ctx.state.profile.currency, maximumFractionDigits: 0 }).format(amount)
}

function duration(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`
  const hours = minutes / 60
  return Number.isInteger(hours) ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours.toFixed(1)} hours`
}

function readyServices(ctx: Context) {
  return ctx.state.knowledge.services.filter((s) => s.price !== null && s.verified)
}

function handoff(ctx: Context, reason: string): Omit<SandboxChatReply, 'customer' | 'ranAt'> {
  return {
    reply: `I'm not able to confirm that myself, so I've asked ${ctx.ownerName} from the team to reply here shortly.`,
    replyKind: 'handoff',
    sources: [{ kind: 'rule', label: reason }],
  }
}

function priceReply(ctx: Context, name: string | undefined): Omit<SandboxChatReply, 'customer' | 'ranAt'> {
  const service = name ? ctx.state.knowledge.services.find((s) => s.name.toLowerCase() === name.toLowerCase()) : readyServices(ctx)[0]
  if (!service || service.price === null || !service.verified) return handoff(ctx, 'Unconfirmed prices are never quoted')
  const price = service.price === 0 ? 'free' : money(ctx, service.price)
  return {
    reply: `${service.name} is ${price} and takes about ${duration(service.durationMin)}. Would you like me to book you in?`,
    replyKind: 'answer',
    sources: [{ kind: 'service', label: service.name }],
  }
}

function hoursFor(ctx: Context, day: number) {
  return ctx.state.profile.hours.find((h) => h.day === day)
}

function scriptReply(script: SandboxScript, ctx: Context): Omit<SandboxChatReply, 'ranAt'> {
  const { state, account } = ctx
  const answers = state.knowledge.answers
  const first = readyServices(ctx)[0] ?? state.knowledge.services[0]
  switch (script) {
    case 'price': {
      const customer = `Hi, how much is ${first?.name.toLowerCase() ?? 'your most popular service'}?`
      return { customer, ...priceReply(ctx, first?.name) }
    }
    case 'booking': {
      const saturday = hoursFor(ctx, 6)
      const customer = 'Can I book for Saturday morning?'
      if (saturday?.open) {
        return {
          customer,
          reply: `Yes! We open at ${saturday.from} on Saturday. I can offer ${saturday.from} or 11:30. Which works better for you?`,
          replyKind: 'booking_offer',
          sources: [{ kind: 'hours', label: 'Saturday' }],
        }
      }
      const next = state.profile.hours.find((h) => h.open)
      return {
        customer,
        reply: `We're closed on Saturdays. ${next ? `How about ${DAY_NAMES[next.day]} at ${next.from}?` : 'Let me check with the team for the next free slot.'}`,
        replyKind: next ? 'booking_offer' : 'handoff',
        sources: [{ kind: 'hours', label: 'Saturday' }],
      }
    }
    case 'hours': {
      const friday = hoursFor(ctx, 5)
      return {
        customer: 'What time do you close on Friday?',
        reply: friday?.open ? `On Friday we're open from ${friday.from} to ${friday.to}.` : "We're closed on Fridays. Is another day good for you?",
        replyKind: 'answer',
        sources: [{ kind: 'hours', label: 'Friday' }],
      }
    }
    case 'location': {
      const where = answers.location?.trim() || state.profile.address
      const customer = 'Where are you located?'
      if (!where) return { customer, ...handoff(ctx, 'No address in the knowledge base') }
      return {
        customer,
        reply: `You'll find us at ${where}${state.profile.city ? `, ${state.profile.city}` : ''}.`,
        replyKind: 'answer',
        sources: [{ kind: 'answer', label: 'Location' }],
      }
    }
    case 'cancellation': {
      const customer = 'I need to cancel my appointment tomorrow.'
      if (!answers.cancellation?.trim()) return { customer, ...handoff(ctx, 'No cancellation policy yet') }
      return {
        customer,
        reply: `No problem, I can help with that. Just so you know: ${answers.cancellation.trim()} Shall I go ahead and cancel?`,
        replyKind: 'answer',
        sources: [{ kind: 'answer', label: 'Cancellation policy' }],
      }
    }
    case 'discount':
      return {
        customer: 'Can you give me 30% off if I bring a friend?',
        reply: `I can't offer discounts myself, but I've asked ${ctx.ownerName} and they'll get back to you here.`,
        replyKind: 'handoff',
        sources: [{ kind: 'rule', label: 'Never promise discounts' }],
      }
    case 'language': {
      if (account.market === 'NG' && state.profile.languages.includes('pcm')) {
        const service = readyServices(ctx)[0]
        return {
          customer: `Abeg how much be una ${service?.name.toLowerCase() ?? 'price'}?`,
          reply: service?.price
            ? `${service.name} na ${money(ctx, service.price)}. You wan make I book you?`
            : `Make I ask the team for the correct price, dem go reply you here sharp sharp.`,
          replyKind: service?.price ? 'answer' : 'handoff',
          sources: service ? [{ kind: 'service', label: service.name }] : [{ kind: 'rule', label: 'Unconfirmed prices are never quoted' }],
        }
      }
      const faq = state.knowledge.faqs.find((f) => f.verified && f.answer.trim())
      return {
        customer: faq?.question ?? 'Do you have parking nearby?',
        reply: faq ? faq.answer : "I'm not sure about that, so I've asked the team to reply here.",
        replyKind: faq ? 'answer' : 'handoff',
        sources: faq ? [{ kind: 'faq', label: faq.question }] : [{ kind: 'rule', label: 'Unknown answers go to a person' }],
      }
    }
    case 'unknown_price':
      return {
        customer: 'How much would you charge for a group of 8 on the same day?',
        ...handoff(ctx, 'No price for group bookings'),
      }
    case 'angry':
      return {
        customer: 'I waited two hours and nobody attended to me. This is really terrible!!',
        reply: `I'm really sorry about your wait. That's not the experience we want for you. I've passed this to ${ctx.ownerName}, who will reply to you personally.`,
        replyKind: 'handoff',
        sources: [{ kind: 'rule', label: 'Complaints go to a person' }],
      }
    case 'off_topic':
      return {
        customer: 'Who do you think will win the match tonight?',
        reply: `I can only help with questions about ${state.profile.name}: bookings, prices and opening hours. Is there anything I can help you with?`,
        replyKind: 'refusal',
        sources: [{ kind: 'rule', label: 'Business topics only' }],
      }
  }
}

export function runScript(script: SandboxScript, ctx: Context, iso: string) {
  return { script, ...scriptReply(script, ctx), verdict: null, ranAt: iso }
}

const ANGRY = ['terrible', 'worst', 'angry', 'useless', 'refund', 'disappointed', 'rubbish', 'scam']
const OFF_TOPIC = ['weather', 'football', 'match', 'election', 'politics', 'homework', 'joke', 'recipe', 'bitcoin']

/** Free-text sandbox chat: simple intent matching over the knowledge the owner gave. */
export function chatReply(message: string, ctx: Context, iso: string): SandboxChatReply {
  const text = message.toLowerCase()
  const base = { customer: message, ranAt: iso }
  const has = (...words: string[]) => words.some((w) => text.includes(w))
  if (has(...ANGRY)) return { ...base, ...scriptReply('angry', ctx), customer: message }
  if (has(...OFF_TOPIC)) return { ...base, ...scriptReply('off_topic', ctx), customer: message }
  if (has('discount', '% off', 'cheaper', 'reduce the price')) return { ...base, ...scriptReply('discount', ctx), customer: message }

  const service = ctx.state.knowledge.services.find((s) =>
    s.name
      .toLowerCase()
      .split(/[\s()]+/)
      .filter((w) => w.length > 3)
      .some((w) => text.includes(w)),
  )
  if (service && has('how much', 'price', 'cost', 'charge')) return { ...base, ...priceReply(ctx, service.name) }
  if (has('how much', 'price', 'cost')) return { ...base, ...priceReply(ctx, undefined) }
  if (has('cancel', 'reschedule', 'move my')) return { ...base, ...scriptReply('cancellation', ctx), customer: message }
  if (has('where', 'address', 'located', 'location', 'direction')) return { ...base, ...scriptReply('location', ctx), customer: message }
  if (has('book', 'appointment', 'slot', 'available')) return { ...base, ...scriptReply('booking', ctx), customer: message }
  if (has('open', 'close', 'hours', 'what time')) {
    const day = DAY_NAMES.findIndex((d) => text.includes(d.toLowerCase()))
    const hours = hoursFor(ctx, day >= 0 ? day : 1)
    return {
      ...base,
      reply: hours?.open ? `On ${DAY_NAMES[hours.day]} we're open from ${hours.from} to ${hours.to}.` : `We're closed on ${DAY_NAMES[hours?.day ?? 1]}.`,
      replyKind: 'answer',
      sources: [{ kind: 'hours', label: DAY_NAMES[hours?.day ?? 1]! }],
    }
  }
  const topics = [
    ['payment', ['pay', 'transfer', 'card', 'cash']],
    ['delivery', ['deliver', 'home service', 'pickup', 'pick up']],
  ] as const
  for (const [topic, words] of topics) {
    const answer = ctx.state.knowledge.answers[topic]?.trim()
    if (has(...words) && answer) {
      return { ...base, reply: answer, replyKind: 'answer', sources: [{ kind: 'answer', label: topic === 'payment' ? 'Payment methods' : 'Delivery and home service' }] }
    }
  }
  const words = text.split(/\W+/).filter((w) => w.length > 3)
  const faq = ctx.state.knowledge.faqs.find(
    (f) => f.verified && words.filter((w) => f.question.toLowerCase().includes(w)).length >= 2,
  )
  if (faq) return { ...base, reply: faq.answer, replyKind: 'answer', sources: [{ kind: 'faq', label: faq.question }] }
  return { ...base, ...handoff(ctx, 'Unknown answers go to a person') }
}
