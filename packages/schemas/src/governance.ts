import { z } from 'zod'
import { IdSchema, TimestampSchema } from './common'
import { ChannelKindSchema, MarketCodeSchema } from './market'

export const CompliancePageIdSchema = z.enum([
  'overview',
  'disclosure',
  'consent',
  'recording',
  'data',
  'requests',
  'ai',
  'audit',
  'access',
  'legal',
])
export type CompliancePageId = z.infer<typeof CompliancePageIdSchema>
export const COMPLIANCE_PAGE_IDS = CompliancePageIdSchema.options

export const ChecklistStatusSchema = z.enum(['done', 'attention', 'blocking'])
export type ChecklistStatus = z.infer<typeof ChecklistStatusSchema>

export const ChecklistAreaSchema = z.enum(['disclosure', 'consent', 'recording', 'data', 'requests', 'ai', 'legal'])
export type ChecklistArea = z.infer<typeof ChecklistAreaSchema>

export const ChecklistItemSchema = z.object({
  id: z.string(),
  area: ChecklistAreaSchema,
  status: ChecklistStatusSchema,
  reasonKey: z.string(),
  fixHref: z.string(),
  escalate: z.boolean(),
})
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>

export const ComplianceAlertSchema = z.object({
  id: z.string(),
  kind: z.enum(['consent_gap', 'dsr_deadline', 'legal_update', 'blocking']),
  href: z.string(),
})

export const ComplianceOverviewSchema = z.object({
  market: MarketCodeSchema,
  preview: z.boolean(),
  law: z.string(),
  regulator: z.string(),
  productDoes: z.array(z.string()),
  ownerDoes: z.array(z.string()),
  readiness: z.number().int().min(0).max(100),
  blocking: z.array(z.string()),
  items: z.array(ChecklistItemSchema),
  alerts: z.array(ComplianceAlertSchema),
  wordingPreview: z.string(),
  dsrDays: z.number().int().positive(),
})
export type ComplianceOverview = z.infer<typeof ComplianceOverviewSchema>

export const DisclosureLangSchema = z.object({
  language: z.string(),
  text: z.string(),
})

export const DisclosureCenterSchema = z.object({
  byLanguage: z.array(DisclosureLangSchema),
  verified: z.boolean(),
  lastTest: z
    .object({
      at: TimestampSchema,
      channel: ChannelKindSchema,
      language: z.string(),
      appeared: z.boolean(),
    })
    .nullable(),
  storedNotice: z.string(),
  privacyUrl: z.string(),
  legalName: z.string(),
  privacyEmail: z.string(),
})
export type DisclosureCenter = z.infer<typeof DisclosureCenterSchema>

export const DisclosurePatchSchema = z.object({
  language: z.string().optional(),
  text: z.string().min(12).optional(),
  verified: z.boolean().optional(),
})

export const DisclosureVerifySchema = z.object({
  channel: ChannelKindSchema,
  language: z.string().min(2),
})

export const ConsentLedgerEntrySchema = z.object({
  id: IdSchema,
  contactId: IdSchema,
  contactName: z.string(),
  purpose: z.string(),
  channel: ChannelKindSchema,
  status: z.enum(['granted', 'withdrawn', 'missing']),
  source: z.string(),
  wordingVersion: z.string(),
  recordedAt: TimestampSchema,
  proof: z.string(),
})
export type ConsentLedgerEntry = z.infer<typeof ConsentLedgerEntrySchema>

export const WordingVersionSchema = z.object({
  id: IdSchema,
  version: z.string(),
  purpose: z.string(),
  surface: z.string(),
  text: z.string(),
  createdAt: TimestampSchema,
  current: z.boolean(),
})

export const SuppressionEntrySchema = z.object({
  id: IdSchema,
  contactId: IdSchema.nullable(),
  contactName: z.string(),
  channel: ChannelKindSchema,
  source: z.string(),
  reason: z.string(),
  createdAt: TimestampSchema,
})

export const ConsentCenterSchema = z.object({
  ledger: z.array(ConsentLedgerEntrySchema),
  wordings: z.array(WordingVersionSchema),
  suppression: z.array(SuppressionEntrySchema),
  imports: z.array(z.object({ id: IdSchema, attestedAt: TimestampSchema, basis: z.string(), count: z.number().int() })),
  quietHours: z.object({ start: z.string(), end: z.string() }).nullable(),
  smsConsentStrict: z.boolean(),
})
export type ConsentCenter = z.infer<typeof ConsentCenterSchema>

export const ReconsentWriteSchema = z.object({
  purpose: z.string().min(2),
})

export const SuppressionWriteSchema = z.object({
  contactName: z.string().min(1),
  channel: ChannelKindSchema,
  reason: z.string().min(4),
})

export const RecordingCenterSchema = z.object({
  enabled: z.boolean(),
  notice: z.string(),
  allPartyConsent: z.boolean(),
  allPartyAcknowledged: z.boolean(),
  staffMonitoringAcceptedAt: TimestampSchema.nullable(),
  whoCanListen: z.array(z.string()),
  retentionDays: z.number().int().positive(),
})
export type RecordingCenter = z.infer<typeof RecordingCenterSchema>

export const RecordingPatchSchema = z.object({
  enabled: z.boolean().optional(),
  notice: z.string().min(8).optional(),
  allPartyAcknowledged: z.boolean().optional(),
  acceptStaffMonitoring: z.boolean().optional(),
})

export const DataGovernanceSchema = z.object({
  region: z.string(),
  allowedRegions: z.array(z.string()),
  regionChangeRequested: z.boolean(),
  legalHold: z.boolean(),
  retention: z.object({
    messages: z.number().int(),
    recordings: z.number().int(),
    contacts: z.number().int(),
    bookings: z.number().int(),
    reviews: z.number().int(),
    audit: z.number().int(),
    backups: z.number().int(),
  }),
  documents: z.array(z.object({ id: z.string(), available: z.boolean() })),
  jobs: z.array(z.object({ id: IdSchema, kind: z.string(), status: z.string(), at: TimestampSchema })),
})
export type DataGovernance = z.infer<typeof DataGovernanceSchema>

export const DataGovernancePatchSchema = z.object({
  legalHold: z.boolean().optional(),
  requestRegionChange: z.boolean().optional(),
})

export const DsarTypeSchema = z.enum(['access', 'correct', 'delete', 'restrict', 'object', 'human_review'])
export const DsarStatusSchema = z.enum(['received', 'verified', 'in_progress', 'completed'])

export const DsarRequestSchema = z.object({
  id: IdSchema,
  type: DsarTypeSchema,
  requester: z.string(),
  contactId: IdSchema.nullable(),
  receivedAt: TimestampSchema,
  dueAt: TimestampSchema,
  status: DsarStatusSchema,
  assignee: z.string().nullable(),
  remainingHours: z.number(),
  overdue: z.boolean(),
  escalate: z.boolean(),
})
export type DsarRequest = z.infer<typeof DsarRequestSchema>

export const DsarQueueSchema = z.object({
  items: z.array(DsarRequestSchema),
  dsrDays: z.number().int().positive(),
})
export type DsarQueue = z.infer<typeof DsarQueueSchema>

export const DsarWriteSchema = z.object({
  type: DsarTypeSchema,
  requester: z.string().min(2),
  contactId: IdSchema.nullable().optional(),
})

export const DsarActionSchema = z.object({
  status: DsarStatusSchema.optional(),
})

export const DsarPreviewSchema = z.object({
  requestId: IdSchema,
  export: z.array(z.object({ kind: z.string(), count: z.number().int() })),
  remove: z.array(z.object({ kind: z.string(), count: z.number().int() })),
  keep: z.array(z.object({ kind: z.string(), reasonKey: z.string() })),
})

export const AiGovernanceSchema = z.object({
  matrix: z.array(
    z.object({
      employeeId: IdSchema,
      name: z.string(),
      tools: z.array(z.object({ id: z.string(), autonomy: z.string() })),
      languages: z.array(z.object({ code: z.string(), tier: z.string(), autonomy: z.string() })),
      lastEval: z.boolean().nullable(),
    }),
  ),
  guardrails: z.array(z.object({ id: z.string(), layer: z.enum(['platform', 'business']), text: z.string() })),
  incidents: z.array(z.object({ id: IdSchema, summary: z.string(), status: z.string(), createdAt: TimestampSchema })),
  prohibitedUsesAcceptedAt: TimestampSchema.nullable(),
  transparency: z.string(),
  killHistory: z.array(z.object({ at: TimestampSchema, employee: z.string(), action: z.string() })),
})
export type AiGovernance = z.infer<typeof AiGovernanceSchema>

export const AiIncidentWriteSchema = z.object({
  summary: z.string().min(8),
})

export const AccessReviewSchema = z.object({
  members: z.array(
    z.object({
      id: IdSchema,
      name: z.string(),
      role: z.string(),
      lastActiveAt: TimestampSchema,
      locations: z.string(),
    }),
  ),
  support: z.array(
    z.object({
      id: IdSchema,
      actor: z.string(),
      reason: z.string(),
      status: z.enum(['pending', 'active', 'ended']),
      expiresAt: TimestampSchema.nullable(),
      createdAt: TimestampSchema,
    }),
  ),
  breachNoteKeys: z.array(z.string()),
})
export type AccessReview = z.infer<typeof AccessReviewSchema>

export const SupportAccessActionSchema = z.object({
  decision: z.enum(['approve', 'deny']),
})

export const LegalDocumentSchema = z.object({
  id: z.string(),
  version: z.string(),
  acceptedAt: TimestampSchema.nullable(),
  acceptedBy: z.string().nullable(),
  addendum: z.boolean(),
})

export const LegalCenterSchema = z.object({
  documents: z.array(LegalDocumentSchema),
  pendingChange: z.boolean(),
  marketAddenda: z.array(z.string()),
})
export type LegalCenter = z.infer<typeof LegalCenterSchema>

export const LegalAcceptSchema = z.object({
  id: z.string(),
})
