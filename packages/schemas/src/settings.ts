import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema } from './common'
import { PlanSchema } from './account'
import { RoleSchema } from './roles'

export const SettingsPageIdSchema = z.enum([
  'business',
  'locations',
  'team',
  'languages',
  'branding',
  'channels',
  'notifications',
  'billing',
  'usage',
  'security',
  'data',
  'api',
  'audit',
  'replies',
])
export type SettingsPageId = z.infer<typeof SettingsPageIdSchema>
export const SETTINGS_PAGE_IDS = SettingsPageIdSchema.options

export const WorkspaceProfileSchema = z.object({
  name: z.string().min(1),
  legalName: z.string(),
  registration: z.string(),
  description: z.string(),
  website: z.string(),
  instagram: z.string(),
  phone: z.string(),
  email: z.string(),
  privacyEmail: z.string(),
  industry: z.string(),
  pack: z.string(),
})
export type WorkspaceProfile = z.infer<typeof WorkspaceProfileSchema>
export const WorkspaceProfilePatchSchema = WorkspaceProfileSchema.partial()

export const BrandingSettingsSchema = z.object({
  logoText: z.string(),
  brandColor: z.string(),
  font: z.enum(['sans', 'serif']),
  showPoweredBy: z.boolean(),
})
export type BrandingSettings = z.infer<typeof BrandingSettingsSchema>

export const NotificationPrefsSchema = z.object({
  email: z.boolean(),
  inApp: z.boolean(),
  whatsapp: z.boolean(),
  quietStart: z.string(),
  quietEnd: z.string(),
  digestHour: z.number().int().min(0).max(23),
})
export type NotificationPrefs = z.infer<typeof NotificationPrefsSchema>

export const ConnectionGroupSchema = z.enum(['messaging', 'calendar', 'gbp', 'payments', 'social', 'contacts', 'voice'])
export const ConnectionKindSchema = z.enum([
  'whatsapp',
  'webchat',
  'email',
  'sms',
  'messenger',
  'instagram',
  'google_calendar',
  'outlook',
  'gbp',
  'payments',
  'google_contacts',
])
export type ConnectionKind = z.infer<typeof ConnectionKindSchema>
export const ConnectionStatusSchema = z.enum(['connected', 'needs_attention', 'not_connected'])
export const ConnectionHealthSchema = z.enum(['healthy', 'degraded', 'broken'])

export const ConnectionCardSchema = z.object({
  kind: ConnectionKindSchema,
  group: ConnectionGroupSchema,
  ownerModel: z.enum(['we_manage', 'you_connect']),
  status: ConnectionStatusSchema,
  health: ConnectionHealthSchema.nullable(),
  problem: z.string().nullable(),
  connectedBy: z.string().nullable(),
  scopes: z.array(z.string()),
  lastSyncAt: TimestampSchema.nullable(),
  id: IdSchema.nullable(),
})
export type ConnectionCard = z.infer<typeof ConnectionCardSchema>
export const ConnectionHubSchema = z.object({ groups: z.array(z.object({ id: ConnectionGroupSchema, cards: z.array(ConnectionCardSchema) })) })
export type ConnectionHub = z.infer<typeof ConnectionHubSchema>

export const ConnectionEventSchema = BaseRecordSchema.extend({
  kind: ConnectionKindSchema,
  action: z.enum(['connected', 'failed', 'disconnected', 'health_changed', 'tested', 'fixed']),
  actorName: z.string(),
  detail: z.string(),
})
export type ConnectionEvent = z.infer<typeof ConnectionEventSchema>
export const ConnectionEventListSchema = z.array(ConnectionEventSchema)

export const ConnectionTestSchema = z.object({ ok: z.boolean(), detail: z.string() })

export const WorkspaceMemberSchema = z.object({
  id: IdSchema,
  userId: IdSchema,
  name: z.string(),
  email: z.email(),
  role: RoleSchema,
  title: z.string(),
  locationIds: z.array(IdSchema),
  locationNames: z.array(z.string()),
  twoFactor: z.boolean(),
  calendarConnected: z.boolean(),
  bookable: z.boolean(),
  lastActiveAt: TimestampSchema.nullable(),
})
export type WorkspaceMember = z.infer<typeof WorkspaceMemberSchema>
export const WorkspaceMemberListSchema = z.array(WorkspaceMemberSchema)

export const InviteRoleSchema = z.enum(['admin', 'manager', 'staff', 'readonly'])
export type InviteRole = z.infer<typeof InviteRoleSchema>
export const InviteWriteSchema = z.object({
  emails: z.string().min(1),
  role: InviteRoleSchema,
  locationIds: z.array(IdSchema).default([]),
  note: z.string().optional(),
})
export type InviteWrite = z.infer<typeof InviteWriteSchema>
export const InviteResultSchema = z.enum(['sent', 'already_member', 'invalid', 'blocked', 'plan_limit'])
export type InviteResult = z.infer<typeof InviteResultSchema>
export const InviteAddressResultSchema = z.object({ email: z.string(), result: InviteResultSchema })
export type InviteAddressResult = z.infer<typeof InviteAddressResultSchema>
export const BulkInviteResultSchema = z.object({ results: z.array(InviteAddressResultSchema), remainingSeats: z.number().int() })
export type BulkInviteResult = z.infer<typeof BulkInviteResultSchema>

export const TeamInvitationSchema = z.object({
  id: IdSchema,
  email: z.email(),
  role: RoleSchema,
  status: z.enum(['pending', 'accepted', 'expired', 'revoked']),
  expiresAt: TimestampSchema,
  token: z.string(),
  resends: z.number().int(),
  note: z.string().nullable(),
})
export const TeamInvitationListSchema = z.array(TeamInvitationSchema)

export const JoinLinkSchema = z.object({
  id: IdSchema,
  token: z.string(),
  role: InviteRoleSchema,
  expiresAt: TimestampSchema,
  href: z.string(),
})
export type JoinLink = z.infer<typeof JoinLinkSchema>
export const JoinLinkWriteSchema = z.object({ role: InviteRoleSchema })

export const JoinRequestSchema = z.object({
  id: IdSchema,
  name: z.string(),
  email: z.email(),
  role: InviteRoleSchema,
  status: z.enum(['pending', 'approved', 'denied']),
  createdAt: TimestampSchema,
})
export const JoinRequestListSchema = z.array(JoinRequestSchema)
export type JoinRequest = z.infer<typeof JoinRequestSchema>

export const OffboardWriteSchema = z.object({
  reassignToUserId: IdSchema,
  confirmation: z.string().min(1),
})

export const UsageUnitSchema = z.enum(['seats', 'locations', 'aiEmployees', 'contacts', 'aiConversations', 'emails'])
export type UsageUnit = z.infer<typeof UsageUnitSchema>
export const UsageMeterSchema = z.object({
  unit: UsageUnitSchema,
  used: z.number(),
  included: z.number(),
  percent: z.number(),
  alert: z.enum(['ok', 'warn', 'cap']).nullable(),
})
export type UsageMeter = z.infer<typeof UsageMeterSchema>
export const CapModeSchema = z.enum(['hard', 'soft'])
export const UsageReportSchema = z.object({
  plan: PlanSchema,
  meters: z.array(UsageMeterSchema),
  projected: z.string(),
  capMode: CapModeSchema,
  spendingCeiling: z.number(),
})
export type UsageReport = z.infer<typeof UsageReportSchema>
export const UsagePatchSchema = z.object({
  capMode: CapModeSchema.optional(),
  spendingCeiling: z.number().optional(),
})

export const InvoiceSchema = z.object({
  id: IdSchema,
  number: z.string(),
  amount: z.number(),
  currency: z.string().length(3),
  status: z.enum(['paid', 'open', 'void']),
  issuedAt: TimestampSchema,
})
export type Invoice = z.infer<typeof InvoiceSchema>
export const InvoiceListSchema = z.array(InvoiceSchema)

export const BillingOverviewSchema = z.object({
  plan: PlanSchema,
  state: z.string(),
  paymentMethod: z.string(),
  taxId: z.string(),
  billingEmail: z.email(),
  nextInvoiceAt: TimestampSchema.nullable(),
  entitlements: z.array(z.object({ unit: UsageUnitSchema, included: z.number() })),
})
export type BillingOverview = z.infer<typeof BillingOverviewSchema>
export const PlanChangeSchema = z.object({ plan: PlanSchema })
export const CancelBillingSchema = z.object({
  exportChoice: z.enum(['now', 'skip']),
  confirmation: z.string(),
})

export const DeviceSessionSchema = z.object({
  id: IdSchema,
  device: z.string(),
  location: z.string(),
  current: z.boolean(),
  lastActiveAt: TimestampSchema,
})
export const DeviceSessionListSchema = z.array(DeviceSessionSchema)
export const SecuritySettingsSchema = z.object({
  twoFactor: z.boolean(),
  signInAlerts: z.boolean(),
  sessions: DeviceSessionListSchema,
  calendarConnected: z.boolean(),
})
export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>

export const DataExportWriteSchema = z.object({
  include: z.array(z.enum(['contacts', 'conversations', 'bookings', 'reviews'])).min(1),
})
export const DataExportSchema = z.object({
  filename: z.string(),
  csv: z.string(),
})
export const CloseAccountSchema = z.object({
  exportChoice: z.enum(['now', 'skip']),
  confirmation: z.string(),
})

export const AuditEventSchema = z.object({
  id: IdSchema,
  actor: z.string(),
  action: z.string(),
  target: z.string(),
  createdAt: TimestampSchema,
})
export const AuditEventListSchema = z.array(AuditEventSchema)

export const ApiKeySchema = z.object({
  id: IdSchema,
  name: z.string(),
  lastUsedAt: TimestampSchema.nullable(),
  scopes: z.array(z.string()),
})
export const ApiKeyListSchema = z.array(ApiKeySchema)
export const WebhookLogSchema = z.object({
  id: IdSchema,
  url: z.string(),
  status: z.number().int(),
  createdAt: TimestampSchema,
})
export const WebhookLogListSchema = z.array(WebhookLogSchema)
export const LanguageMarketSchema = z.object({
  market: z.string(),
  region: z.string(),
  defaultLanguage: z.string(),
  languages: z.array(z.string()),
  currency: z.string(),
  holidays: z.array(z.string()),
})
