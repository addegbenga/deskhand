import i18next from 'i18next'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'
import { resources, NAMESPACES, type Namespace } from './resources'

export { useTranslation, Trans } from 'react-i18next'
export * from './format'
export { NAMESPACES, type Namespace }

export const LANGUAGES = ['en', 'fr', 'ar'] as const
export type Language = (typeof LANGUAGES)[number]

const RTL = new Set<string>(['ar'])
const STORAGE_KEY = 'deskhand-lang'

export function directionFor(language: string): 'ltr' | 'rtl' {
  return RTL.has(language.split('-')[0] ?? language) ? 'rtl' : 'ltr'
}

function storedLanguage(): Language {
  if (typeof localStorage === 'undefined') return 'en'
  const value = localStorage.getItem(STORAGE_KEY)
  return (LANGUAGES as readonly string[]).includes(value ?? '') ? (value as Language) : 'en'
}

function applyDocumentLanguage(language: string) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = language
  document.documentElement.dir = directionFor(language)
}

export function initI18n(defaultNS: Namespace = 'common') {
  if (i18next.isInitialized) return i18next
  const lng = storedLanguage()
  void i18next
    .use(ICU)
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',
      ns: [...NAMESPACES],
      defaultNS,
      interpolation: { escapeValue: false },
      returnNull: false,
      initAsync: false,
    })
  applyDocumentLanguage(lng)
  i18next.on('languageChanged', (language) => {
    applyDocumentLanguage(language)
    localStorage.setItem(STORAGE_KEY, language)
  })
  return i18next
}

export function setLanguage(language: Language) {
  void i18next.changeLanguage(language)
}

export { i18next }
