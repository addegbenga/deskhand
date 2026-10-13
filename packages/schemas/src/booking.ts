import { z } from 'zod'
import { BaseRecordSchema, IdSchema, TimestampSchema, pageOf } from './common'

export const AppointmentStatusSchema = z.enum(['booked', 'requested', 'completed', 'no_show', 'cancelled'])
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>

export const BookingSourceSchema = z.enum(['page', 'ai', 'staff', 'embed'])
export type BookingSource = z.infer<typeof BookingSourceSchema>

export const DepositStatusSchema = z.enum(['none', 'pending', 'paid', 'failed'])

export const PipelineStageSchema = BaseRecordSchema.extend({
  locationId: IdSchema.nullable(),
  name: z.string(),
  order: z.number().int(),
  probability: z.number().min(0).max(100),
  staleAfterDays: z.number().int().positive(),
  won: z.boolean(),
  lost: z.boolean(),
})
export type PipelineStage = z.infer<typeof PipelineStageSchema>

export const LeadStatusSchema = z.enum(['new', 'working', 'qualified', 'disqualified', 'converted'])
export type LeadStatus = z.infer<typeof LeadStatusSchema>

export const LeadSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  contactId: IdSchema,
  contactName: z.string(),
  status: LeadStatusSchema,
  source: z.string(),
  assignedUserId: IdSchema.nullable(),
  assignedName: z.string().nullable(),
  lastActivityAt: TimestampSchema,
  nextFollowUpAt: TimestampSchema.nullable(),
  opportunityId: IdSchema.nullable(),
  aiSuggested: z.boolean(),
})
export type Lead = z.infer<typeof LeadSchema>
export const LeadListSchema = z.array(LeadSchema)

export const QualifyLeadSchema = z.object({
  value: z.number().nonnegative().nullable().optional(),
})

export const SalesPageIdSchema = z.enum(['leads', 'pipeline', 'opportunities'])
export type SalesPageId = z.infer<typeof SalesPageIdSchema>
export const SALES_PAGE_IDS = SalesPageIdSchema.options

export const OpportunitySchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  contactId: IdSchema,
  leadId: IdSchema.nullable(),
  contactName: z.string(),
  stageId: IdSchema,
  stageName: z.string(),
  value: z.number().nullable(),
  probability: z.number().min(0).max(100),
  expectedCloseAt: TimestampSchema.nullable(),
  assignedUserId: IdSchema.nullable(),
  assignedName: z.string().nullable(),
  source: z.string(),
  enteredStageAt: TimestampSchema,
  lastActivityAt: TimestampSchema,
  nextTask: z.string().nullable(),
  aiWorking: z.boolean(),
  wonReason: z.string().nullable(),
  lostReason: z.string().nullable(),
})
export type Opportunity = z.infer<typeof OpportunitySchema>

export const MoveOpportunitySchema = z.object({
  stageId: IdSchema,
  reason: z.string().optional(),
})

export const ServiceSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  name: z.string(),
  description: z.string(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().nonnegative(),
  price: z.number().nonnegative(),
  currency: z.string().length(3),
  depositAmount: z.number().nonnegative(),
  staffUserIds: z.array(IdSchema),
  capacity: z.number().int().positive(),
  visible: z.boolean(),
  order: z.number().int(),
  instantBook: z.boolean(),
})
export type Service = z.infer<typeof ServiceSchema>

export const CreateServiceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().optional(),
  durationMinutes: z.number().int().positive(),
  bufferMinutes: z.number().int().nonnegative().optional(),
  price: z.number().nonnegative(),
  depositAmount: z.number().nonnegative().optional(),
  capacity: z.number().int().positive().optional(),
  visible: z.boolean().optional(),
  instantBook: z.boolean().optional(),
})
export type CreateService = z.infer<typeof CreateServiceSchema>

export const StaffProfileSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  userId: IdSchema,
  name: z.string(),
  title: z.string(),
  bookable: z.boolean(),
  calendarConnected: z.boolean(),
  weeklyHours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      start: z.string(),
      end: z.string(),
    }),
  ),
})
export type StaffProfile = z.infer<typeof StaffProfileSchema>

export const AppointmentSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  contactId: IdSchema,
  staffUserId: IdSchema,
  staffName: z.string(),
  contactName: z.string(),
  serviceId: IdSchema,
  service: z.string(),
  startsAt: TimestampSchema,
  endsAt: TimestampSchema,
  status: AppointmentStatusSchema,
  noshowRisk: z.boolean(),
  price: z.number(),
  depositAmount: z.number(),
  depositStatus: DepositStatusSchema,
  source: BookingSourceSchema,
  notes: z.string(),
  manageToken: z.string(),
  capacity: z.number().int().positive(),
  attendeeCount: z.number().int().positive(),
})
export type Appointment = z.infer<typeof AppointmentSchema>
/** @deprecated use Appointment */
export type AppointmentRecord = Appointment
export const AppointmentRecordSchema = AppointmentSchema

export const SlotHoldSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  serviceId: IdSchema,
  staffUserId: IdSchema,
  startsAt: TimestampSchema,
  endsAt: TimestampSchema,
  expiresAt: TimestampSchema,
  token: z.string(),
})
export type SlotHold = z.infer<typeof SlotHoldSchema>

export const BookingPageSettingsSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  slug: z.string(),
  welcome: z.string(),
  noticeHours: z.number().int().nonnegative(),
  horizonDays: z.number().int().positive(),
  instantBook: z.boolean(),
  consentText: z.string(),
  languages: z.array(z.string()),
})
export type BookingPageSettings = z.infer<typeof BookingPageSettingsSchema>

export const SlotSchema = z.object({
  startsAt: TimestampSchema,
  endsAt: TimestampSchema,
  staffUserId: IdSchema,
  staffName: z.string(),
  remaining: z.number().int().nonnegative(),
  held: z.boolean(),
})
export type Slot = z.infer<typeof SlotSchema>

export const PublicBookingPageSchema = z.object({
  slug: z.string(),
  name: z.string(),
  brandColor: z.string(),
  showPoweredBy: z.boolean(),
  locale: z.string(),
  languages: z.array(z.string()),
  city: z.string(),
  timezone: z.string(),
  currency: z.string(),
  welcome: z.string(),
  privacyHref: z.string(),
  noticeHours: z.number(),
  horizonDays: z.number(),
  services: z.array(ServiceSchema),
  staff: z.array(StaffProfileSchema.pick({ userId: true, name: true, title: true, bookable: true })),
})
export type PublicBookingPage = z.infer<typeof PublicBookingPageSchema>

export const HoldSlotSchema = z.object({
  slug: z.string(),
  serviceId: IdSchema,
  staffUserId: IdSchema.optional(),
  startsAt: TimestampSchema,
  token: z.string().optional(),
})

export const ConfirmBookingSchema = z.object({
  slug: z.string(),
  token: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().min(6),
  email: z.string().optional(),
  notes: z.string().optional(),
  marketing: z.boolean(),
  serviceConsent: z.literal(true),
  honeypot: z.string().optional(),
  source: BookingSourceSchema.default('page'),
  payDeposit: z.boolean().optional(),
})

export const AbandonBookingSchema = z.object({
  slug: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().min(6),
  serviceId: IdSchema.optional(),
})

export const BookingConfirmationSchema = z.object({
  appointment: AppointmentSchema,
  manageHref: z.string(),
  timezone: z.string(),
})

export const ManageBookingSchema = z.object({
  appointment: AppointmentSchema,
  timezone: z.string(),
  business: z.string(),
  canCancel: z.boolean(),
  canReschedule: z.boolean(),
  policy: z.string(),
})

export const RescheduleBookingSchema = z.object({
  startsAt: TimestampSchema,
  staffUserId: IdSchema.optional(),
})

export const CreateAppointmentSchema = z.object({
  contactId: IdSchema,
  serviceId: IdSchema,
  staffUserId: IdSchema,
  startsAt: TimestampSchema,
  notes: z.string().optional(),
  overrideReason: z.string().optional(),
  requestDeposit: z.boolean().optional(),
})

export const PatchAppointmentSchema = z.object({
  startsAt: TimestampSchema.optional(),
  staffUserId: IdSchema.optional(),
  status: AppointmentStatusSchema.optional(),
  notes: z.string().optional(),
})

export const TaskLinkedKindSchema = z.enum(['contact', 'conversation', 'opportunity', 'booking'])
export type TaskLinkedKind = z.infer<typeof TaskLinkedKindSchema>

export const TaskSchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  assignedUserId: IdSchema,
  title: z.string(),
  notes: z.string(),
  dueAt: TimestampSchema,
  contactName: z.string().nullable(),
  contactId: IdSchema.nullable(),
  done: z.boolean(),
  priority: z.enum(['low', 'normal', 'high']),
  linkedKind: TaskLinkedKindSchema.nullable(),
  linkedId: IdSchema.nullable(),
})
export type Task = z.infer<typeof TaskSchema>
/** @deprecated use Task */
export type TaskRecord = Task
export const TaskRecordSchema = TaskSchema

export const CreateTaskSchema = z.object({
  title: z.string().min(1),
  dueAt: TimestampSchema,
  assignedUserId: IdSchema.optional(),
  notes: z.string().optional(),
  contactId: IdSchema.optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  linkedKind: TaskLinkedKindSchema.nullable().optional(),
  linkedId: IdSchema.nullable().optional(),
  locationId: IdSchema.optional(),
})
export type CreateTask = z.infer<typeof CreateTaskSchema>

export const WaitlistEntrySchema = BaseRecordSchema.extend({
  locationId: IdSchema,
  serviceId: IdSchema,
  staffUserId: IdSchema.nullable(),
  startsAt: TimestampSchema,
  phone: z.string(),
  name: z.string(),
})
export type WaitlistEntry = z.infer<typeof WaitlistEntrySchema>

export const JoinWaitlistSchema = z.object({
  slug: z.string(),
  serviceId: z.string(),
  name: z.string().min(1),
  phone: z.string().min(6),
  staffUserId: z.string().nullable().optional(),
  startsAt: TimestampSchema.optional(),
})
export type JoinWaitlist = z.infer<typeof JoinWaitlistSchema>

export const PipelineBoardSchema = z.object({
  stages: z.array(PipelineStageSchema),
  items: z.array(OpportunitySchema),
  wonReasons: z.array(z.string()),
  lostReasons: z.array(z.string()),
})
export type PipelineBoard = z.infer<typeof PipelineBoardSchema>

export const CalendarPayloadSchema = z.object({
  timezone: z.string(),
  staff: z.array(StaffProfileSchema),
  services: z.array(ServiceSchema),
  appointments: z.array(AppointmentSchema),
  disconnected: z.boolean(),
})
export type CalendarPayload = z.infer<typeof CalendarPayloadSchema>

export const HoldResponseSchema = z.object({
  token: z.string(),
  expiresAt: TimestampSchema,
  slot: SlotSchema,
})

export const LocationTimezonePatchSchema = z.object({
  timezone: z.string().min(1),
})

export const OpportunityPageSchema = pageOf(OpportunitySchema)
export const AppointmentPageSchema = pageOf(AppointmentSchema)
export const TaskPageSchema = pageOf(TaskSchema)
export const ServiceListSchema = z.array(ServiceSchema)
export const StaffListSchema = z.array(StaffProfileSchema)
export const SlotListSchema = z.array(SlotSchema)
