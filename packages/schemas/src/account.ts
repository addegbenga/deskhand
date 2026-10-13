import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema } from './common'
import { DataRegionSchema, MarketCodeSchema } from './market'
import { RoleSchema } from './roles'

/** Account states (PRD 27.4). Deleted accounts never reach the UI. */
export const AccountStateSchema = z.enum([
  'trial',
  'trial_expired',
  'active',
  'past_due',
  'suspended',
  'paused',
  'cancelled',
])
export type AccountState = z.infer<typeof AccountStateSchema>

export const PlanSchema = z.enum(['starter', 'growth', 'pro'])
export type Plan = z.infer<typeof PlanSchema>

/**
 * on: AI employee active. suggest_only: AI drafts, people send. off: human only.
 * paused: kill switch pressed. manual: no AI employee exists (FE-DOC 9).
 */
export const AiModeSchema = z.enum(['on', 'suggest_only', 'off', 'paused', 'manual'])
export type AiMode = z.infer<typeof AiModeSchema>

/** Activation milestones (PRD 6.4). */
export const MilestoneSchema = z.enum([
  'profile_complete',
  'first_channel_live',
  'ai_taught',
  'ai_live',
  'first_lead_handled',
  'first_booking_or_payment',
  'autopilot_replies',
])
export type Milestone = z.infer<typeof MilestoneSchema>

export const AccountSchema = BaseRecordSchema.omit({ accountId: true }).extend({
  name: z.string(),
  slug: z.string(),
  industry: z.string(),
  market: MarketCodeSchema,
  region: DataRegionSchema,
  state: AccountStateSchema,
  plan: PlanSchema,
  aiMode: AiModeSchema,
  trialEndsAt: TimestampSchema.nullable(),
  graceEndsAt: TimestampSchema.nullable(),
  suspensionReason: z.string().nullable(),
  milestones: z.array(MilestoneSchema),
  brandColor: z.string(),
  showPoweredBy: z.boolean(),
})
export type Account = z.infer<typeof AccountSchema>

export const AccountPatchSchema = AccountSchema.pick({ state: true, aiMode: true, plan: true }).partial()
export type AccountPatch = z.infer<typeof AccountPatchSchema>

export const LocationPatchSchema = z.object({
  timezone: z.string().min(1),
})
export type LocationPatch = z.infer<typeof LocationPatchSchema>

export const LocationSchema = BaseRecordSchema.extend({
  name: z.string(),
  city: z.string(),
  address: z.string(),
  timezone: z.string(),
  currency: z.string().length(3),
  locale: z.string(),
  market: MarketCodeSchema,
  phone: z.string(),
})
export type Location = z.infer<typeof LocationSchema>

export const UserSchema = z.object({
  id: IdSchema,
  name: z.string(),
  email: z.email(),
  phone: z.string().nullable(),
  locale: z.string(),
  createdAt: TimestampSchema,
})
export type User = z.infer<typeof UserSchema>

export const MembershipSchema = z.object({
  id: IdSchema,
  accountId: IdSchema,
  userId: IdSchema,
  role: RoleSchema,
  /** Empty means every location (FR-T.2). */
  locationIds: z.array(IdSchema),
  title: z.string(),
})
export type Membership = z.infer<typeof MembershipSchema>

export const SessionSchema = z.object({
  user: UserSchema,
  membership: MembershipSchema,
  account: AccountSchema,
  locations: z.array(LocationSchema),
})
export type Session = z.infer<typeof SessionSchema>
