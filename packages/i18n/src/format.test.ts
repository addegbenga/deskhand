import { describe, expect, it } from 'vitest'
import { formatDateTime, formatMoney, formatRelative, initials } from './format'

const lagos = { language: 'en', locale: 'en-NG', timeZone: 'Africa/Lagos' }
const now = new Date('2026-10-11T12:00:00Z')

describe('formatRelative (FE-DOC 4.6)', () => {
  it('is relative within 7 days', () => {
    expect(formatRelative(new Date('2026-10-11T11:55:00Z'), now, lagos)).toBe('5 minutes ago')
    expect(formatRelative(new Date('2026-10-10T12:00:00Z'), now, lagos)).toBe('yesterday')
    expect(formatRelative(new Date('2026-10-13T12:00:00Z'), now, lagos)).toBe('in 2 days')
  })

  it('is absolute after 7 days', () => {
    const result = formatRelative(new Date('2026-09-01T12:00:00Z'), now, lagos)
    expect(result).toMatch(/2026/)
    expect(result).not.toMatch(/ago/)
  })

  it('uses the UI language for words', () => {
    expect(formatRelative(new Date('2026-10-10T12:00:00Z'), now, { ...lagos, language: 'fr' })).toBe('hier')
  })
})

describe('formatDateTime', () => {
  it('renders in the location time zone, not the browser one', () => {
    const value = formatDateTime('2026-10-11T23:30:00Z', { locale: 'en-GB', timeZone: 'Africa/Lagos' }, { timeStyle: 'short' })
    expect(value).toBe('00:30')
  })
})

describe('formatMoney', () => {
  it('uses the market currency and drops decimals for whole amounts', () => {
    expect(formatMoney(35000, 'NGN', 'en-NG')).toMatch(/35,000/)
    expect(formatMoney(35000, 'NGN', 'en-NG')).not.toMatch(/\.00/)
    expect(formatMoney(12.5, 'GBP', 'en-GB')).toBe('£12.50')
  })
})

describe('initials', () => {
  it('takes up to two initials', () => {
    expect(initials('Amaka Obi')).toBe('AO')
    expect(initials('Funke Adebayo Ade')).toBe('FA')
    expect(initials('  Tola ')).toBe('T')
  })
})
