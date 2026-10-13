import { Hourglass } from 'lucide-react'
import { BRAND_NAME } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import type { Signup } from '@deskhand/schemas'
import { Button } from '@deskhand/ui'
import { useAbandonSignup } from '../../../api/auth'
import { countryName } from '../countries'

/** Countries without a market pack join a waitlist instead of getting an account (FR-M.2). */
export function WaitlistStep({ signup }: { signup: Signup }) {
  const { t, i18n } = useTranslation('auth')
  const abandon = useAbandonSignup()
  return (
    <div className="text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-info/10 text-info">
        <Hourglass className="size-5" aria-hidden />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-balance">
        {t('signup.waitlist.title', { brand: BRAND_NAME, country: countryName(signup.country, i18n.language) })}
      </h1>
      <p className="mt-3 text-[15px] text-fg-muted">{t('signup.waitlist.body', { email: signup.email })}</p>
      <Button variant="outline" className="mt-8" disabled={abandon.isPending} onClick={() => abandon.mutate()}>
        {t('signup.waitlist.startOver')}
      </Button>
    </div>
  )
}
