import { z } from 'zod'

export const MarketCodeSchema = z.enum(['NG', 'GH', 'KE', 'ZA', 'UK', 'EU', 'US'])
export type MarketCode = z.infer<typeof MarketCodeSchema>

export const LanguageTierSchema = z.enum(['A', 'B', 'C'])
export type LanguageTier = z.infer<typeof LanguageTierSchema>

export const ChannelKindSchema = z.enum([
  'whatsapp',
  'webchat',
  'email',
  'sms',
  'messenger',
  'instagram',
  'voice',
])
export type ChannelKind = z.infer<typeof ChannelKindSchema>

export const DataRegionSchema = z.enum(['africa', 'eu', 'us'])
export type DataRegion = z.infer<typeof DataRegionSchema>

/** Subset of the market pack schema (PRD 9.1, 32.1) needed by the S0 foundation. */
export const MarketPackSchema = z.object({
  code: MarketCodeSchema,
  status: z.enum(['disabled', 'pilot', 'live']),
  version: z.string(),
  locale: z.string(),
  currency: z.string().length(3),
  defaultTimezone: z.string(),
  phoneCountryCode: z.string(),
  weekStartsOn: z.union([z.literal(0), z.literal(1), z.literal(6)]),
  hourCycle: z.enum(['h12', 'h23']),
  defaultRegion: DataRegionSchema,
  allowedRegions: z.array(DataRegionSchema),
  conversationLanguages: z.array(z.object({ code: z.string(), tier: LanguageTierSchema })),
  channels: z.record(ChannelKindSchema, z.boolean()),
  paymentGateways: z.array(z.string()),
  complianceProfile: z.object({
    aiDisclosureRequired: z.boolean(),
    smsConsentStrict: z.boolean(),
    quietHours: z.object({ start: z.string(), end: z.string() }).nullable(),
    dsrDays: z.number().int().positive(),
    allPartyConsent: z.boolean(),
    marketingOptInRequired: z.boolean(),
    ownerMustRegister: z.boolean(),
    regulator: z.string(),
  }),
})
export type MarketPack = z.infer<typeof MarketPackSchema>
