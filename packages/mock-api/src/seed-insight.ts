import type { CreatedBy, DailyMetric, PageVersion, SitePage } from '@deskhand/schemas'
import { DAY } from './clock'
import type { ScenarioId } from './scenarios'

export function buildInsightExtras(input: {
  scenarioId: ScenarioId
  accountId: string
  locationIds: string[]
  slug: string
  business: string
  person: CreatedBy
  iso: (offset: number) => string
  empty: boolean
}) {
  const { scenarioId, accountId, locationIds, slug, business, person, iso, empty } = input
  if (empty) {
    return { dailyMetrics: [] as DailyMetric[], sitePages: [] as SitePage[], pageVersions: [] as PageVersion[] }
  }

  const dailyMetrics: DailyMetric[] = []
  for (let d = 89; d >= 0; d--) {
    const day = iso(-d * DAY).slice(0, 10)
    locationIds.forEach((locationId, loc) => {
      const wave = 89 - d
      const locN = loc === 0 ? 1 : 0.35
      const leads = Math.round((3 + wave / 12) * locN)
      dailyMetrics.push({
        id: `met_${scenarioId}_${locationId}_${day}`,
        accountId,
        locationId,
        day,
        leads,
        bookings: Math.round(leads * 0.45),
        revenue: Math.round(leads * 0.45 * 18000 * locN),
        replies: Math.round(leads * 1.4),
        aiReplies: Math.round(leads * 1.1),
        humanReplies: Math.round(leads * 0.3),
        noShows: Math.round(leads * 0.08),
        completed: Math.round(leads * 0.35),
        reviewsSum: Math.round(leads * 0.2 * 4.4),
        reviewsCount: Math.round(leads * 0.2) || 1,
        whatsappLeads: Math.round(leads * 0.55),
        instagramLeads: Math.round(leads * 0.25),
        formLeads: Math.round(leads * 0.2),
        handoff: Math.round(leads * 0.18),
        corrections: Math.round(leads * 0.04),
        cost: Math.round(leads * 42),
        campaignDelivered: Math.round(leads * 2),
        campaignReplies: Math.round(leads * 0.3),
        createdAt: iso(-d * DAY),
        createdBy: { kind: 'api' },
      })
    })
  }

  const page: SitePage = {
    id: `pg_${scenarioId}_1`,
    accountId,
    title: `${business} — bridal offer`,
    slug: `${slug}-offer`,
    status: 'published',
    template: 'salon',
    language: 'en',
    seoTitle: `${business} bridal braids`,
    seoDescription: 'Book knotless and bridal braids. Honest prices, real slots.',
    indexable: true,
    domain: null,
    visits: 640,
    conversions: 48,
    blocks: [
      { id: 'hero', type: 'hero', heading: `Bridal braids at ${business}`, body: 'Two chairs left this Saturday. Book in two minutes.', cta: 'Book a slot' },
      { id: 'services', type: 'services', heading: 'Services', body: 'Knotless, cornrows, kids styles.', cta: '' },
      { id: 'form', type: 'form', heading: 'Ask a question', body: 'We only use this to reply to you.', cta: 'Send' },
      { id: 'booking', type: 'booking', heading: 'Book', body: 'Pick a time on our booking page.', cta: 'Open booking' },
      { id: 'whatsapp', type: 'whatsapp', heading: 'Prefer chat?', body: 'Message us on WhatsApp.', cta: 'WhatsApp' },
      { id: 'footer', type: 'footer', heading: business, body: 'Lekki, Lagos', cta: '' },
    ],
    funnel: [
      { id: 's1', kind: 'landing', label: 'Landing', visits: 640, completed: 640 },
      { id: 's2', kind: 'form', label: 'Form', visits: 210, completed: 160 },
      { id: 's3', kind: 'booking', label: 'Booking', visits: 96, completed: 58 },
      { id: 's4', kind: 'payment', label: 'Deposit', visits: 58, completed: 48 },
    ],
    publishedAt: iso(-12 * DAY),
    createdAt: iso(-20 * DAY),
    createdBy: person,
  }

  const draft: SitePage = {
    ...page,
    id: `pg_${scenarioId}_draft`,
    title: 'Untitled page',
    slug: `${slug}-draft`,
    status: 'draft',
    visits: 0,
    conversions: 0,
    publishedAt: null,
    funnel: page.funnel.map((step) => ({ ...step, visits: 0, completed: 0 })),
    createdAt: iso(-2 * DAY),
  }

  const pageVersions: PageVersion[] = [
    {
      id: `pv_${scenarioId}_1`,
      accountId,
      pageId: page.id,
      number: 1,
      summary: 'First publish',
      snapshot: page,
      createdAt: iso(-12 * DAY),
      createdBy: person,
    },
  ]

  return { dailyMetrics, sitePages: [page, draft], pageVersions }
}
