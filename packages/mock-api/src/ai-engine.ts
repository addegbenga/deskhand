import type { Employee, KnowledgeItem, SandboxReply } from '@deskhand/schemas'

const PRICE = /(?:₦|ngn|naira|\d[\d,]{2,})/i
const INJECTION = /ignore (all|previous)|you are now|system prompt|jailbreak/i
const GENERAL = /poem|weather in paris|who won the (world cup|election)|write (me )?a story/i
const HUMAN = /human|person|manager|amaka|real (person|human)/i
const CLOSED = /sunday|closed/i

function itemMentionsPrice(item: KnowledgeItem) {
  return item.containsPrice || PRICE.test(item.answer)
}

/** Scripted sandbox (PRD 7.2 step 7, FR-G.1, FR-G.9). Never asserts unverified prices. */
export function sandboxReply(
  employee: Employee,
  knowledge: KnowledgeItem[],
  message: string,
  scenario: string | undefined,
  language = 'en',
): SandboxReply {
  const why = { sources: [] as string[], rules: [] as string[], tools: [] as string[] }
  const paused = employee.killSwitched || employee.status === 'paused'
  if (paused) {
    why.rules.push('Kill switch')
    return {
      text: `${employee.name} is paused. A person on the team will pick this up.`,
      blocked: true,
      handedOff: true,
      usedItemIds: [],
      why,
      disclosureShown: true,
    }
  }

  const disclosure = employee.disclosure
  const prefix = disclosure ? `${disclosure} ` : ''
  const verified = knowledge.filter((item) => item.status === 'verified')
  const priceItems = knowledge.filter(itemMentionsPrice)

  const isPrice = scenario === 'price' || /how much|price|cost|₦/.test(message.toLowerCase())
  const isInjection = scenario === 'injection' || INJECTION.test(message)
  const isGeneral = scenario === 'general' || GENERAL.test(message)
  const isHandoff = scenario === 'handoff' || HUMAN.test(message)
  const isClosed = scenario === 'closed_day' || CLOSED.test(message)

  if (isInjection) {
    why.rules.push('Business-scope lock', 'Prompt injection')
    return {
      text: `${prefix}I only help with ${employee.name}'s salon questions — bookings, hours and our services. How can I help with those?`,
      blocked: true,
      handedOff: false,
      usedItemIds: [],
      why,
      disclosureShown: true,
    }
  }

  if (isGeneral) {
    why.rules.push('Business-scope lock')
    return {
      text: `${prefix}I stay on salon topics for this business, so I can't help with that. Ask me about braids, hours or a booking.`,
      blocked: true,
      handedOff: false,
      usedItemIds: [],
      why,
      disclosureShown: true,
    }
  }

  if (isHandoff) {
    why.rules.push('Handoff on request')
    why.tools.push('handoff')
    return {
      text: `${prefix}I'll pass you to a person on the team now.`,
      blocked: false,
      handedOff: true,
      usedItemIds: [],
      why,
      disclosureShown: true,
    }
  }

  if (isClosed) {
    const hours = verified.find((item) => item.collection === 'locations' || /hour|open|sunday/i.test(item.title))
    why.rules.push('Opening hours')
    if (hours) why.sources.push(hours.title)
    return {
      text: `${prefix}${hours?.answer ?? 'We are closed on Sundays. I can offer the next weekday slot instead.'}`,
      blocked: false,
      handedOff: false,
      usedItemIds: hours ? [hours.id] : [],
      why,
      disclosureShown: true,
    }
  }

  if (isPrice) {
    why.rules.push('Ground prices only', 'Unverified items cannot be asserted')
    why.tools.push('lookup_service')
    const q = message.toLowerCase()
    const mentioned = priceItems.filter((item) => q.includes(item.title.split('(')[0]!.trim().toLowerCase()) || item.title.toLowerCase().split(' ').some((word) => word.length > 4 && q.includes(word)))
    const pool = scenario === 'price' ? priceItems.filter((item) => item.status !== 'verified') : mentioned.length ? mentioned : priceItems
    const allowed = pool.filter((item) => item.status === 'verified')
    if (allowed[0]) {
      why.sources.push(allowed[0].title)
      const pinned = allowed[0].pinned[language]
      return {
        text: `${prefix}${pinned ?? allowed[0].answer}`,
        blocked: false,
        handedOff: false,
        usedItemIds: [allowed[0].id],
        why,
        disclosureShown: true,
      }
    }
    return {
      text: `${prefix}I don't want to guess a price. I'll get the team to confirm the current rate and come back to you.`,
      blocked: true,
      handedOff: true,
      usedItemIds: [],
      why,
      disclosureShown: true,
    }
  }

  const faq = verified.find((item) => item.collection === 'faqs') ?? verified[0]
  why.tools.push('answer_faqs')
  if (faq) why.sources.push(faq.title)
  const langNote = language === 'pcm' ? ' I go reply you for Pidgin if you prefer.' : ''
  return {
    text: `${prefix}${faq?.answer ?? "I'll check with the team so I don't guess."}${langNote}`,
    blocked: !faq,
    handedOff: !faq,
    usedItemIds: faq ? [faq.id] : [],
    why,
    disclosureShown: true,
  }
}

export function employeeWarnings(employee: Employee, knowledge: KnowledgeItem[]) {
  const warnings: string[] = []
  for (const lang of employee.languages) {
    if (lang.tier === 'C' && lang.autonomy === 'autopilot') warnings.push('tier_c_autopilot')
    if (lang.tier === 'C') warnings.push(`tier_c_${lang.code}`)
  }
  if (knowledge.some((item) => item.containsPrice && item.status !== 'verified')) warnings.push('unverified_price')
  if (employee.channels.includes('whatsapp') && employee.languages.some((l) => l.code !== 'en')) {
    warnings.push('template_language')
  }
  return [...new Set(warnings)]
}
