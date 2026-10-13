import { z } from 'zod'
import { AccountStateSchema, PlanSchema } from './account'
import { IdSchema, TimestampSchema } from './common'
import { DataRegionSchema, MarketCodeSchema } from './market'

/** Internal admin personas (PRD 31.1). */
export const AdminPersonaSchema = z.enum([
  'support',
  'success',
  'compliance',
  'finance',
  'ai_quality',
  'pack_author',
  'market_manager',
  'sre',
  'trust_safety',
  'leadership',
])
export type AdminPersona = z.infer<typeof AdminPersonaSchema>
export const ADMIN_PERSONAS = AdminPersonaSchema.options

export const AdminModuleSchema = z.enum([
  'overview',
  'tenants',
  'onboarding',
  'usage',
  'ai',
  'channels',
  'compliance',
  'markets',
  'packs',
  'billing',
  'plans',
  'support',
  'safety',
  'flags',
  'system',
  'insights',
  'users',
])
export type AdminModule = z.infer<typeof AdminModuleSchema>

/** Which personas see which console modules (PRD 31.1 'Views' column). */
export const ADMIN_MODULE_ACCESS: Record<AdminModule, AdminPersona[]> = {
  overview: [...ADMIN_PERSONAS],
  tenants: ['support', 'success', 'compliance', 'finance', 'trust_safety', 'leadership'],
  onboarding: ['support', 'success', 'leadership'],
  usage: ['success', 'finance', 'ai_quality', 'leadership'],
  ai: ['support', 'ai_quality', 'leadership'],
  channels: ['support', 'sre'],
  compliance: ['compliance', 'market_manager', 'leadership'],
  markets: ['compliance', 'market_manager'],
  packs: ['pack_author', 'market_manager'],
  billing: ['finance', 'success', 'leadership'],
  plans: ['finance'],
  support: ['support', 'success'],
  safety: ['trust_safety'],
  flags: ['sre'],
  system: ['sre'],
  insights: ['success', 'ai_quality', 'pack_author', 'market_manager', 'leadership'],
  users: ['sre', 'leadership'],
}

/** Support session as a tenant: owner-approved, time-limited, read-only by default (FR-AD.3). */
export const ImpersonationSchema = z.object({
  tenantId: IdSchema,
  tenantName: z.string(),
  startedAt: TimestampSchema,
  endsAt: TimestampSchema,
  readOnly: z.boolean(),
})
export type Impersonation = z.infer<typeof ImpersonationSchema>

export const AdminSessionSchema = z.object({
  id: IdSchema,
  name: z.string(),
  email: z.email(),
  persona: AdminPersonaSchema,
  /** Personal data is masked unless a logged, time-limited reveal is active (PRD 31.3, FR-PA.6). */
  piiRevealedUntil: TimestampSchema.nullable(),
  impersonation: ImpersonationSchema.nullable(),
})
export type AdminSession = z.infer<typeof AdminSessionSchema>

export const RevealRequestSchema = z.object({
  field: z.string(),
  tenantId: IdSchema.optional(),
  reason: z.string().trim().min(10, 'reason_too_short'),
})
export type RevealRequest = z.infer<typeof RevealRequestSchema>

export const RevealResponseSchema = z.object({ revealedUntil: TimestampSchema })

export const TenantSummarySchema = z.object({
  id: IdSchema,
  name: z.string(),
  ownerName: z.string(),
  ownerEmail: z.string(),
  market: MarketCodeSchema,
  region: DataRegionSchema,
  industry: z.string(),
  state: AccountStateSchema,
  plan: PlanSchema,
  healthScore: z.number().int().min(0).max(100),
  createdAt: TimestampSchema,
})
export type TenantSummary = z.infer<typeof TenantSummarySchema>

export const AdminOverviewSchema = z.object({
  total: z.number().int(),
  byState: z.partialRecord(AccountStateSchema, z.number().int()),
  byMarket: z.partialRecord(MarketCodeSchema, z.number().int()),
  recent: z.array(TenantSummarySchema),
})
export type AdminOverview = z.infer<typeof AdminOverviewSchema>
