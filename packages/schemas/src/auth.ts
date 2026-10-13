import { z } from 'zod'
import { SessionSchema } from './account'
import { IdSchema, TimestampSchema } from './common'
import { MarketCodeSchema } from './market'
import { RoleSchema } from './roles'

/** Error codes the auth endpoints put in fieldErrors; the UI maps each to a translated message. */
export const AuthFieldErrorSchema = z.enum([
  'required',
  'invalid_email',
  'disposable_email',
  'email_taken',
  'weak_password',
  'terms_required',
  'adult_required',
  'wrong_code',
  'code_expired',
  'too_many_attempts',
  'wrong_credentials',
  'no_account',
  'locked',
  'slug_taken',
  'slug_invalid',
  'link_expired',
])
export type AuthFieldError = z.infer<typeof AuthFieldErrorSchema>

/** Countries offered at sign-up. Countries without a market pack join the waitlist (FR-M.2). */
export const SignupCountrySchema = z.string().length(2)

export const SignupMethodSchema = z.enum(['email', 'google'])

export const AttributionSchema = z.object({
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  referrer: z.string().optional(),
  referralCode: z.string().optional(),
})

export const SignupStartSchema = z.object({
  method: SignupMethodSchema,
  email: z.email(),
  name: z.string().optional(),
  password: z.string().optional(),
  country: SignupCountrySchema,
  acceptTerms: z.literal(true),
  confirmAdultBusiness: z.literal(true),
  marketingOptIn: z.boolean(),
  attribution: AttributionSchema.optional(),
})
export type SignupStart = z.infer<typeof SignupStartSchema>

/** Sign-up steps after the first screen (PRD 27.1). */
export const SignupStepSchema = z.enum(['verify', 'about_you', 'business', 'plan', 'done', 'waitlist'])
export type SignupStep = z.infer<typeof SignupStepSchema>

export const SignupRoleSchema = z.enum(['owner', 'manager', 'agency'])
export const TeamSizeSchema = z.enum(['just_me', '2_5', '6_20', '21_plus'])
export const HeardFromSchema = z.enum(['friend', 'instagram', 'google', 'whatsapp', 'event', 'partner', 'other'])

export const IndustrySchema = z.enum([
  'salon',
  'barber',
  'clinic',
  'real_estate',
  'bakery',
  'restaurant',
  'gym',
  'school',
  'home_services',
  'general',
])
export type Industry = z.infer<typeof IndustrySchema>

export const AboutYouSchema = z.object({
  name: z.string().trim().min(2),
  role: SignupRoleSchema,
  teamSize: TeamSizeSchema,
  heardFrom: HeardFromSchema,
})
export type AboutYou = z.infer<typeof AboutYouSchema>

export const AboutBusinessSchema = z.object({
  businessName: z.string().trim().min(2),
  industry: IndustrySchema,
  link: z.string().trim(),
  city: z.string().trim().min(2),
  timezone: z.string(),
  currency: z.string().length(3),
})
export type AboutBusiness = z.infer<typeof AboutBusinessSchema>

export const SignupPlanSchema = z.object({ plan: z.enum(['starter', 'growth', 'pro']) })

export const SignupSchema = z.object({
  id: IdSchema,
  step: SignupStepSchema,
  method: SignupMethodSchema,
  email: z.email(),
  /** From Google sign-in, used to prefill the About you step. */
  name: z.string().nullable(),
  country: SignupCountrySchema,
  market: MarketCodeSchema.nullable(),
  codeSentAt: TimestampSchema.nullable(),
  resendAvailableAt: TimestampSchema.nullable(),
  codeExpiresAt: TimestampSchema.nullable(),
  attemptsLeft: z.number().int().nonnegative(),
  aboutYou: AboutYouSchema.nullable(),
  business: AboutBusinessSchema.nullable(),
  plan: SignupPlanSchema.shape.plan.nullable(),
  suggestedSlug: z.string().nullable(),
  createdAt: TimestampSchema,
})
export type Signup = z.infer<typeof SignupSchema>

export const VerifyCodeSchema = z.object({ code: z.string().regex(/^\d{6}$/) })

export const SignupPatchSchema = z.union([
  z.object({ aboutYou: AboutYouSchema }),
  z.object({ business: AboutBusinessSchema }),
  SignupPlanSchema,
])

export const SlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const SignupCompleteSchema = z.object({ slug: SlugSchema })

export const SlugCheckSchema = z.object({ slug: z.string(), available: z.boolean(), suggestion: z.string().nullable() })

export const LoginSchema = z.object({
  method: z.enum(['password', 'google']),
  email: z.email(),
  password: z.string().optional(),
})
export type Login = z.infer<typeof LoginSchema>

export const LoginResultSchema = z.object({
  session: SessionSchema,
  /** Where to land: unfinished setup goes back to onboarding. */
  next: z.string(),
})
export type LoginResult = z.infer<typeof LoginResultSchema>

export const EmailOnlySchema = z.object({ email: z.email() })

export const ResetTokenSchema = z.object({ email: z.email(), expiresAt: TimestampSchema })
export const ResetPasswordSchema = z.object({ token: z.string(), password: z.string() })

/** Mock-only mailbox so demos can open verification codes, reset links and invitations. */
export const OutboxMessageSchema = z.object({
  id: IdSchema,
  to: z.email(),
  kind: z.enum(['verify_code', 'reset_link', 'magic_link', 'invitation']),
  code: z.string().nullable(),
  href: z.string().nullable(),
  createdAt: TimestampSchema,
})
export type OutboxMessage = z.infer<typeof OutboxMessageSchema>

export const InvitationStatusSchema = z.enum(['pending', 'accepted', 'expired', 'revoked'])

export const InvitationSchema = z.object({
  id: IdSchema,
  accountId: IdSchema,
  token: z.string(),
  email: z.email(),
  role: RoleSchema,
  locationIds: z.array(IdSchema),
  invitedBy: IdSchema,
  note: z.string().nullable(),
  status: InvitationStatusSchema,
  expiresAt: TimestampSchema,
  createdAt: TimestampSchema,
})
export type Invitation = z.infer<typeof InvitationSchema>

/** What the accept-invite page may show before the person signs in (PRD 12.4). */
export const InvitationPreviewSchema = z.object({
  token: z.string(),
  status: InvitationStatusSchema,
  email: z.email(),
  role: RoleSchema,
  businessName: z.string(),
  inviterName: z.string(),
  note: z.string().nullable(),
  locationNames: z.array(z.string()),
  expiresAt: TimestampSchema,
  existingUser: z.boolean(),
  timezone: z.string(),
})
export type InvitationPreview = z.infer<typeof InvitationPreviewSchema>

export const AcceptInvitationSchema = z.object({
  method: z.enum(['password', 'google', 'existing']),
  name: z.string().optional(),
  password: z.string().optional(),
  language: z.string(),
  timezone: z.string(),
})
export type AcceptInvitation = z.infer<typeof AcceptInvitationSchema>
