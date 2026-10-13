import type { MarketCode } from '@deskhand/schemas'

/**
 * Countries offered at sign-up and the market pack each one uses.
 * Null means no market pack yet: the person joins the waitlist (FR-M.2).
 * Names are rendered with Intl.DisplayNames in the person's language.
 */
export const SIGNUP_COUNTRIES: Record<string, MarketCode | null> = {
  NG: 'NG',
  GH: 'GH',
  KE: 'KE',
  ZA: 'ZA',
  GB: 'UK',
  IE: 'EU',
  FR: 'EU',
  DE: 'EU',
  NL: 'EU',
  BE: 'EU',
  ES: 'EU',
  IT: 'EU',
  PT: 'EU',
  US: 'US',
  CA: null,
  IN: null,
  BR: null,
  EG: null,
  AE: null,
  RW: null,
  UG: null,
  TZ: null,
  CM: null,
  SN: null,
  CI: null,
}

export function marketForCountry(country: string): MarketCode | null {
  return SIGNUP_COUNTRIES[country.toUpperCase()] ?? null
}

const TIMEZONE_COUNTRY: Record<string, string> = {
  'Africa/Lagos': 'NG',
  'Africa/Accra': 'GH',
  'Africa/Nairobi': 'KE',
  'Africa/Johannesburg': 'ZA',
  'Europe/London': 'GB',
  'Europe/Dublin': 'IE',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Europe/Amsterdam': 'NL',
  'Europe/Brussels': 'BE',
  'Europe/Madrid': 'ES',
  'Europe/Rome': 'IT',
  'Europe/Lisbon': 'PT',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'Asia/Kolkata': 'IN',
  'America/Sao_Paulo': 'BR',
  'Africa/Cairo': 'EG',
  'Asia/Dubai': 'AE',
}

/** Best guess at the visitor's country from the device time zone and language, editable on the form. */
export function detectCountry(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const fromZone = TIMEZONE_COUNTRY[zone]
  if (fromZone) return fromZone
  const region = typeof navigator === 'undefined' ? undefined : new Intl.Locale(navigator.language).region
  return region && region in SIGNUP_COUNTRIES ? region : 'NG'
}

/** Data protection law named in generated consent wording. Proper nouns, not UI copy. */
export const PRIVACY_LAW: Record<MarketCode, string> = {
  NG: 'Nigeria Data Protection Act 2023',
  GH: 'Ghana Data Protection Act 2012',
  KE: 'Kenya Data Protection Act 2019',
  ZA: 'Protection of Personal Information Act (POPIA)',
  UK: 'UK GDPR and PECR',
  EU: 'GDPR and the ePrivacy Directive',
  US: 'TCPA and CAN-SPAM',
}

export const LEGAL_VERSIONS = { terms: '2026-09', dpa: '2026-09' }
