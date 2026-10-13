import type { z } from 'zod'
import { ApiErrorBodySchema, type ApiErrorCode } from './common'

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode,
    message: string,
    public supportCode?: string,
    public requiredRole?: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (!code || error.code === code)
}

export type RequestOptions<T extends z.ZodTypeAny> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | undefined | null>
  schema?: T
  signal?: AbortSignal
}

/**
 * Typed fetch client bound to the contract. Swapping the mock for the real backend is a base-URL change.
 * onReachable reports whether the API could be reached, for the offline banner.
 */
export function createApiClient({ baseUrl, onReachable }: { baseUrl: string; onReachable?: (ok: boolean) => void }) {
  return async function api<T extends z.ZodTypeAny = z.ZodVoid>(
    path: string,
    options: RequestOptions<T> = {},
  ): Promise<z.infer<T>> {
    const url = new URL(`${baseUrl}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    }

    let response: Response
    try {
      response = await fetch(url, {
        method: options.method ?? 'GET',
        headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      })
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw error
      onReachable?.(false)
      throw new ApiError(0, 'network_error', 'network_error')
    }
    onReachable?.(true)

    if (!response.ok) {
      const parsed = ApiErrorBodySchema.safeParse(await response.json().catch(() => null))
      if (parsed.success) {
        const { code, message, supportCode, requiredRole, fieldErrors } = parsed.data.error
        throw new ApiError(response.status, code, message, supportCode, requiredRole, fieldErrors)
      }
      throw new ApiError(response.status, 'server_error', response.statusText)
    }

    if (response.status === 204 || !options.schema) return undefined as z.infer<T>
    return options.schema.parse(await response.json())
  }
}
