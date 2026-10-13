import { z } from 'zod'

export const IdSchema = z.string().min(1)
export const TimestampSchema = z.iso.datetime()

/** Who created a record (PRD 15.21, FR-MA.5). */
export const CreatedBySchema = z.object({
  kind: z.enum(['person', 'ai_employee', 'recipe', 'form', 'booking_page', 'import', 'api']),
  id: z.string().optional(),
  name: z.string().optional(),
})
export type CreatedBy = z.infer<typeof CreatedBySchema>

export const BaseRecordSchema = z.object({
  id: IdSchema,
  accountId: IdSchema,
  createdAt: TimestampSchema,
  createdBy: CreatedBySchema,
})

export const ApiErrorCodeSchema = z.enum([
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'validation_failed',
  'rate_limited',
  'server_error',
  'network_error',
])
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

/** The one error shape every endpoint returns (FE-DOC 8.5). */
export const ApiErrorBodySchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    supportCode: z.string(),
    requiredRole: z.string().optional(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>

export const pageOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative(),
  })
export type Page<T> = { items: T[]; nextCursor: string | null; total: number }
