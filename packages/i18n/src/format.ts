const DAY_MS = 24 * 60 * 60 * 1000

export type LocaleContext = {
  /** UI language, for words such as 'yesterday'. */
  language: string
  /** The location's locale, for number and date formats (FR-L.7). */
  locale: string
  timeZone: string
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}

export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value)
}

export function formatDateTime(
  date: Date | string,
  ctx: Pick<LocaleContext, 'locale' | 'timeZone'>,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(ctx.locale, { ...options, timeZone: ctx.timeZone }).format(
    new Date(date),
  )
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', DAY_MS],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
]

/** Relative within 7 days, absolute after (FE-DOC 4.6). Pair with formatDateTime for the hover. */
export function formatRelative(date: Date | string, now: Date, ctx: LocaleContext): string {
  const diff = new Date(date).getTime() - now.getTime()
  if (Math.abs(diff) >= 7 * DAY_MS) {
    return formatDateTime(date, ctx, { dateStyle: 'medium' })
  }
  const rtf = new Intl.RelativeTimeFormat(ctx.language, { numeric: 'auto' })
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'second') {
      return rtf.format(Math.round(diff / ms), unit)
    }
  }
  return rtf.format(0, 'second')
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
