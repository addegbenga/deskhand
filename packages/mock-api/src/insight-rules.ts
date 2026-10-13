import {
  BANNED_PAGE_CLAIMS,
  type DailyMetric,
  type ReportCard,
  type ReportId,
  type ReportRange,
} from '@deskhand/schemas'

export const RANGE_DAYS: Record<ReportRange, number> = { '7d': 7, '30d': 30, '90d': 90 }

const CARD_MAP: Record<ReportId, { id: string; unit: ReportCard['unit']; pick: (sum: Totals) => number }[]> = {
  overview: [
    { id: 'leads', unit: 'count', pick: (t) => t.leads },
    { id: 'response', unit: 'minutes', pick: (t) => t.replies ? Math.round((t.aiReplies * 1.2 + t.humanReplies * 8) / t.replies) : 0 },
    { id: 'bookings', unit: 'count', pick: (t) => t.bookings },
    { id: 'revenue', unit: 'money', pick: (t) => t.revenue },
    { id: 'human', unit: 'count', pick: (t) => t.handoff },
  ],
  sources: [
    { id: 'whatsapp', unit: 'count', pick: (t) => t.whatsappLeads },
    { id: 'instagram', unit: 'count', pick: (t) => t.instagramLeads },
    { id: 'form', unit: 'count', pick: (t) => t.formLeads },
  ],
  speed: [
    { id: 'median', unit: 'minutes', pick: (t) => t.replies ? Math.round((t.aiReplies * 1.1 + t.humanReplies * 9) / t.replies) : 0 },
    { id: 'ai', unit: 'minutes', pick: () => 1 },
    { id: 'human', unit: 'minutes', pick: () => 9 },
  ],
  ai: [
    { id: 'containment', unit: 'percent', pick: (t) => t.replies ? Math.round((1 - t.handoff / t.replies) * 100) : 0 },
    { id: 'handoff', unit: 'count', pick: (t) => t.handoff },
    { id: 'corrections', unit: 'count', pick: (t) => t.corrections },
    { id: 'cost', unit: 'money', pick: (t) => t.cost },
  ],
  bookings: [
    { id: 'booked', unit: 'count', pick: (t) => t.bookings },
    { id: 'completed', unit: 'count', pick: (t) => t.completed },
    { id: 'noShows', unit: 'count', pick: (t) => t.noShows },
  ],
  revenue: [
    { id: 'paid', unit: 'money', pick: (t) => t.revenue },
    { id: 'deposits', unit: 'money', pick: (t) => Math.round(t.revenue * 0.4) },
  ],
  reviews: [
    { id: 'average', unit: 'rating', pick: (t) => (t.reviewsCount ? t.reviewsSum / t.reviewsCount : 0) },
    { id: 'volume', unit: 'count', pick: (t) => t.reviewsCount },
  ],
  campaigns: [
    { id: 'delivered', unit: 'count', pick: (t) => t.campaignDelivered },
    { id: 'replies', unit: 'count', pick: (t) => t.campaignReplies },
  ],
  team: [
    { id: 'replies', unit: 'count', pick: (t) => t.humanReplies },
    { id: 'bookings', unit: 'count', pick: (t) => t.bookings },
  ],
}

type Totals = Omit<DailyMetric, keyof { id: string; accountId: string; locationId: string; day: string; createdAt: string; createdBy: DailyMetric['createdBy'] }>

function emptyTotals(): Totals {
  return {
    leads: 0,
    bookings: 0,
    revenue: 0,
    replies: 0,
    aiReplies: 0,
    humanReplies: 0,
    noShows: 0,
    completed: 0,
    reviewsSum: 0,
    reviewsCount: 0,
    whatsappLeads: 0,
    instagramLeads: 0,
    formLeads: 0,
    handoff: 0,
    corrections: 0,
    cost: 0,
    campaignDelivered: 0,
    campaignReplies: 0,
  }
}

export function sumMetrics(rows: DailyMetric[]): Totals {
  return rows.reduce((acc, row) => {
    for (const key of Object.keys(acc) as (keyof Totals)[]) acc[key] += row[key]
    return acc
  }, emptyTotals())
}

export function windowRows(rows: DailyMetric[], range: ReportRange, endDay: string) {
  const days = RANGE_DAYS[range]
  const end = Date.parse(`${endDay}T00:00:00.000Z`)
  const start = end - (days - 1) * 86400000
  const prevEnd = start - 86400000
  const prevStart = prevEnd - (days - 1) * 86400000
  const inRange = (day: string, from: number, to: number) => {
    const t = Date.parse(`${day}T00:00:00.000Z`)
    return t >= from && t <= to
  }
  const current = rows.filter((row) => inRange(row.day, start, end)).sort((a, b) => a.day.localeCompare(b.day))
  const previous = rows.filter((row) => inRange(row.day, prevStart, prevEnd))
  return { current, previous }
}

export function buildReportCards(id: ReportId, current: DailyMetric[], previous: DailyMetric[], staffScale: number): ReportCard[] {
  const nowSum = sumMetrics(current)
  const prevSum = sumMetrics(previous)
  const scale = (value: number) => value * staffScale
  return CARD_MAP[id].map((card) => {
    const sparkSource = current.slice(-14)
    const spark = sparkSource.map((row) => {
      const one = sumMetrics([row])
      return scale(card.pick(one))
    })
    return {
      id: card.id,
      value: scale(card.pick(nowSum)),
      previous: scale(card.pick(prevSum)),
      unit: card.unit,
      spark,
      definitionKey: `${id}.${card.id}`,
    }
  })
}

export function pageClaimsBlocked(text: string) {
  return BANNED_PAGE_CLAIMS.test(text)
}
