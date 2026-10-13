import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema } from './common'
import { ChannelKindSchema } from './market'
import { MessageTemplateSchema, PaymentRecordSchema, ReviewRecordSchema } from './crm'

export const RecipeGoalSchema = z.enum(['respond', 'follow_up', 'book', 'remind', 'review', 'win_back'])
export type RecipeGoal = z.infer<typeof RecipeGoalSchema>
export const RecipePackKeySchema = z.enum([
  'instant_lead',
  'noreply',
  'book_slots',
  'remind',
  'review',
  'win_back',
])
export type RecipePackKey = z.infer<typeof RecipePackKeySchema>
export const RecipeSchema = BaseRecordSchema.extend({
  packKey: RecipePackKeySchema,
  goal: RecipeGoalSchema,
  name: z.string(),
  description: z.string(),
  expected: z.string(),
  requiredConnections: z.array(z.string()),
  enabled: z.boolean(),
  enrolled: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  replied: z.number().int().nonnegative(),
  converted: z.number().int().nonnegative(),
  lastRunAt: TimestampSchema.nullable(),
  error: z.string().nullable(),
  delayHours: z.array(z.number()),
  channels: z.array(ChannelKindSchema),
  stopOnReply: z.boolean(),
  stopOnBook: z.boolean(),
  stopOnConvert: z.boolean(),
  stopOnOptOut: z.boolean(),
  onlyIfNoReply: z.boolean(),
  quietHours: z.boolean(),
  employeeId: IdSchema.nullable(),
  templateId: IdSchema.nullable(),
})
export type Recipe = z.infer<typeof RecipeSchema>
export const RecipeListSchema = z.array(RecipeSchema)
export const RecipePackSchema = z.object({
  key: RecipePackKeySchema,
  goal: RecipeGoalSchema,
  name: z.string(),
  description: z.string(),
  expected: z.string(),
  requiredConnections: z.array(z.string()),
  delayHours: z.array(z.number()),
  channels: z.array(ChannelKindSchema),
  stopOnReply: z.boolean(),
  stopOnBook: z.boolean(),
  stopOnConvert: z.boolean(),
  stopOnOptOut: z.boolean(),
  onlyIfNoReply: z.boolean(),
  quietHours: z.boolean(),
})
export type RecipePack = z.infer<typeof RecipePackSchema>
export const RecipePackListSchema = z.array(RecipePackSchema)
export const RecipeWriteSchema = z.object({
  packKey: RecipePackKeySchema,
  name: z.string().min(2).optional(),
  templateId: IdSchema.optional(),
  channels: z.array(ChannelKindSchema).min(1).optional(),
  employeeId: IdSchema.nullable().optional(),
})
export type RecipeWrite = z.infer<typeof RecipeWriteSchema>
export const RecipePatchSchema = z.object({
  enabled: z.boolean().optional(),
  delayHours: z.array(z.number()).optional(),
  channels: z.array(ChannelKindSchema).min(1).optional(),
  stopOnReply: z.boolean().optional(),
  stopOnBook: z.boolean().optional(),
  stopOnConvert: z.boolean().optional(),
  stopOnOptOut: z.boolean().optional(),
  onlyIfNoReply: z.boolean().optional(),
  quietHours: z.boolean().optional(),
  templateId: IdSchema.nullable().optional(),
  employeeId: IdSchema.nullable().optional(),
})
export const RecipeTestSchema = z.object({ contactId: IdSchema })

export const WorkflowRunSchema = BaseRecordSchema.extend({
  recipeId: IdSchema,
  contactId: IdSchema,
  contactName: z.string(),
  testMode: z.boolean(),
  stoppedReason: z.string().nullable(),
  steps: z.array(z.object({ at: TimestampSchema, label: z.string(), result: z.string() })),
})
export type WorkflowRun = z.infer<typeof WorkflowRunSchema>
export const WorkflowRunListSchema = z.array(WorkflowRunSchema)
export const RecipeTestResultSchema = z.object({
  run: WorkflowRunSchema,
  channel: ChannelKindSchema,
})

export const PlannerPostSchema = BaseRecordSchema.extend({
  platform: z.enum(['instagram', 'facebook', 'whatsapp']),
  caption: z.string(),
  status: z.enum(['draft', 'approved', 'scheduled', 'published']),
  scheduledFor: TimestampSchema.nullable(),
  likes: z.number().int().nonnegative(),
})
export type PlannerPost = z.infer<typeof PlannerPostSchema>
export const PlannerListSchema = z.array(PlannerPostSchema)
export const PlannerPatchSchema = z.object({
  caption: z.string().min(1).optional(),
  status: z.enum(['draft', 'approved', 'scheduled', 'published']).optional(),
  scheduledFor: TimestampSchema.nullable().optional(),
})

export const CampaignSchema = BaseRecordSchema.extend({
  name: z.string(),
  channel: z.enum(['whatsapp', 'email']),
  templateId: IdSchema,
  listId: IdSchema.nullable().default(null),
  status: z.enum(['draft', 'checked', 'sent']),
  audienceSize: z.number().int().nonnegative(),
  delivered: z.number().int().nonnegative(),
  replies: z.number().int().nonnegative(),
  bookings: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  optOuts: z.number().int().nonnegative(),
})
export type Campaign = z.infer<typeof CampaignSchema>
export const CampaignListSchema = z.array(CampaignSchema)
export const CampaignWriteSchema = z.object({
  name: z.string().min(2),
  channel: z.enum(['whatsapp', 'email']),
  templateId: IdSchema,
  listId: IdSchema.nullable().optional(),
})
export const CampaignCheckSchema = z.object({
  audience: z.number().int().nonnegative(),
  sendable: z.number().int().nonnegative(),
  excludedConsent: z.number().int().nonnegative(),
  excludedOptOut: z.number().int().nonnegative(),
  excludedQuietHours: z.number().int().nonnegative(),
  templateOk: z.boolean(),
  templateStatus: z.string(),
  reasons: z.array(z.object({ contactId: IdSchema, name: z.string(), reason: z.enum(['consent', 'opt_out', 'quiet_hours', 'template']) })),
  canSend: z.boolean(),
})
export type CampaignCheck = z.infer<typeof CampaignCheckSchema>

export const TrackLinkSchema = BaseRecordSchema.extend({
  label: z.string(),
  href: z.string(),
  code: z.string(),
  clicks: z.number().int().nonnegative(),
})
export type TrackLink = z.infer<typeof TrackLinkSchema>
export const TrackLinkListSchema = z.array(TrackLinkSchema)
export const TrackLinkWriteSchema = z.object({ label: z.string().min(2) })

export const PaymentLinkSchema = BaseRecordSchema.extend({
  contactId: IdSchema.nullable(),
  contactName: z.string(),
  amount: z.number().positive(),
  currency: z.string(),
  purpose: z.enum(['service', 'deposit', 'custom']),
  status: z.enum(['open', 'paid', 'expired']),
  shareUrl: z.string(),
  expiresAt: TimestampSchema,
})
export type PaymentLink = z.infer<typeof PaymentLinkSchema>
export const PaymentLinkListSchema = z.array(PaymentLinkSchema)
export const PaymentLinkWriteSchema = z.object({
  contactName: z.string().min(1),
  amount: z.number().positive(),
  purpose: z.enum(['service', 'deposit', 'custom']),
})

export const FormFieldTypeSchema = z.enum([
  'short_text',
  'long_text',
  'phone',
  'email',
  'number',
  'date',
  'dropdown',
  'multi_select',
  'checkbox',
  'yes_no',
  'rating',
  'nps',
  'csat',
  'consent',
])
export type FormFieldType = z.infer<typeof FormFieldTypeSchema>
export const FormFieldSchema = z.object({
  id: z.string(),
  type: FormFieldTypeSchema,
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()),
  showIf: z.string().nullable(),
  placeholder: z.string().default(''),
  help: z.string().default(''),
})
export type FormField = z.infer<typeof FormFieldSchema>
export const FormSuccessActionSchema = z.enum(['message', 'redirect', 'booking'])
export const FormSchema = BaseRecordSchema.extend({
  name: z.string(),
  kind: z.enum(['lead', 'quote', 'feedback', 'nps', 'survey']),
  status: z.enum(['draft', 'live']),
  fields: z.array(FormFieldSchema),
  submissions: z.number().int().nonnegative(),
  conversion: z.number().nonnegative(),
  thankYou: z.string().default('Thanks — we will be in touch shortly.'),
  redirectUrl: z.string().nullable().default(null),
  successAction: FormSuccessActionSchema.default('message'),
  allowedOrigins: z.array(z.string()).default([]),
  notifyStaff: z.boolean().default(true),
  spamProtection: z.boolean().default(true),
})
export type FormDef = z.infer<typeof FormSchema>
export const FormListSchema = z.array(FormSchema)
export const FormWriteSchema = z.object({
  name: z.string().min(2),
  kind: z.enum(['lead', 'quote', 'feedback', 'nps', 'survey']).optional(),
  status: z.enum(['draft', 'live']).optional(),
  fields: z.array(FormFieldSchema).optional(),
  thankYou: z.string().optional(),
  redirectUrl: z.string().nullable().optional(),
  successAction: FormSuccessActionSchema.optional(),
  allowedOrigins: z.array(z.string()).optional(),
  notifyStaff: z.boolean().optional(),
  spamProtection: z.boolean().optional(),
})
export type FormWrite = z.infer<typeof FormWriteSchema>
export const FormResponseSchema = BaseRecordSchema.extend({
  formId: IdSchema,
  contactName: z.string(),
  answers: z.record(z.string(), z.string()),
})
export type FormResponse = z.infer<typeof FormResponseSchema>
export const FormResponseListSchema = z.array(FormResponseSchema)

export const ReviewSettingsSchema = z.object({
  delayHours: z.number().int().nonnegative(),
  wording: z.record(z.string(), z.string()),
  reminder: z.boolean(),
  landingUrl: z.string(),
  sent: z.number().int().nonnegative(),
  opened: z.number().int().nonnegative(),
  received: z.number().int().nonnegative(),
})
export type ReviewSettings = z.infer<typeof ReviewSettingsSchema>
export const ReviewSettingsPatchSchema = z.object({
  delayHours: z.number().int().nonnegative().optional(),
  wording: z.record(z.string(), z.string()).optional(),
  reminder: z.boolean().optional(),
  landingUrl: z.string().optional(),
})
export const ReviewReplySchema = z.object({ reply: z.string().min(1) })

export const ReviewInsightsSchema = z.object({
  average: z.number(),
  volume: z.number().int(),
  unanswered: z.number().int(),
  responseHours: z.number(),
  themes: z.array(z.object({ topic: z.string(), count: z.number() })),
  staff: z.array(z.object({ name: z.string(), count: z.number(), average: z.number() })),
  services: z.array(z.object({ name: z.string(), count: z.number(), average: z.number() })),
})

export const TemplatePatchSchema = z.object({
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
  body: z.string().optional(),
})
export const TemplateWriteSchema = z.object({
  name: z.string().min(2),
  channel: z.enum(['whatsapp', 'email']),
  language: z.string().default('en'),
  body: z.string().min(4),
})

export const REWARD_PATTERN = /(?:free|gift|voucher|reward|bonus|cashback|naira back|\d+\s*%\s*off)/i

export const ReviewListSchema = z.array(ReviewRecordSchema)
export const PaymentListSchema = z.array(PaymentRecordSchema)
export const TemplateListGrowSchema = z.array(MessageTemplateSchema)
export const PaymentsOverviewSchema = z.object({
  gateway: z.enum(['healthy', 'degraded', 'broken', 'missing']),
  pendingCount: z.number().int().nonnegative(),
  paidCount: z.number().int().nonnegative(),
  paidTotal: z.number().nonnegative(),
})
