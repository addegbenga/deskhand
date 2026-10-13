import { SIGNUP_COUNTRIES } from '@deskhand/config'

/** Countries sorted by their name in the current language. */
export function countryOptions(language: string) {
  const names = new Intl.DisplayNames([language], { type: 'region' })
  return Object.entries(SIGNUP_COUNTRIES)
    .map(([code, market]) => ({ code, market, name: names.of(code) ?? code }))
    .sort((a, b) => a.name.localeCompare(b.name, language))
}

export function countryName(code: string, language: string) {
  return new Intl.DisplayNames([language], { type: 'region' }).of(code) ?? code
}
