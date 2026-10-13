import { Check, Languages } from 'lucide-react'
import type { ReactNode } from 'react'
import { BRAND_NAME } from '@deskhand/config'
import { LANGUAGES, setLanguage, useTranslation, type Language } from '@deskhand/i18n'
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  Wordmark,
} from '@deskhand/ui'

export function LanguageSwitch({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common')
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className} aria-label={t('account.language')}>
          <Languages />
          {t(`languages.${i18n.language as Language}`)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={i18n.language} onValueChange={(value) => setLanguage(value as Language)}>
          {LANGUAGES.map((language) => (
            <DropdownMenuRadioItem key={language} value={language}>
              {t(`languages.${language}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Registration, login and recovery frame: a calm brand panel on wide screens and one focused form. */
export function AuthLayout({ children, wide, aside }: { children: ReactNode; wide?: boolean; aside?: ReactNode }) {
  const { t } = useTranslation('auth')
  const points = ['replies', 'bookings', 'control'] as const
  return (
    <div className="flex min-h-dvh bg-bg">
      <aside className="relative hidden w-[26rem] shrink-0 flex-col justify-between border-e border-border bg-surface p-10 lg:flex">
        <Wordmark className="text-lg" />
        <div>
          <p className="text-2xl leading-snug font-semibold text-balance">{t('layout.tagline', { brand: BRAND_NAME })}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {points.map((point) => (
              <li key={point} className="flex gap-3 text-[15px] text-fg-muted">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {t(`layout.points.${point}`)}
              </li>
            ))}
          </ul>
          {aside}
        </div>
        <p className="text-xs text-fg-muted">{t('layout.footer', { brand: BRAND_NAME })}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between px-4 sm:px-8">
          <Wordmark className="text-base lg:invisible" />
          <LanguageSwitch />
        </header>
        <main id="main" className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:items-center sm:px-8">
          <div className={cn('w-full', wide ? 'max-w-2xl' : 'max-w-md')}>{children}</div>
        </main>
      </div>
    </div>
  )
}

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-balance">{title}</h1>
      {description && <p className="mt-2 text-[15px] text-fg-muted">{description}</p>}
    </div>
  )
}
