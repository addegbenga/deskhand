import { z } from 'zod'
import { DsarTypeSchema } from './governance'
import { FormSchema } from './grow'
import { ChannelKindSchema } from './market'
import { TimestampSchema } from './common'

/** What a public surface needs to brand itself for a tenant (PRD 11.8). */
export const PublicTenantSchema = z.object({
  slug: z.string(),
  name: z.string(),
  brandColor: z.string(),
  showPoweredBy: z.boolean(),
  locale: z.string(),
  languages: z.array(z.string()),
  city: z.string(),
  timezone: z.string(),
  currency: z.string(),
  privacyHref: z.string(),
})
export type PublicTenant = z.infer<typeof PublicTenantSchema>

export const WidgetCardSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('service'), title: z.string(), priceLabel: z.string().nullable(), href: z.string() }),
  z.object({
    type: z.literal('slots'),
    title: z.string(),
    slots: z.array(z.object({ label: z.string(), startsAt: z.string() })),
    href: z.string(),
  }),
  z.object({ type: z.literal('payment'), title: z.string(), amountLabel: z.string(), href: z.string() }),
  z.object({ type: z.literal('location'), title: z.string(), address: z.string() }),
])
export type WidgetCard = z.infer<typeof WidgetCardSchema>

export const WidgetChatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['visitor', 'ai', 'system']),
  body: z.string(),
  at: TimestampSchema,
  cards: z.array(WidgetCardSchema),
  disclosure: z.boolean(),
})
export type WidgetChatMessage = z.infer<typeof WidgetChatMessageSchema>

export const WidgetConfigSchema = PublicTenantSchema.extend({
  employeeName: z.string(),
  greeting: z.string(),
  suggested: z.array(z.string()),
  afterHours: z.boolean(),
  offlineMessage: z.string(),
  whatsappHref: z.string(),
  bookingHref: z.string(),
  requireConsent: z.boolean(),
  storedNotice: z.string(),
  aiEnabled: z.boolean(),
})
export type WidgetConfig = z.infer<typeof WidgetConfigSchema>

export const WidgetSessionSchema = z.object({
  visitorId: z.string(),
  contactId: z.string().nullable(),
  consented: z.boolean(),
  identified: z.boolean(),
  messages: z.array(WidgetChatMessageSchema),
})
export type WidgetSession = z.infer<typeof WidgetSessionSchema>

export const WidgetBootstrapSchema = z.object({
  config: WidgetConfigSchema,
  session: WidgetSessionSchema,
})
export type WidgetBootstrap = z.infer<typeof WidgetBootstrapSchema>

export const WidgetConsentSchema = z.object({ visitorId: z.string(), granted: z.boolean() })
export const WidgetIdentifySchema = z.object({
  visitorId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(6),
})
export const WidgetMessageWriteSchema = z.object({ visitorId: z.string(), body: z.string().min(1).max(2000) })

export const PublicFormPageSchema = PublicTenantSchema.extend({
  form: FormSchema,
})
export type PublicFormPage = z.infer<typeof PublicFormPageSchema>

export const PublicFormSubmitSchema = z.object({
  answers: z.record(z.string(), z.string()),
  honeypot: z.string().optional(),
})
export const PublicFormResultSchema = z.object({
  ok: z.boolean(),
  contactId: z.string().nullable(),
})

export const PublicPaymentPageSchema = PublicTenantSchema.extend({
  paymentId: z.string(),
  amount: z.number(),
  currency: z.string(),
  purpose: z.string(),
  contactName: z.string(),
  status: z.enum(['open', 'paid', 'expired']),
  expiresAt: TimestampSchema,
})
export type PublicPaymentPage = z.infer<typeof PublicPaymentPageSchema>
export const PublicPaySchema = z.object({ method: z.enum(['card', 'transfer']).default('card') })
export const PublicPayReceiptSchema = z.object({
  status: z.literal('paid'),
  receipt: z.string(),
})

export const PublicReviewLandingSchema = PublicTenantSchema.extend({
  locationName: z.string(),
  googleHref: z.string(),
})
export type PublicReviewLanding = z.infer<typeof PublicReviewLandingSchema>

export const PublicHubButtonSchema = z.object({
  id: z.enum(['book', 'whatsapp', 'call', 'directions', 'reviews', 'menu']),
  href: z.string(),
})
export const PublicLinkHubSchema = PublicTenantSchema.extend({
  phone: z.string().nullable(),
  buttons: z.array(PublicHubButtonSchema),
})
export type PublicLinkHub = z.infer<typeof PublicLinkHubSchema>

export const PublicLinkResolveSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('hub'), hub: PublicLinkHubSchema }),
  z.object({ kind: z.literal('track'), href: z.string(), label: z.string() }),
])
export type PublicLinkResolve = z.infer<typeof PublicLinkResolveSchema>

export const PreferenceToggleSchema = z.object({
  channel: ChannelKindSchema,
  purpose: z.string(),
  granted: z.boolean(),
})
export const PreferenceCenterSchema = PublicTenantSchema.extend({
  contactName: z.string(),
  token: z.string(),
  optedOut: z.boolean(),
  channels: z.array(PreferenceToggleSchema),
})
export type PreferenceCenter = z.infer<typeof PreferenceCenterSchema>
export const PreferencePatchSchema = z.object({
  channel: ChannelKindSchema.optional(),
  granted: z.boolean().optional(),
  unsubscribeAll: z.boolean().optional(),
})

export const PrivacyPageSchema = PublicTenantSchema.extend({
  legalName: z.string(),
  privacyEmail: z.string(),
})
export type PrivacyPage = z.infer<typeof PrivacyPageSchema>
export const PrivacySubmitSchema = z.object({
  type: DsarTypeSchema,
  name: z.string().min(2),
  email: z.email(),
  honeypot: z.string().optional(),
})
export const PrivacySubmitResultSchema = z.object({
  requestId: z.string(),
  verifyRequired: z.boolean(),
})
export const PrivacyVerifySchema = z.object({
  requestId: z.string(),
  code: z.string().min(4),
})
export const PrivacyVerifyResultSchema = z.object({ verified: z.boolean() })
