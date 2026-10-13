import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { ONBOARDING_STEPS, type OnboardingView } from '@deskhand/schemas'
import { Button, usePermission } from '@deskhand/ui'
import { useOnboarding } from '../../api/onboarding'

function Board({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('home')
  const { t: tOnboarding } = useTranslation('onboarding')
  if (view.state.liveAt) return null

  const manual = view.state.employee.mode === 'manual'
  const steps = ONBOARDING_STEPS.filter((step) => !(step === 'knowledge' && manual))
  const finished = new Set([...view.state.completedSteps, ...view.state.skippedSteps])
  const done = steps.filter((step) => finished.has(step)).length
  const blocking = view.gates.find((gate) => gate.status === 'blocking')

  return (
    <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3" aria-label={t('setupBoard.title')}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">{t('setupBoard.title')}</h2>
        <p className="mt-0.5 text-sm text-fg-muted">
          {t('setupBoard.progress', { done, total: steps.length })}
          {blocking ? ` ${tOnboarding(`gates.${blocking.id}`)}` : null}
        </p>
      </div>
      <Button asChild size="sm">
        <Link to="/onboarding/$step" params={{ step: view.state.currentStep }}>
          {t('setupBoard.resume')}
          <ArrowRight className="rtl:-scale-x-100" />
        </Link>
      </Button>
    </section>
  )
}

/** Compact resume on Home until go-live. Remaining setup lives in the header pill (PRD 29.1). */
export function SetupBoard() {
  const { allowed } = usePermission('connections.manage')
  const onboarding = useOnboarding()
  if (!allowed || !onboarding.data) return null
  return <Board view={onboarding.data} />
}
