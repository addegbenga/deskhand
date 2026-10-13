import { INDUSTRY_PACKS, samplePrice } from '@deskhand/config'
import type { DayHours, ImportResult, Industry, MarketCode } from '@deskhand/schemas'
import { MockHttpError } from '../http'

/** Business content found on a page. English, like the pages it pretends to read. */
const DESCRIPTIONS: Record<Industry, string> = {
  salon: 'Braids, wigs and natural hair care by a friendly team of stylists.',
  barber: 'Sharp cuts, fades and beard trims, with walk-ins welcome.',
  clinic: 'Gentle, modern dental care for the whole family.',
  real_estate: 'Helping families buy, sell and rent homes across the city.',
  bakery: 'Custom celebration cakes, cupcakes and treats, baked fresh to order.',
  restaurant: 'Home-style dishes, grills and drinks in a relaxed setting.',
  gym: 'Classes, personal training and flexible memberships.',
  school: 'Small classes and caring teachers, from early years upwards.',
  home_services: 'Reliable repairs and cleaning, with free quotes.',
  general: 'Friendly local service, by appointment.',
}

/** The scenario E business has a hand-written page so the demo import looks exactly right. */
const IFE_CAKES: ImportResult['found'] = {
  name: 'Ife Cakes',
  description: 'Custom celebration cakes, cupcakes and small chops, baked fresh in Yaba, Lagos. Delivery across the mainland.',
  address: '12 Herbert Macaulay Way, Yaba',
  city: 'Lagos',
  phone: '+234 803 412 7781',
  hours: [
    { day: 0, open: true, from: '12:00', to: '17:00' },
    { day: 1, open: false, from: '09:00', to: '19:00' },
    { day: 2, open: true, from: '09:00', to: '19:00' },
    { day: 3, open: true, from: '09:00', to: '19:00' },
    { day: 4, open: true, from: '09:00', to: '19:00' },
    { day: 5, open: true, from: '09:00', to: '19:00' },
    { day: 6, open: true, from: '09:00', to: '19:00' },
  ],
  tone: 'playful',
  services: [
    { name: 'Birthday cake (8 inch)', durationMin: 30, price: 35000 },
    { name: 'Wedding cake (2 tier)', durationMin: 60, price: 220000 },
    { name: 'Cupcakes (box of 12)', durationMin: 15, price: 18000 },
    { name: 'Small chops platter', durationMin: 15, price: 25000 },
  ],
  faqs: [
    { question: 'How much notice do you need for a custom cake?', answer: 'Three days for birthday cakes and four weeks for wedding cakes.' },
    { question: 'Do you deliver?', answer: 'Yes, across the Lagos mainland from ₦3,000 depending on distance. Island delivery on request.' },
    { question: 'Can you make eggless cakes?', answer: 'Yes, eggless and sugar-free options are available. Tell us when you order.' },
  ],
}

function titleCase(words: string[]) {
  return words
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function guessIndustry(text: string): Industry {
  const lower = text.toLowerCase()
  for (const pack of Object.values(INDUSTRY_PACKS)) {
    if (pack.keywords.some((k) => lower.includes(k.replace(/\s+/g, '')))) return pack.industry
  }
  return 'general'
}

/** "amakabraids" → "Amaka Braids", using the vertical keyword as the word break. */
function nameFrom(slug: string, industry: Industry): string {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
  if (clean.includes('-')) return titleCase(clean.split('-'))
  const keyword = INDUSTRY_PACKS[industry].keywords.map((k) => k.replace(/\s+/g, '')).find((k) => clean.includes(k))
  const at = keyword ? clean.indexOf(keyword) : -1
  return at > 0 ? titleCase([clean.slice(0, at), clean.slice(at)]) : titleCase([clean])
}

function normalize(input: string): URL {
  const trimmed = input.trim()
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^@/, 'instagram.com/')}`
  try {
    const url = new URL(withScheme)
    if (!url.hostname.includes('.')) throw new Error('no_tld')
    return url
  } catch {
    throw new MockHttpError('validation_failed', 'That link does not look right.', { fieldErrors: { url: ['invalid_link'] } })
  }
}

/**
 * Fake website, Instagram and Google Business reader (FE-DOC S1 mock).
 * Any hostname containing "broken" simulates a site we cannot reach.
 */
export function parseLink(input: string, market: MarketCode, city: string): ImportResult {
  const url = normalize(input)
  const host = url.hostname.replace(/^www\./, '')
  if (host.includes('broken') || host.includes('offline')) {
    throw new MockHttpError('validation_failed', 'We could not reach that page.', { fieldErrors: { url: ['unreachable'] } })
  }
  const source: ImportResult['source'] = host.includes('instagram.com')
    ? 'instagram'
    : /google\.|g\.page|business\.site|maps\.app/.test(host)
      ? 'google'
      : 'website'
  const handle =
    source === 'website' ? host.split('.')[0]! : (url.pathname.split('/').filter(Boolean).pop() ?? host.split('.')[0]!).replace(/^@/, '')

  if (handle.replace(/[^a-z]/gi, '').toLowerCase().includes('ifecakes')) {
    return {
      source,
      suggestedIndustry: 'bakery',
      found:
        source === 'instagram'
          ? { ...IFE_CAKES, hours: null, address: null, faqs: [], services: IFE_CAKES.services.slice(0, 2) }
          : source === 'google'
            ? { ...IFE_CAKES, services: [], faqs: [] }
            : IFE_CAKES,
    }
  }

  const industry = guessIndustry(handle)
  const name = nameFrom(handle, industry)
  const pack = INDUSTRY_PACKS[industry]
  const services = pack.services.map((s) => ({
    name: s.name,
    durationMin: s.durationMin,
    price: s.sampleUsd === 0 ? 0 : samplePrice(s.sampleUsd, market),
  }))
  const hours: DayHours[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: day !== 0, from: '09:00', to: day === 6 ? '16:00' : '18:00' }))
  const description = `${name}. ${DESCRIPTIONS[industry]}${city ? ` Based in ${city}.` : ''}`

  if (source === 'instagram') {
    return {
      source,
      suggestedIndustry: industry,
      found: { name, description, address: null, city: city || null, phone: null, hours: null, tone: 'playful', services: services.slice(0, 2), faqs: [] },
    }
  }
  if (source === 'google') {
    return {
      source,
      suggestedIndustry: industry,
      found: { name, description, address: null, city: city || null, phone: null, hours, tone: null, services: [], faqs: [] },
    }
  }
  return {
    source,
    suggestedIndustry: industry,
    found: {
      name,
      description,
      address: null,
      city: city || null,
      phone: null,
      hours,
      tone: 'warm',
      services,
      faqs: pack.faqs.slice(0, 2),
    },
  }
}
