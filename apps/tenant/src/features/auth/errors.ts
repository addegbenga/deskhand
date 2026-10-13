import { useTranslation } from '@deskhand/i18n'
import { AuthFieldErrorSchema } from '@deskhand/schemas'
import { isApiError } from '../../api/client'

/** Turns the server's field error codes into translated messages, plus a general message for everything else. */
export function useAuthErrors(error: unknown) {
  const { t } = useTranslation('auth')
  const code = (name: string): string | undefined => (isApiError(error) ? error.fieldErrors?.[name]?.[0] : undefined)
  const field = (name: string): string | undefined => {
    const raw = code(name)
    if (!raw) return undefined
    const known = AuthFieldErrorSchema.safeParse(raw)
    return known.success ? t(`errors.${known.data}`) : t('errors.invalid')
  }
  const general = (): string | undefined => {
    if (!error) return undefined
    if (isApiError(error, 'network_error')) return t('errors.offline')
    if (isApiError(error, 'rate_limited') && !error.fieldErrors) return t('errors.rateLimited')
    if (isApiError(error) && error.fieldErrors) return undefined
    return t('errors.generic')
  }
  return { code, field, general }
}
