import { getMarketPack } from '@deskhand/config'
import type { Account, PublicTenant } from '@deskhand/schemas'
import type { MockDb } from './db'
import { MockHttpError } from './http'
import { SCENARIOS } from './scenarios'
import { ensureSeeded } from './store'

export async function bySlug(slug: string): Promise<{ database: MockDb; account: Account }> {
  for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
    const database = await ensureSeeded(scenario.id)
    const account = await database.accounts.where('slug').equals(slug).first()
    if (account) return { database, account }
  }
  throw new MockHttpError('not_found', 'This page does not exist.')
}

export async function findAcross<T>(
  pick: (database: MockDb) => Promise<T | undefined>,
): Promise<{ database: MockDb; account: Account; value: T } | null> {
  for (const scenario of Object.values(SCENARIOS).filter((s) => s.available)) {
    const database = await ensureSeeded(scenario.id)
    const value = await pick(database)
    if (!value) continue
    const accountId = (value as { accountId?: string }).accountId
    const account = accountId ? await database.accounts.get(accountId) : await database.accounts.toCollection().first()
    if (!account) continue
    return { database, account, value }
  }
  return null
}

export async function publicTenantFor(database: MockDb, account: Account): Promise<PublicTenant> {
  const location = await database.locations.where('accountId').equals(account.id).first()
  const pack = getMarketPack(account.market)
  return {
    slug: account.slug,
    name: account.name,
    brandColor: account.brandColor,
    showPoweredBy: account.showPoweredBy,
    locale: location?.locale ?? pack.locale,
    languages: ['en', 'fr', 'ar'],
    city: location?.city ?? '',
    timezone: location?.timezone ?? pack.defaultTimezone,
    currency: location?.currency ?? pack.currency,
    privacyHref: `/privacy/${account.slug}`,
  }
}

export function waHref(phone: string | null | undefined, text?: string) {
  const digits = (phone ?? '').replace(/\D/g, '') || '2348000000000'
  const q = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${digits}${q}`
}
