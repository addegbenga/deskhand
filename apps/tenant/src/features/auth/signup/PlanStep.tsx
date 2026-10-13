import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import type { Signup } from '@deskhand/schemas'
import { Badge, Button, ChoiceCard, ChoiceCards, FieldError } from '@deskhand/ui'
import { usePatchSignup } from '../../../api/auth'
import { AuthHeading } from '../AuthLayout'
import { useAuthErrors } from '../errors'
import { SignupProgress } from './SignupProgress'

type PlanId = 'starter' | 'growth' | 'pro'
const PLANS: PlanId[] = ['starter', 'growth', 'pro']
const FEATURES: Record<PlanId, string[]> = {
  starter: ['seats', 'channels', 'replies'],
  growth: ['seats', 'channels', 'replies', 'campaigns'],
  pro: ['seats', 'channels', 'replies', 'campaigns', 'locations'],
}

/** Sign-up step 5 (PRD 27.1): entry plan preselected, the trial starts now, no card needed. */
export function PlanStep({ signup, onDone, onBack }: { signup: Signup; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation('auth')
  const patch = usePatchSignup()
  const errors = useAuthErrors(patch.error)
  const [plan, setPlan] = useState<PlanId>(signup.plan ?? 'starter')

  return (
    <>
      <SignupProgress current="plan" />
      <AuthHeading title={t('signup.plan.title')} description={t('signup.plan.body')} />
      <ChoiceCards value={plan} onValueChange={(value) => setPlan(value as PlanId)}>
        {PLANS.map((id) => (
          <ChoiceCard
            key={id}
            value={id}
            title={t(`signup.plan.plans.${id}.name`)}
            badge={id === 'starter' ? <Badge tone="brand">{t('signup.plan.recommended')}</Badge> : undefined}
            description={t(`signup.plan.plans.${id}.summary`)}
          >
            <span className="mt-3 grid gap-1.5 text-[13px] text-fg-muted sm:grid-cols-2">
              {FEATURES[id].map((feature) => (
                <span key={feature} className="flex items-center gap-2">
                  <Check className="size-3.5 shrink-0 text-success" aria-hidden />
                  {t(`signup.plan.plans.${id}.${feature}`)}
                </span>
              ))}
            </span>
          </ChoiceCard>
        ))}
      </ChoiceCards>
      <p className="mt-4 text-[13px] text-fg-muted">{t('signup.plan.trialNote')}</p>
      {errors.general() && <FieldError className="mt-3">{errors.general()}</FieldError>}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          {t('actions.back')}
        </Button>
        <Button size="lg" className="flex-1" disabled={patch.isPending} onClick={() => patch.mutate({ plan }, { onSuccess: onDone })}>
          {t('signup.plan.cta')}
        </Button>
      </div>
    </>
  )
}
