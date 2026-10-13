import { Languages } from 'lucide-react'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@deskhand/config'
import { LANGUAGES, setLanguage, useTranslation, type Language } from '@deskhand/i18n'
import type { PublicTenant } from '@deskhand/schemas'
import { brandStyle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@deskhand/ui'

function LanguageSwitcher({ languages }: { languages: string[] }) {
  const { t, i18n } = useTranslation('public')
  const options = LANGUAGES.filter((lang) => languages.includes(lang))
  if (options.length < 2) return null
  return (
    <Select value={i18n.language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger aria-label={t('language')} className="h-9 w-auto gap-2">
        <Languages className="size-4 text-fg-muted" aria-hidden />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {t(`common:languages.${lang}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Public shell (FE-DOC 5): minimal, branded with the tenant's color, language switcher, consent footer, Powered by. */
export function PublicShell({ tenant, children }: { tenant: PublicTenant; children: ReactNode }) {
  const { t } = useTranslation('public')
  return (
    <div style={brandStyle(tenant.brandColor)} className="flex min-h-dvh flex-col bg-bg">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center gap-3 px-4">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-fg"
          >
            {tenant.name.slice(0, 1)}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold">{tenant.name}</span>
          <LanguageSwitcher languages={tenant.languages} />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 px-4 py-5 text-xs text-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('consentFooter')}{' '}
            <a href={tenant.privacyHref} className="font-medium text-fg underline underline-offset-2">
              {t('privacy')}
            </a>
          </p>
          {tenant.showPoweredBy && (
            <a
              href="/"
              className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-2.5 py-1 hover:text-fg sm:self-auto"
            >
              {t('poweredBy', { brand: BRAND_NAME })}
            </a>
          )}
        </div>
      </footer>
    </div>
  )
}
