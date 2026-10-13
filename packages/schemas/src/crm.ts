import { z } from 'zod'
import { BaseRecordSchema, CreatedBySchema, IdSchema, TimestampSchema, pageOf } from './common'
import { ChannelKindSchema } from './market'

export const ConsentStatusSchema = z.enum(['granted', 'withdrawn', 'missing'])
export type ConsentStatus = z.infer<typeof ConsentStatusSchema>

export const ContactConsentSchema = z.object({
  channel: ChannelKindSchema,
  status: ConsentStatusSchema,
  source: z.enum(['signup', 'import', 'inbox', 'form', 'booking_page', 'preference_center', 'widget']),
  wordingVersion: z.string(),
  recordedAt: TimestampSchema,
})
export type ContactConsent = z.infer<typeof ContactConsentSchema>

export const CustomFieldTypeSchema = z.enum(['text', 'number', 'date', 'dropdown', 'boolean'])
export const CustomFieldValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()])

export const ContactSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  tags: z.array(z.string()),
  language: z.string(),
  assignedUserId: IdSchema.nullable(),
  stage: z.string(),
  value: z.number().nullable(),
  sourceLabel: z.enum(['whatsapp', 'webchat', 'email', 'sms', 'instagram', 'form', 'booking_page', 'import', 'manual']),
  customFields: z.record(z.string(), CustomFieldValueSchema),
  consents: z.array(ContactConsentSchema),
  optedOut: z.boolean(),
  companyId: IdSchema.nullable().default(null),
})
export type Contact = z.infer<typeof ContactSchema>

export const ContactWriteSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().nullable().optional(),
  email: z.union([z.email(), z.literal(''), z.null()]).optional(),
  tags: z.array(z.string()).optional(),
  language: z.string().optional(),
  assignedUserId: IdSchema.nullable().optional(),
  locationId: IdSchema.optional(),
  stage: z.string().optional(),
  value: z.number().nullable().optional(),
  customFields: z.record(z.string(), CustomFieldValueSchema).optional(),
  companyId: IdSchema.nullable().optional(),
})
export type ContactWrite = z.infer<typeof ContactWriteSchema>

export const ContactConsentWriteSchema = z.object({
  channel: ChannelKindSchema,
  status: z.enum(['granted']).default('granted'),
})
export type ContactConsentWrite = z.infer<typeof ContactConsentWriteSchema>

export const ConversationKindSchema = z.enum(['chat', 'call'])
export const ConversationStatusSchema = z.enum(['open', 'needs_human', 'ai_handled', 'snoozed', 'closed'])
export const InboxViewSchema = z.enum([
  'all',
  'mine',
  'unassigned',
  'needs_human',
  'ai_handled',
  'waiting',
  'snoozed',
  'closed',
])
export type InboxView = z.infer<typeof InboxViewSchema>
export const AiControlSchema = z.enum(['ai', 'human'])
export const MessageDirectionSchema = z.enum(['inbound', 'outbound'])

export const WhyThisSchema = z.object({
  sources: z.array(z.string()),
  rules: z.array(z.string()),
  tools: z.array(z.string()),
})
export type WhyThis = z.infer<typeof WhyThisSchema>

export const SuggestedDraftSchema = z.object({
  body: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  employeeName: z.string(),
  language: z.string(),
  why: WhyThisSchema,
})
export type SuggestedDraft = z.infer<typeof SuggestedDraftSchema>

export const ConversationSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  contactId: IdSchema,
  channel: ChannelKindSchema,
  kind: ConversationKindSchema,
  status: ConversationStatusSchema,
  unreadCount: z.number().int().nonnegative(),
  assignedUserId: IdSchema.nullable(),
  lastMessageAt: TimestampSchema,
  lastMessagePreview: z.string(),
  lastInboundAt: TimestampSchema,
  lastDirection: MessageDirectionSchema,
  language: z.string(),
  aiControl: AiControlSchema,
  snoozedUntil: TimestampSchema.nullable(),
  tags: z.array(z.string()),
  draft: SuggestedDraftSchema.nullable(),
  recordingNotice: z.boolean(),
  lockedByName: z.string().nullable(),
})
export type Conversation = z.infer<typeof ConversationSchema>

export const ConversationListItemSchema = ConversationSchema.extend({
  contactName: z.string(),
  assignedName: z.string().default(''),
  waitMinutes: z.number().int().nonnegative(),
  windowOpen: z.boolean(),
})
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>

/** Approvals queue (PRD 29.9). */
export const ApprovalSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  conversationId: IdSchema.nullable(),
  employeeId: IdSchema.nullable(),
  employeeName: z.string(),
  kind: z.enum(['reply', 'payment_link', 'post', 'review_reply', 'bulk', 'discount']),
  status: z.enum(['pending', 'approved', 'rejected', 'snoozed']),
  confidence: z.enum(['high', 'medium', 'low']),
  contactName: z.string(),
  draft: z.string(),
  reason: z.string(),
  channel: ChannelKindSchema.optional(),
  snoozedUntil: TimestampSchema.nullable(),
  rejectReason: z.string().nullable(),
})
export type Approval = z.infer<typeof ApprovalSchema>

export const MessageKindSchema = z.enum(['inbound', 'outbound', 'note', 'system'])
export const AuthorKindSchema = z.enum(['contact', 'person', 'ai_employee', 'system'])
export const DeliveryStatusSchema = z.enum(['pending', 'sent', 'delivered', 'read', 'failed'])
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>

export const MessageAttachmentSchema = z.object({
  name: z.string(),
  type: z.enum(['image', 'file', 'audio']),
})

export const MessageSchema = BaseRecordSchema.extend({
  conversationId: IdSchema,
  kind: MessageKindSchema,
  authorKind: AuthorKindSchema,
  authorName: z.string(),
  channel: ChannelKindSchema,
  body: z.string(),
  deliveryStatus: DeliveryStatusSchema.nullable(),
  attachment: MessageAttachmentSchema.nullable(),
  why: WhyThisSchema.nullable(),
  scheduledFor: TimestampSchema.nullable(),
  rating: z.enum(['good', 'bad']).nullable(),
  language: z.string(),
  transcript: z.string().nullable(),
  summary: z.string().nullable(),
})
export type Message = z.infer<typeof MessageSchema>

export const SendBlockReasonSchema = z.enum(['opted_out', 'consent_missing', 'window_closed', 'channel_down', 'readonly'])
export type SendBlockReason = z.infer<typeof SendBlockReasonSchema>

export const SendBlockSchema = z.object({
  reason: SendBlockReasonSchema,
})

export const WindowStateSchema = z.object({
  open: z.boolean(),
  closesAt: TimestampSchema.nullable(),
})

export const ConversationThreadSchema = z.object({
  conversation: ConversationSchema,
  contact: ContactSchema,
  messages: z.array(MessageSchema),
  window: WindowStateSchema,
  sendBlock: SendBlockSchema.nullable(),
  othersViewing: z.array(z.string()),
  nextAction: z.string().nullable(),
  summary: z.string().nullable(),
  upcomingBookings: z.array(
    z.object({
      id: IdSchema,
      startsAt: TimestampSchema,
      service: z.string(),
      staffName: z.string(),
    }),
  ),
  recentPayments: z
    .array(
      z.object({
        id: IdSchema,
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        at: TimestampSchema,
      }),
    )
    .default([]),
})
export type ConversationThread = z.infer<typeof ConversationThreadSchema>

export const SendMessageSchema = z.object({
  body: z.string().optional(),
  templateId: IdSchema.optional(),
  savedReplyId: IdSchema.optional(),
  note: z.boolean().optional(),
  scheduledFor: TimestampSchema.nullable().optional(),
  attachmentName: z.string().optional(),
  translateTo: z.string().optional(),
})
export type SendMessage = z.infer<typeof SendMessageSchema>

export const ConversationPatchSchema = z.object({
  status: ConversationStatusSchema.optional(),
  assignedUserId: IdSchema.nullable().optional(),
  snoozedUntil: TimestampSchema.nullable().optional(),
  aiControl: AiControlSchema.optional(),
  unreadCount: z.number().int().nonnegative().optional(),
  lockedByName: z.string().nullable().optional(),
})
export type ConversationPatch = z.infer<typeof ConversationPatchSchema>

export const BulkConversationActionSchema = z.object({
  ids: z.array(IdSchema).min(1),
  action: z.enum(['assign_me', 'close', 'reopen', 'snooze', 'mark_read']),
  snoozedUntil: TimestampSchema.optional(),
})

export const MessageTemplateSchema = BaseRecordSchema.extend({
  name: z.string(),
  language: z.string(),
  body: z.string(),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']),
  channel: z.enum(['whatsapp', 'email']),
  rejectionReason: z.string().nullable(),
  usageCount: z.number().int().nonnegative(),
})
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>

export const SavedReplySchema = BaseRecordSchema.extend({
  shortcut: z.string(),
  body: z.string(),
  language: z.string(),
})
export type SavedReply = z.infer<typeof SavedReplySchema>

export const TranslatePreviewSchema = z.object({
  from: z.string(),
  to: z.string(),
  original: z.string(),
  translated: z.string(),
})

export const TimelineEventSchema = z.object({
  id: IdSchema,
  at: TimestampSchema,
  kind: z.enum(['message', 'note', 'booking', 'payment', 'consent', 'import', 'merge', 'system']),
  title: z.string(),
  body: z.string().nullable(),
  createdBy: CreatedBySchema,
})
export type TimelineEvent = z.infer<typeof TimelineEventSchema>

export const ContactNoteSchema = BaseRecordSchema.extend({
  contactId: IdSchema,
  body: z.string(),
})
export type ContactNote = z.infer<typeof ContactNoteSchema>

export const AiMemoryItemSchema = BaseRecordSchema.extend({
  contactId: IdSchema,
  key: z.string(),
  value: z.string(),
})
export type AiMemoryItem = z.infer<typeof AiMemoryItemSchema>

export const CustomFieldDefSchema = BaseRecordSchema.extend({
  key: z.string(),
  label: z.string(),
  type: CustomFieldTypeSchema,
  required: z.boolean(),
  options: z.array(z.string()),
})
export type CustomFieldDef = z.infer<typeof CustomFieldDefSchema>

export const ContactDetailSchema = z.object({
  contact: ContactSchema,
  timeline: z.array(TimelineEventSchema),
  conversations: z.array(ConversationListItemSchema),
  notes: z.array(ContactNoteSchema),
  memories: z.array(AiMemoryItemSchema),
  bookings: z.array(
    z.object({
      id: IdSchema,
      startsAt: TimestampSchema,
      service: z.string(),
      staffName: z.string(),
      status: z.enum(['booked', 'requested', 'completed', 'no_show', 'cancelled']),
    }),
  ),
  payments: z.array(
    z.object({
      id: IdSchema,
      amount: z.number(),
      currency: z.string(),
      status: z.enum(['pending', 'paid', 'failed', 'refunded']),
      at: TimestampSchema,
    }),
  ),
  files: z.array(z.object({ id: IdSchema, name: z.string(), at: TimestampSchema })),
  ledger: z.array(
    z.object({
      id: IdSchema,
      purpose: z.string(),
      channel: ChannelKindSchema,
      status: ConsentStatusSchema,
      source: z.string(),
      wordingVersion: z.string(),
      recordedAt: TimestampSchema,
      proof: z.string(),
    }),
  ),
  tasks: z.array(
    z.object({
      id: IdSchema,
      title: z.string(),
      dueAt: TimestampSchema,
      done: z.boolean(),
      priority: z.enum(['low', 'normal', 'high']),
    }),
  ),
})
export type ContactDetail = z.infer<typeof ContactDetailSchema>

export const DuplicateGroupSchema = z.object({
  id: IdSchema,
  reason: z.enum(['phone', 'email']),
  matchValue: z.string(),
  contacts: z.array(ContactSchema),
})
export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>

export const MergeContactsSchema = z.object({
  winnerId: IdSchema,
  loserId: IdSchema,
})

export const ImportPreviewRowSchema = z.object({
  line: z.number().int(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  error: z.string().nullable(),
})
export type ImportPreviewRow = z.infer<typeof ImportPreviewRowSchema>

export const ImportPreviewSchema = z.object({
  rows: z.array(ImportPreviewRowSchema),
  valid: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
})
export type ImportPreview = z.infer<typeof ImportPreviewSchema>

export const ImportRunSchema = z.object({
  csv: z.string().min(1),
  attested: z.literal(true),
  mapping: z.object({
    firstName: z.string().default('firstName'),
    lastName: z.string().default('lastName'),
    phone: z.string().default('phone'),
    email: z.string().default('email'),
  }),
})

export const ImportJobSchema = BaseRecordSchema.extend({
  status: z.enum(['complete', 'undone']),
  createdCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  contactIds: z.array(IdSchema),
  undoUntil: TimestampSchema,
})
export type ImportJob = z.infer<typeof ImportJobSchema>

export const ReviewRecordSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  locationName: z.string().default('Location'),
  contactName: z.string(),
  rating: z.number().int().min(1).max(5),
  status: z.enum(['new', 'needs_reply', 'replied', 'flagged']),
  source: z.enum(['google', 'private']).default('google'),
  body: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  topics: z.array(z.string()),
  urgency: z.enum(['low', 'medium', 'high']),
  spam: z.boolean(),
  staffMention: z.string().nullable().default(null),
  serviceMention: z.string().nullable().default(null),
  draftReply: z.string(),
  reply: z.string().nullable(),
  repliedAt: TimestampSchema.nullable().default(null),
})
export type ReviewRecord = z.infer<typeof ReviewRecordSchema>

export const PaymentRecordSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  contactId: IdSchema,
  contactName: z.string(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(['pending', 'paid', 'failed', 'refunded']),
  paidAt: TimestampSchema.nullable(),
  source: z.enum(['ai', 'staff', 'booking', 'link']),
  gatewayRef: z.string(),
})
export type PaymentRecord = z.infer<typeof PaymentRecordSchema>

export const AiActionRecordSchema = BaseRecordSchema.extend({
  employeeId: IdSchema.nullable(),
  employeeName: z.string(),
  contactName: z.string(),
  action: z.enum(['replied', 'booked', 'handed_off', 'asked_clarification', 'opted_out']),
  outcome: z.string(),
  href: z.string(),
  channel: ChannelKindSchema.optional(),
  tool: z.string().optional(),
  inputSummary: z.string().optional(),
  output: z.string().optional(),
  cost: z.number().optional(),
})
export type AiActionRecord = z.infer<typeof AiActionRecordSchema>

export const SuggestionRecordSchema = BaseRecordSchema.extend({
  body: z.string(),
  actionLabel: z.string(),
  dismissed: z.boolean(),
})
export type SuggestionRecord = z.infer<typeof SuggestionRecordSchema>

export const AttentionKindSchema = z.enum([
  'approvals',
  'needs_human',
  'unanswered',
  'negative_review',
  'broken_connection',
  'rejected_template',
  'compliance',
])

export const AttentionCardSchema = z.object({
  id: z.string(),
  kind: AttentionKindSchema,
  count: z.number().int().nonnegative(),
  waitMinutes: z.number().int().nonnegative().optional(),
  href: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
})
export type AttentionCard = z.infer<typeof AttentionCardSchema>

export const HomeMetricSchema = z.object({
  id: z.enum(['leads', 'response_time', 'bookings', 'revenue', 'reviews']),
  value: z.number(),
  previous: z.number(),
  sparkline: z.array(z.number()),
  unit: z.enum(['count', 'minutes', 'money', 'rating']),
})
export type HomeMetric = z.infer<typeof HomeMetricSchema>

export const HomeTimelineItemSchema = z.object({
  id: IdSchema,
  kind: z.enum(['booking', 'task', 'noshow_risk']),
  at: TimestampSchema,
  title: z.string(),
  staffName: z.string().nullable(),
  contactName: z.string().nullable(),
  href: z.string(),
})

export const HomeDashboardSchema = z.object({
  attention: z.array(AttentionCardSchema),
  today: z.array(HomeTimelineItemSchema),
  results: z.array(HomeMetricSchema),
  aiActivity: z.array(AiActionRecordSchema),
  suggestions: z.array(SuggestionRecordSchema),
  demoData: z.boolean(),
  connectedChannels: z.array(ChannelKindSchema),
  range: z.enum(['7d', '30d', 'month']),
})
export type HomeDashboard = z.infer<typeof HomeDashboardSchema>

export const ContactPageSchema = pageOf(ContactSchema)

export const SmartListSinceSchema = z.enum(['7d', '30d', '90d', 'all'])
export type SmartListSince = z.infer<typeof SmartListSinceSchema>

export const SmartListFiltersSchema = z.object({
  tag: z.string().optional(),
  source: ContactSchema.shape.sourceLabel.optional(),
  stage: z.string().optional(),
  fieldKey: z.string().optional(),
  fieldValue: z.string().optional(),
  since: SmartListSinceSchema.optional(),
  companyId: IdSchema.optional(),
})
export type SmartListFilters = z.infer<typeof SmartListFiltersSchema>

export const SmartListSchema = BaseRecordSchema.extend({
  name: z.string().min(1),
  filters: SmartListFiltersSchema,
})
export type SmartList = z.infer<typeof SmartListSchema>
export const SmartListWriteSchema = z.object({
  name: z.string().min(1),
  filters: SmartListFiltersSchema,
})
export type SmartListWrite = z.infer<typeof SmartListWriteSchema>
export const SmartListListSchema = z.array(SmartListSchema)

export const CompanySchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  name: z.string().min(1),
  notes: z.string(),
})
export type Company = z.infer<typeof CompanySchema>
export const CompanyWriteSchema = z.object({
  name: z.string().min(1),
  notes: z.string().optional(),
  locationId: IdSchema.optional(),
})
export type CompanyWrite = z.infer<typeof CompanyWriteSchema>
export const CompanyListItemSchema = CompanySchema.extend({ contactCount: z.number().int().nonnegative() })
export type CompanyListItem = z.infer<typeof CompanyListItemSchema>
export const CompanyListSchema = z.array(CompanyListItemSchema)
export const CompanyDetailSchema = z.object({
  company: CompanySchema,
  contacts: z.array(ContactSchema),
})
export type CompanyDetail = z.infer<typeof CompanyDetailSchema>
export const ConversationPageSchema = pageOf(ConversationListItemSchema).extend({
  tags: z.array(z.string()).default([]),
  stages: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
})
export const TemplateListSchema = z.array(MessageTemplateSchema)
export const SavedReplyListSchema = z.array(SavedReplySchema)
export const CustomFieldListSchema = z.array(CustomFieldDefSchema)
export const DuplicateListSchema = z.array(DuplicateGroupSchema)
export const ImportJobListSchema = z.array(ImportJobSchema)
export const TeamMemberOptionSchema = z.object({
  id: IdSchema,
  name: z.string(),
  role: z.string(),
})
export const TeamMemberListSchema = z.array(TeamMemberOptionSchema)
