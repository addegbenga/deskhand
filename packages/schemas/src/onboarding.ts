import { z } from 'zod'
import { MilestoneSchema } from './account'
import { IndustrySchema } from './auth'
import { IdSchema, TimestampSchema } from './common'
import { ChannelKindSchema } from './market'

/** Onboarding steps 2 to 9 (PRD 6.1). Step 1 is sign-up. */
export const OnboardingStepSchema = z.enum([
  'profile',
  'goals',
  'knowledge',
  'channels',
  'services',
  'employee',
  'compliance',
  'launch',
])
export type OnboardingStep = z.infer<typeof OnboardingStepSchema>
export const ONBOARDING_STEPS = OnboardingStepSchema.options

export const ToneSchema = z.enum(['warm', 'professional', 'playful'])
export type Tone = z.infer<typeof ToneSchema>

export const DayHoursSchema = z.object({
  day: z.number().int().min(0).max(6),
  open: z.boolean(),
  from: z.string().regex(/^\d{2}:\d{2}$/),
  to: z.string().regex(/^\d{2}:\d{2}$/),
})
export type DayHours = z.infer<typeof DayHoursSchema>

export const KnowledgeSourceSchema = z.enum(['pack', 'import', 'owner'])

export const BusinessProfileSchema = z.object({
  name: z.string().trim().min(2),
  industry: IndustrySchema,
  link: z.string(),
  description: z.string(),
  descriptionSource: KnowledgeSourceSchema.nullable(),
  address: z.string(),
  city: z.string(),
  phone: z.string(),
  timezone: z.string(),
  currency: z.string().length(3),
  languages: z.array(z.string()).min(1),
  hours: z.array(DayHoursSchema).length(7),
  tone: ToneSchema,
})
export type BusinessProfile = z.infer<typeof BusinessProfileSchema>

export const GoalSchema = z.enum(['reply_faster', 'more_bookings', 'collect_reviews', 'run_promotions'])
export type Goal = z.infer<typeof GoalSchema>

export const ServiceItemSchema = z.object({
  id: IdSchema,
  name: z.string().trim().min(1),
  durationMin: z.number().int().positive(),
  /** Null until the owner sets it; the AI never quotes a missing or unconfirmed price (FR-IP.4). */
  price: z.number().nonnegative().nullable(),
  source: KnowledgeSourceSchema,
  verified: z.boolean(),
})
export type ServiceItem = z.infer<typeof ServiceItemSchema>

export const FaqItemSchema = z.object({
  id: IdSchema,
  question: z.string().trim().min(1),
  answer: z.string(),
  source: KnowledgeSourceSchema,
  verified: z.boolean(),
})
export type FaqItem = z.infer<typeof FaqItemSchema>

/** Guided interview topics (PRD 6.1 step 4). Services and FAQs have their own editors. */
export const InterviewTopicSchema = z.enum([
  'location',
  'booking',
  'cancellation',
  'payment',
  'delivery',
  'never_promise',
  'handoff',
])
export type InterviewTopic = z.infer<typeof InterviewTopicSchema>

export const KnowledgeSchema = z.object({
  services: z.array(ServiceItemSchema),
  faqs: z.array(FaqItemSchema),
  answers: z.partialRecord(InterviewTopicSchema, z.string()),
  packId: z.string().nullable(),
})
export type Knowledge = z.infer<typeof KnowledgeSchema>

export const TemplateStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected'])

export const WhatsAppTemplateSchema = z.object({
  name: z.string(),
  category: z.enum(['utility', 'marketing']),
  status: TemplateStatusSchema,
  submittedAt: TimestampSchema,
})
export type WhatsAppTemplate = z.infer<typeof WhatsAppTemplateSchema>

export const DnsRecordSchema = z.object({
  type: z.enum(['TXT', 'CNAME', 'MX']),
  host: z.string(),
  value: z.string(),
  purpose: z.enum(['spf', 'dkim', 'dmarc', 'return_path']),
  status: z.enum(['pending', 'verified']),
})
export type DnsRecord = z.infer<typeof DnsRecordSchema>

export const ChannelSetupSchema = z.object({
  selected: z.array(ChannelKindSchema),
  whatsapp: z
    .object({
      number: z.string(),
      displayName: z.string(),
      templates: z.array(WhatsAppTemplateSchema),
      connectedAt: TimestampSchema,
    })
    .nullable(),
  email: z
    .object({
      mode: z.enum(['managed', 'domain']),
      address: z.string(),
      domain: z.string().nullable(),
      records: z.array(DnsRecordSchema),
      verifyAttempts: z.number().int().nonnegative(),
      connectedAt: TimestampSchema.nullable(),
    })
    .nullable(),
  webchat: z.object({ placement: z.enum(['booking_page', 'website']), connectedAt: TimestampSchema }).nullable(),
  messenger: z.object({ page: z.string(), connectedAt: TimestampSchema }).nullable(),
  instagram: z.object({ handle: z.string(), connectedAt: TimestampSchema }).nullable(),
  sms: z.object({ sender: z.string(), connectedAt: TimestampSchema }).nullable(),
})
export type ChannelSetup = z.infer<typeof ChannelSetupSchema>

export const CalendarSetupSchema = z.object({
  provider: z.enum(['google', 'outlook']).nullable(),
  account: z.string().nullable(),
  deferred: z.boolean(),
  staff: z.array(z.object({ id: IdSchema, name: z.string().trim().min(1) })),
})
export type CalendarSetup = z.infer<typeof CalendarSetupSchema>

export const EmployeeChoiceSchema = z.object({
  mode: z.enum(['ai', 'manual']).nullable(),
  name: z.string(),
  tone: ToneSchema,
})
export type EmployeeChoice = z.infer<typeof EmployeeChoiceSchema>

export const ComplianceSetupSchema = z.object({
  legalName: z.string(),
  registeredAddress: z.string(),
  aiDisclosure: z.boolean(),
  disclosureText: z.string(),
  consentText: z.string(),
  consentConfirmed: z.boolean(),
  privacyPolicy: z.object({ kind: z.enum(['link', 'generated']), url: z.string() }).nullable(),
  termsAcceptedAt: TimestampSchema.nullable(),
  dpaAcceptedAt: TimestampSchema.nullable(),
  termsVersion: z.string(),
  dpaVersion: z.string(),
})
export type ComplianceSetup = z.infer<typeof ComplianceSetupSchema>

/** Scripted sandbox checks; the last three are required before go-live (PRD 6.2). */
export const SandboxScriptSchema = z.enum([
  'price',
  'booking',
  'hours',
  'location',
  'cancellation',
  'discount',
  'language',
  'unknown_price',
  'angry',
  'off_topic',
])
export type SandboxScript = z.infer<typeof SandboxScriptSchema>
export const REQUIRED_SANDBOX_SCRIPTS: SandboxScript[] = ['unknown_price', 'angry', 'off_topic']

export const SandboxReplyKindSchema = z.enum(['answer', 'handoff', 'refusal', 'booking_offer'])

export const SandboxSourceSchema = z.object({
  kind: z.enum(['service', 'faq', 'hours', 'answer', 'rule']),
  label: z.string(),
})

export const SandboxRunSchema = z.object({
  script: SandboxScriptSchema,
  customer: z.string(),
  reply: z.string(),
  replyKind: SandboxReplyKindSchema,
  sources: z.array(SandboxSourceSchema),
  verdict: z.enum(['right', 'wrong']).nullable(),
  ranAt: TimestampSchema,
})
export type SandboxRun = z.infer<typeof SandboxRunSchema>

export const SandboxChatReplySchema = SandboxRunSchema.omit({ script: true, verdict: true })
export type SandboxChatReply = z.infer<typeof SandboxChatReplySchema>

export const LaunchSetupSchema = z.object({
  sandbox: z.array(SandboxRunSchema),
  testMessage: z.object({ channel: ChannelKindSchema, to: z.string(), sentAt: TimestampSchema }).nullable(),
  handoff: z
    .object({ userId: IdSchema, channel: z.enum(['email', 'whatsapp', 'in_app']), confirmedAt: TimestampSchema.nullable() })
    .nullable(),
})
export type LaunchSetup = z.infer<typeof LaunchSetupSchema>

export const OnboardingStateSchema = z.object({
  accountId: IdSchema,
  currentStep: OnboardingStepSchema,
  completedSteps: z.array(OnboardingStepSchema),
  skippedSteps: z.array(OnboardingStepSchema),
  profile: BusinessProfileSchema,
  goals: z.array(GoalSchema),
  knowledge: KnowledgeSchema,
  channels: ChannelSetupSchema,
  calendar: CalendarSetupSchema,
  employee: EmployeeChoiceSchema,
  compliance: ComplianceSetupSchema,
  launch: LaunchSetupSchema,
  milestoneAt: z.partialRecord(MilestoneSchema, TimestampSchema),
  startedAt: TimestampSchema,
  updatedAt: TimestampSchema,
  liveAt: TimestampSchema.nullable(),
})
export type OnboardingState = z.infer<typeof OnboardingStateSchema>

/** Go-live gates (PRD 6.2). Manual only accounts skip the AI gates. */
export const GateIdSchema = z.enum(['channel', 'templates', 'knowledge', 'compliance', 'sandbox', 'handoff'])
export type GateId = z.infer<typeof GateIdSchema>

export const GateSchema = z.object({
  id: GateIdSchema,
  status: z.enum(['done', 'blocking', 'not_needed']),
  step: OnboardingStepSchema,
  /** Translation keys for what is still missing, with params. */
  missing: z.array(z.object({ key: z.string(), params: z.record(z.string(), z.union([z.string(), z.number()])) })),
})
export type Gate = z.infer<typeof GateSchema>

/** 'What the AI knows' preview (PRD 6.1 step 4). */
export const KnowledgeReportSchema = z.object({
  servicesTotal: z.number().int(),
  servicesReady: z.number().int(),
  faqsReady: z.number().int(),
  hoursSet: z.boolean(),
  locationSet: z.boolean(),
  answered: z.array(InterviewTopicSchema),
  gaps: z.array(z.string()),
})
export type KnowledgeReport = z.infer<typeof KnowledgeReportSchema>

export const OnboardingViewSchema = z.object({
  state: OnboardingStateSchema,
  gates: z.array(GateSchema),
  knowledge: KnowledgeReportSchema,
  newMilestones: z.array(MilestoneSchema),
  bookingPageHref: z.string(),
  /** Suggested compliance wording for the account's market, used until the owner edits it. */
  wording: z.object({ disclosure: z.string(), consent: z.string(), privacyLaw: z.string() }),
  team: z.array(z.object({ id: IdSchema, name: z.string(), email: z.string(), phone: z.string().nullable() })),
})
export type OnboardingView = z.infer<typeof OnboardingViewSchema>

export const StepSaveSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  complete: z.boolean().optional(),
  skip: z.boolean().optional(),
})

export const ImportRequestSchema = z.object({ url: z.string().trim().min(3) })

export const ImportResultSchema = z.object({
  source: z.enum(['website', 'instagram', 'google']),
  found: z.object({
    name: z.string().nullable(),
    description: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    phone: z.string().nullable(),
    hours: z.array(DayHoursSchema).nullable(),
    tone: ToneSchema.nullable(),
    services: z.array(ServiceItemSchema.pick({ name: true, durationMin: true, price: true })),
    faqs: z.array(FaqItemSchema.pick({ question: true, answer: true })),
  }),
  suggestedIndustry: IndustrySchema,
})
export type ImportResult = z.infer<typeof ImportResultSchema>

export const WhatsAppConnectSchema = z.object({
  businessPortfolio: z.string().trim().min(2),
  number: z.string().trim().min(7),
  displayName: z.string().trim().min(2),
})

export const EmailDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i),
  address: z.string().trim().min(1),
})

export const SimpleConnectSchema = z.object({ value: z.string().trim().min(1) })

export const CalendarConnectSchema = z.object({ provider: z.enum(['google', 'outlook']), account: z.email() })

export const SandboxRunRequestSchema = z.object({ scripts: z.array(SandboxScriptSchema).min(1) })
export const SandboxVerdictSchema = z.object({ verdict: z.enum(['right', 'wrong']) })
export const SandboxChatSchema = z.object({ message: z.string().trim().min(1) })

export const TestMessageSchema = z.object({ channel: ChannelKindSchema, to: z.string().trim().min(3) })

export const HandoffSchema = z.object({ userId: IdSchema, channel: z.enum(['email', 'whatsapp', 'in_app']) })
