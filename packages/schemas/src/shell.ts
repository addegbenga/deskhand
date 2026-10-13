import { z } from 'zod'
import { IdSchema, TimestampSchema } from './common'
import { ContactSchema } from './crm'
import { CapabilitySchema } from './roles'

/** Notification kinds (PRD 28.4). Copy is rendered from i18n keys, never stored. */
export const NotificationKindSchema = z.enum([
  'approval_waiting',
  'needs_human',
  'booking_new',
  'booking_cancelled',
  'payment_received',
  'review_negative',
  'connection_broken',
  'template_status',
  'usage_threshold',
  'compliance_alert',
  'weekly_digest',
  'member_joined',
])
export type NotificationKind = z.infer<typeof NotificationKindSchema>

export const NotificationSchema = z.object({
  id: IdSchema,
  accountId: IdSchema,
  kind: NotificationKindSchema,
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  href: z.string(),
  read: z.boolean(),
  createdAt: TimestampSchema,
})
export type Notification = z.infer<typeof NotificationSchema>

export const NavSummarySchema = z.object({
  unreadConversations: z.number().int().nonnegative(),
  approvalsWaiting: z.number().int().nonnegative(),
  unreadNotifications: z.number().int().nonnegative(),
})
export type NavSummary = z.infer<typeof NavSummarySchema>

/** Global banners (PRD 28.2): one cause, one fix button. */
export const BannerSchema = z.object({
  id: z.string(),
  kind: z.enum([
    'trial',
    'trial_expired',
    'past_due',
    'suspended',
    'paused',
    'cancelled',
    'connection_broken',
    'template_rejected',
    'compliance_blocking',
    'ai_paused',
  ]),
  severity: z.enum(['info', 'attention', 'danger']),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  fixHref: z.string().nullable(),
  /** Who can use the fix button; others see the banner without it. */
  fixCapability: CapabilitySchema.nullable(),
})
export type Banner = z.infer<typeof BannerSchema>

export const SearchResultSchema = z.object({
  contacts: z.array(ContactSchema),
})
export type SearchResult = z.infer<typeof SearchResultSchema>
