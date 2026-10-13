import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema } from './common'

export const ReportIdSchema = z.enum([
  'overview',
  'sources',
  'speed',
  'ai',
  'bookings',
  'revenue',
  'reviews',
  'campaigns',
  'team',
])
export type ReportId = z.infer<typeof ReportIdSchema>
export const REPORT_IDS = ReportIdSchema.options

export const ReportRangeSchema = z.enum(['7d', '30d', '90d'])
export type ReportRange = z.infer<typeof ReportRangeSchema>

export const ReportCardSchema = z.object({
  id: z.string(),
  value: z.number(),
  previous: z.number(),
  unit: z.enum(['count', 'money', 'minutes', 'percent', 'rating']),
  spark: z.array(z.number()),
  definitionKey: z.string(),
})
export type ReportCard = z.infer<typeof ReportCardSchema>

export const ReportViewSchema = z.object({
  id: ReportIdSchema,
  range: ReportRangeSchema,
  locationId: z.string().nullable(),
  generatedAt: TimestampSchema,
  freshnessMinutes: z.number().int().nonnegative(),
  cards: z.array(ReportCardSchema),
})
export type ReportView = z.infer<typeof ReportViewSchema>

export const ReportExportSchema = z.object({
  filename: z.string(),
  csv: z.string(),
})

export const DigestSettingsSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(['email', 'whatsapp']),
  cadence: z.enum(['weekly', 'monthly']),
})
export type DigestSettings = z.infer<typeof DigestSettingsSchema>
export const DigestPatchSchema = DigestSettingsSchema.partial()

export const DailyMetricSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  day: z.string(),
  leads: z.number(),
  bookings: z.number(),
  revenue: z.number(),
  replies: z.number(),
  aiReplies: z.number(),
  humanReplies: z.number(),
  noShows: z.number(),
  completed: z.number(),
  reviewsSum: z.number(),
  reviewsCount: z.number(),
  whatsappLeads: z.number(),
  instagramLeads: z.number(),
  formLeads: z.number(),
  handoff: z.number(),
  corrections: z.number(),
  cost: z.number(),
  campaignDelivered: z.number(),
  campaignReplies: z.number(),
})
export type DailyMetric = z.infer<typeof DailyMetricSchema>

export const PageBlockTypeSchema = z.enum([
  'hero',
  'text',
  'services',
  'testimonials',
  'faq',
  'form',
  'booking',
  'whatsapp',
  'footer',
])
export const PageBlockSchema = z.object({
  id: z.string(),
  type: PageBlockTypeSchema,
  heading: z.string(),
  body: z.string(),
  cta: z.string(),
})
export type PageBlock = z.infer<typeof PageBlockSchema>

export const FunnelStepSchema = z.object({
  id: z.string(),
  kind: z.enum(['landing', 'form', 'thank_you', 'booking', 'payment']),
  label: z.string(),
  visits: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
})
export type FunnelStep = z.infer<typeof FunnelStepSchema>

export const SitePageSchema = BaseRecordSchema.extend({
  title: z.string(),
  slug: z.string(),
  status: z.enum(['draft', 'published']),
  template: z.enum(['salon', 'blank']),
  language: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  indexable: z.boolean(),
  domain: z.string().nullable(),
  visits: z.number().int().nonnegative(),
  conversions: z.number().int().nonnegative(),
  blocks: z.array(PageBlockSchema),
  funnel: z.array(FunnelStepSchema),
  publishedAt: TimestampSchema.nullable(),
})
export type SitePage = z.infer<typeof SitePageSchema>
export const SitePageListSchema = z.array(SitePageSchema)
export const SitePageWriteSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z.string().min(2).optional(),
  template: z.enum(['salon', 'blank']).optional(),
  prompt: z.string().optional(),
  language: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  indexable: z.boolean().optional(),
  domain: z.string().nullable().optional(),
  blocks: z.array(PageBlockSchema).optional(),
})
export const PageVersionSchema = BaseRecordSchema.extend({
  pageId: IdSchema,
  number: z.number().int().positive(),
  summary: z.string(),
  snapshot: SitePageSchema,
})
export type PageVersion = z.infer<typeof PageVersionSchema>
export const PageVersionListSchema = z.array(PageVersionSchema)

export const PublishPageSchema = z.object({
  seoTitle: z.string().min(1),
  seoDescription: z.string().min(1),
  indexable: z.boolean(),
  domain: z.string().nullable().optional(),
})

export const PublicLandingSchema = z.object({
  page: SitePageSchema,
  business: z.string(),
  brandColor: z.string(),
  showPoweredBy: z.boolean(),
  bookingSlug: z.string(),
  privacyHref: z.string(),
  languages: z.array(z.string()),
  city: z.string(),
  formId: z.string().nullable(),
  whatsappHref: z.string(),
})
export type PublicLanding = z.infer<typeof PublicLandingSchema>

export const BANNED_PAGE_CLAIMS = /(?:guaranteed|miracle|cure|cheapest|100%\s*safe)/i
