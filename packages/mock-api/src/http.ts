import { delay, HttpResponse, type HttpResponseResolver, type JsonBodyType, type PathParams } from 'msw'
import { z } from 'zod'
import { lowestRoleWith, scopeFor, type ApiErrorCode, type Capability, type Session } from '@deskhand/schemas'
import { devSettings } from './dev-settings'

const STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  validation_failed: 422,
  rate_limited: 429,
  server_error: 500,
  network_error: 0,
}

export function supportCode() {
  return `DH-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

/** Thrown inside resolvers; route() turns it into the contract error shape. */
export class MockHttpError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public extra: { requiredRole?: string; fieldErrors?: Record<string, string[]> } = {},
  ) {
    super(message)
  }
}

export function errorResponse(error: MockHttpError) {
  return HttpResponse.json(
    { error: { code: error.code, message: error.message, supportCode: supportCode(), ...error.extra } },
    { status: STATUS[error.code] },
  )
}

/** Latency and failure modes from the dev toolbar (FE-DOC 8.5). Returns a response to short-circuit, or null. */
async function simulateNetwork(): Promise<Response | null> {
  const { network } = devSettings()
  if (network === 'offline') return HttpResponse.error()
  if (network === 'instant') return null
  const [min, max] = network === 'slow' ? [1500, 3500] : [150, 600]
  await delay(min + Math.random() * (max - min))
  if (network === 'failing' && Math.random() < 0.05) {
    return errorResponse(new MockHttpError('server_error', 'Something went wrong on our side.'))
  }
  return null
}

/** Extra processing time for slow operations (imports, DNS checks), skipped in instant mode. */
export async function pause(ms: number) {
  if (devSettings().network !== 'instant') await delay(ms)
}

type RouteInfo<Params extends PathParams> = { request: Request; params: Params }

export function route<Params extends PathParams = PathParams>(
  resolver: (info: RouteInfo<Params>) => Promise<Response> | Response,
): HttpResponseResolver<Params> {
  return async ({ request, params }) => {
    const short = await simulateNetwork()
    if (short) return short
    try {
      return await resolver({ request, params })
    } catch (error) {
      if (error instanceof MockHttpError) return errorResponse(error)
      console.error('[mock-api]', error)
      return errorResponse(new MockHttpError('server_error', 'Something went wrong on our side.'))
    }
  }
}

/** Validates the response against the contract before sending it. */
export function json<T extends z.ZodTypeAny>(schema: T, data: z.input<T>, status = 200) {
  return HttpResponse.json(schema.parse(data) as JsonBodyType, { status })
}

export async function parseBody<T extends z.ZodTypeAny>(request: Request, schema: T): Promise<z.infer<T>> {
  const body: unknown = await request.json().catch(() => ({}))
  return parseData(body, schema)
}

export function parseData<T extends z.ZodTypeAny>(data: unknown, schema: T): z.infer<T> {
  const result = schema.safeParse(data)
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    throw new MockHttpError('validation_failed', 'Some fields need attention.', {
      fieldErrors: fieldErrors as Record<string, string[]>,
    })
  }
  return result.data
}

export function requireCapability(session: Session, capability: Capability, level: 'act' | 'view' = 'act') {
  const scope = scopeFor(session.membership.role, capability)
  const ok = level === 'view' ? scope !== 'none' : scope === 'all' || scope === 'own'
  if (!ok) {
    throw new MockHttpError('forbidden', 'Your role cannot do this.', { requiredRole: lowestRoleWith(capability) })
  }
  return scope
}
