import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { SCENARIOS } from '@deskhand/mock-api/runtime'
import { brandStyle, Wordmark } from '@deskhand/ui'

/** Dev index of public pages. In production the root of the public domain is the marketing site. */
function PublicIndex() {
  const { t } = useTranslation('public')
  const scenarios = Object.values(SCENARIOS).filter((s) => s.available)
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <Wordmark className="text-lg" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('index.title')}</h1>
        <p className="mt-2 text-sm text-fg-muted">{t('index.body')}</p>
      </div>
      <ul className="grid gap-3">
        {scenarios.map((s) => (
          <li key={s.id}>
            <Link
                to="/b/$slug"
                params={{ slug: s.slug }}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-fg-muted/40"
                style={brandStyle(s.brandColor)}
              >
                <span aria-hidden className="flex size-9 items-center justify-center rounded-md bg-brand text-sm font-semibold text-brand-fg">
                  {s.business.slice(0, 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.business}</span>
                  <span className="block text-xs text-fg-muted">
                    {t(`devtools:industries.${s.industry}`)} · {s.locations[0]?.city}
                  </span>
                </span>
                <ArrowRight className="size-4 text-fg-muted rtl:rotate-180" aria-hidden />
            </Link>
            <div className="mt-2 flex flex-wrap gap-2 ps-12 text-xs">
              <Link className="underline" to="/embed/demo" search={{ slug: s.slug }}>
                {t('demo.title')}
              </Link>
              <Link className="underline" to="/l/$slug" params={{ slug: s.slug }}>
                {t('hub.title', { business: s.business })}
              </Link>
              <Link className="underline" to="/r/$slug" params={{ slug: s.slug }}>
                {t('review.cta')}
              </Link>
              <Link className="underline" to="/privacy/$slug" params={{ slug: s.slug }}>
                {t('privacyPage.title')}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-fg-muted">
        <Link className="underline" to="/f/$formId" params={{ formId: 'frm_A_lead' }}>
          {t('form.popup')}
        </Link>
        {' · '}
        <Link className="underline" to="/pay/$id" params={{ id: 'plink_A_1' }}>
          {t('pay.card')}
        </Link>
        {' · '}
        <Link className="underline" to="/preferences/$token" params={{ token: 'pref-amaka-braids' }}>
          {t('prefs.title')}
        </Link>
      </p>
    </main>
  )
}

export const Route = createFileRoute('/')({ component: PublicIndex })
