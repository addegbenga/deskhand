import { useTranslation } from '@deskhand/i18n'
import { cn } from '@deskhand/ui'

export const SIGNUP_STEPS = ['account', 'verify', 'about_you', 'business', 'plan', 'done'] as const
export type SignupScreen = (typeof SIGNUP_STEPS)[number]

/** Compact progress for the six sign-up screens (PRD 27.1). */
export function SignupProgress({ current }: { current: SignupScreen }) {
  const { t } = useTranslation('auth')
  const index = SIGNUP_STEPS.indexOf(current)
  return (
    <div className="mb-8">
      <p className="tabular text-xs font-medium text-fg-muted">
        {t('signup.progress', { current: index + 1, total: SIGNUP_STEPS.length, step: t(`signup.steps.${current}`) })}
      </p>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {SIGNUP_STEPS.map((step, i) => (
          <span key={step} className={cn('h-1 flex-1 rounded-full', i <= index ? 'bg-brand' : 'bg-border')} />
        ))}
      </div>
    </div>
  )
}
