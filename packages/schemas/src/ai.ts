import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema, pageOf } from './common'
import { ApprovalSchema } from './crm'
import { ChannelKindSchema, LanguageTierSchema } from './market'

export const EmployeeStatusSchema = z.enum(['draft', 'testing', 'shadow', 'live', 'paused', 'archived'])
export type EmployeeStatus = z.infer<typeof EmployeeStatusSchema>

export const EmployeeKindSchema = z.enum(['chat', 'voice'])
export type EmployeeKind = z.infer<typeof EmployeeKindSchema>

export const AutonomyLevelSchema = z.enum(['suggest', 'approve', 'autopilot'])
export type AutonomyLevel = z.infer<typeof AutonomyLevelSchema>

export const AUTONOMY_RANK: Record<AutonomyLevel, number> = { suggest: 0, approve: 1, autopilot: 2 }
export const TIER_AUTONOMY_CAP: Record<z.infer<typeof LanguageTierSchema>, AutonomyLevel> = {
  A: 'autopilot',
  B: 'approve',
  C: 'suggest',
}

export function capAutonomy(tier: z.infer<typeof LanguageTierSchema>, wanted: AutonomyLevel): AutonomyLevel {
  return AUTONOMY_RANK[wanted] <= AUTONOMY_RANK[TIER_AUTONOMY_CAP[tier]] ? wanted : TIER_AUTONOMY_CAP[tier]
}

export function autonomyAllowed(tier: z.infer<typeof LanguageTierSchema>, wanted: AutonomyLevel) {
  return AUTONOMY_RANK[wanted] <= AUTONOMY_RANK[TIER_AUTONOMY_CAP[tier]]
}

export const EmployeeToolIdSchema = z.enum(['answer_faqs', 'qualify_leads', 'book', 'update_crm', 'send_payment_link'])
export type EmployeeToolId = z.infer<typeof EmployeeToolIdSchema>

export const EmployeeToolSchema = z.object({
  id: EmployeeToolIdSchema,
  enabled: z.boolean(),
  autonomy: AutonomyLevelSchema,
})
export type EmployeeTool = z.infer<typeof EmployeeToolSchema>

export const EmployeeLanguageSchema = z.object({
  code: z.string(),
  tier: LanguageTierSchema,
  autonomy: AutonomyLevelSchema,
})
export type EmployeeLanguage = z.infer<typeof EmployeeLanguageSchema>

export const ChatTemplateSchema = z.enum(['receptionist', 'sales', 'booking', 'support', 'custom'])
export const VoiceUseCaseSchema = z.enum(['inbound', 'after_hours', 'reminders', 'callback'])
export const PhoneSourceSchema = z.enum(['buy', 'forward', 'port'])
export const PhoneStatusSchema = z.enum(['none', 'docs_needed', 'provisioning', 'porting', 'active'])

export const EmployeeSchema = BaseRecordSchema.extend({
  locationId: IdSchema.nullable(),
  kind: EmployeeKindSchema,
  name: z.string(),
  role: z.string(),
  template: z.string(),
  status: EmployeeStatusSchema,
  tone: z.enum(['formal', 'warm', 'friendly']),
  greeting: z.string(),
  signOff: z.string(),
  disclosure: z.string(),
  emoji: z.boolean(),
  languages: z.array(EmployeeLanguageSchema),
  channels: z.array(ChannelKindSchema),
  hours: z.enum(['business', 'always']),
  afterHours: z.enum(['message', 'handoff', 'voicemail']),
  collectionIds: z.array(z.string()),
  neverSay: z.array(z.string()),
  escalateTopics: z.array(z.string()),
  tools: z.array(EmployeeToolSchema),
  discountLimit: z.number().nullable(),
  handoffUserId: IdSchema.nullable(),
  quietHours: z.boolean(),
  killSwitched: z.boolean(),
  conversationsThisMonth: z.number().int().nonnegative(),
  handoffRate: z.number().nonnegative(),
  costThisMonth: z.number().nonnegative(),
  currency: z.string(),
  version: z.number().int().positive(),
  warnings: z.array(z.string()),
  voiceUseCase: VoiceUseCaseSchema.nullable(),
  voiceId: z.string().nullable(),
  recordingEnabled: z.boolean(),
  recordingNotice: z.string(),
  maxCallMinutes: z.number().int().positive(),
  transferNumber: z.string().nullable(),
  outboundAllowed: z.boolean(),
  phoneSource: PhoneSourceSchema.nullable(),
  phoneNumber: z.string().nullable(),
  phoneStatus: PhoneStatusSchema,
  pronunciation: z.string(),
})
export type Employee = z.infer<typeof EmployeeSchema>

export const EmployeeListSchema = z.array(EmployeeSchema)

export const EmployeePatchSchema = z.object({
  name: z.string().min(2).optional(),
  tone: z.enum(['formal', 'warm', 'friendly']).optional(),
  greeting: z.string().optional(),
  signOff: z.string().optional(),
  emoji: z.boolean().optional(),
  languages: z.array(EmployeeLanguageSchema).optional(),
  channels: z.array(ChannelKindSchema).optional(),
  hours: z.enum(['business', 'always']).optional(),
  afterHours: z.enum(['message', 'handoff', 'voicemail']).optional(),
  collectionIds: z.array(z.string()).optional(),
  neverSay: z.array(z.string()).optional(),
  escalateTopics: z.array(z.string()).optional(),
  tools: z.array(EmployeeToolSchema).optional(),
  discountLimit: z.number().nullable().optional(),
  handoffUserId: IdSchema.nullable().optional(),
  quietHours: z.boolean().optional(),
  voiceUseCase: VoiceUseCaseSchema.nullable().optional(),
  voiceId: z.string().nullable().optional(),
  recordingEnabled: z.boolean().optional(),
  recordingNotice: z.string().optional(),
  maxCallMinutes: z.number().int().positive().optional(),
  transferNumber: z.string().nullable().optional(),
  outboundAllowed: z.boolean().optional(),
  phoneSource: PhoneSourceSchema.nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  phoneStatus: PhoneStatusSchema.optional(),
  pronunciation: z.string().optional(),
  reason: z.string().optional(),
})
export type EmployeePatch = z.infer<typeof EmployeePatchSchema>

export const CreateEmployeeSchema = z.object({
  kind: EmployeeKindSchema,
  template: z.string(),
  name: z.string().min(2),
})

export const PublishEmployeeSchema = z.object({
  rollout: z.enum(['shadow', 'suggest', 'approve', 'autopilot']),
})

export const EmployeeVersionSchema = BaseRecordSchema.extend({
  employeeId: IdSchema,
  number: z.number().int().positive(),
  summary: z.string(),
  reason: z.string().nullable(),
  snapshot: EmployeeSchema,
})
export type EmployeeVersion = z.infer<typeof EmployeeVersionSchema>

export const KnowledgeCollectionIdSchema = z.enum([
  'profile',
  'services',
  'policies',
  'faqs',
  'locations',
  'promotions',
  'do_not_say',
])
export type KnowledgeCollectionId = z.infer<typeof KnowledgeCollectionIdSchema>

export const KnowledgeStatusSchema = z.enum(['verified', 'unverified', 'needs_review'])
export type KnowledgeStatus = z.infer<typeof KnowledgeStatusSchema>

export const KnowledgeItemSchema = BaseRecordSchema.extend({
  collection: KnowledgeCollectionIdSchema,
  title: z.string(),
  answer: z.string(),
  language: z.string(),
  locationId: IdSchema.nullable(),
  status: KnowledgeStatusSchema,
  source: z.enum(['owner', 'pack', 'import', 'training']),
  pinned: z.record(z.string(), z.string()),
  autoTranslated: z.boolean(),
  expiresAt: TimestampSchema.nullable(),
  containsPrice: z.boolean(),
})
export type KnowledgeItem = z.infer<typeof KnowledgeItemSchema>

export const KnowledgeListSchema = z.object({
  items: z.array(KnowledgeItemSchema),
  collections: z.array(
    z.object({
      id: KnowledgeCollectionIdSchema,
      coverage: z.number().min(0).max(100),
      missing: z.array(z.string()),
    }),
  ),
})

export const KnowledgeWriteSchema = z.object({
  collection: KnowledgeCollectionIdSchema,
  title: z.string().min(2),
  answer: z.string().min(2),
  language: z.string().default('en'),
  containsPrice: z.boolean().optional(),
  pinned: z.record(z.string(), z.string()).optional(),
  expiresAt: TimestampSchema.nullable().optional(),
})
export const KnowledgePatchSchema = KnowledgeWriteSchema.partial()

export const KnowledgeImportSchema = z
  .object({
    url: z.string().min(8).optional(),
    paste: z.string().min(8).optional(),
    fileName: z.string().min(1).optional(),
    collection: KnowledgeCollectionIdSchema.optional(),
  })
  .refine((value) => Boolean(value.url || value.paste || value.fileName), { message: 'Provide a URL, pasted text, or a file.' })

export const KnowledgePreviewAskSchema = z.object({
  question: z.string().min(2),
  language: z.string().optional(),
})

export const TrainingAddSchema = z.object({
  answer: z.string().min(2).optional(),
})

export const TrainingQuestionSchema = BaseRecordSchema.extend({
  topic: z.string(),
  question: z.string(),
  askedCount: z.number().int().positive(),
  draftAnswer: z.string(),
})
export type TrainingQuestion = z.infer<typeof TrainingQuestionSchema>

export const TrainingListSchema = z.array(TrainingQuestionSchema)

export const EvalSuiteSchema = z.enum(['grounding', 'handoff', 'disclosure', 'opt_out', 'injection', 'policy'])
export const EvalResultSchema = z.object({
  id: IdSchema,
  employeeId: IdSchema,
  version: z.number().int(),
  language: z.string(),
  suite: EvalSuiteSchema,
  passed: z.boolean(),
  score: z.number().min(0).max(100),
})
export type EvalResult = z.infer<typeof EvalResultSchema>
export const EvalListSchema = z.array(EvalResultSchema)

export const SandboxScenarioSchema = z.enum(['free', 'price', 'injection', 'general', 'handoff', 'closed_day'])
export const SandboxTurnSchema = z.object({
  message: z.string().min(1),
  scenario: SandboxScenarioSchema.optional(),
  language: z.string().optional(),
})
export const SandboxReplySchema = z.object({
  text: z.string(),
  blocked: z.boolean(),
  handedOff: z.boolean(),
  usedItemIds: z.array(z.string()),
  why: z.object({ sources: z.array(z.string()), rules: z.array(z.string()), tools: z.array(z.string()) }),
  disclosureShown: z.boolean(),
})
export type SandboxReply = z.infer<typeof SandboxReplySchema>
export const KnowledgePreviewSchema = SandboxReplySchema.extend({
  items: z.array(KnowledgeItemSchema.pick({ id: true, title: true, collection: true, status: true, answer: true })),
})
export type KnowledgePreview = z.infer<typeof KnowledgePreviewSchema>

export const ComplianceCheckSchema = z.object({
  id: z.string(),
  ok: z.boolean(),
  blocking: z.boolean(),
})
export const ComplianceReportSchema = z.object({
  items: z.array(ComplianceCheckSchema),
  canGoLive: z.boolean(),
})

export const ApprovalKindSchema = z.enum(['reply', 'payment_link', 'post', 'review_reply', 'bulk', 'discount'])
export type ApprovalKind = z.infer<typeof ApprovalKindSchema>

export const ApprovalActionSchema = z.object({
  body: z.string().optional(),
  reason: z.string().optional(),
})
export const BulkApprovalSchema = z.object({
  ids: z.array(IdSchema).min(1),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
})

export const TranscriptSampleSchema = BaseRecordSchema.extend({
  employeeId: IdSchema,
  conversationId: IdSchema,
  contactName: z.string(),
  excerpt: z.string(),
  flag: z.enum(['random', 'customer', 'low_confidence']),
  rating: z.enum(['good', 'needs_fix', 'harmful']).nullable(),
  notes: z.string(),
})
export type TranscriptSample = z.infer<typeof TranscriptSampleSchema>
export const TranscriptListSchema = z.array(TranscriptSampleSchema)
export const TranscriptRateSchema = z.object({
  rating: z.enum(['good', 'needs_fix', 'harmful']),
  notes: z.string().optional(),
})

export const ActivityFilterSchema = z.object({
  employeeId: z.string().optional(),
  outcome: z.string().optional(),
})

export const WizardMarketContextSchema = z.object({
  country: z.string(),
  timezone: z.string(),
  currency: z.string(),
  languages: z.array(EmployeeLanguageSchema),
  disclosure: z.string(),
  quietHours: z.string(),
  outboundVoice: z.boolean(),
})
export type WizardMarketContext = z.infer<typeof WizardMarketContextSchema>

export const AutonomyRaiseSchema = z.object({
  toolId: EmployeeToolIdSchema.optional(),
  language: z.string().optional(),
  autonomy: AutonomyLevelSchema,
  reason: z.string().min(8),
})

export const ApprovalQueueSchema = pageOf(ApprovalSchema)
