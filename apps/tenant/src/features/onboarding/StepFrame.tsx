import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, LogOut } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { ONBOARDING_STEPS, type OnboardingStep, type OnboardingView } from '@deskhand/schemas'
import { Button, WizardLayout, Wordmark, type StepperItem } from '@deskhand/ui'
import { useSaveStep } from '../../api/onboarding'
import { LanguageSwitch } from '../auth/AuthLayout'

export function isManual(view: OnboardingView) {
  return view.state.employee.mode === 'manual'
}

/** Steps a person sees, in order; Manual only drops the knowledge interview (PRD 15.21). */
export function visibleSteps(view: OnboardingView): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => !(step === 'knowledge' && isManual(view)))
}

function stepItems(view: OnboardingView, current: OnboardingStep, label: (step: OnboardingStep) => string): StepperItem[] {
  const { completedSteps, skippedSteps } = view.state
  return ONBOARDING_STEPS.map((step) => ({
    id: step,
    label: label(step),
    status:
      step === current
        ? 'current'
        : step === 'knowledge' && isManual(view)
          ? 'not_needed'
          : completedSteps.includes(step)
            ? 'done'
            : skippedSteps.includes(step)
              ? 'skipped'
              : 'todo',
  }))
}

/** Save, mark the step done (or skipped) and move on to the next visible step. */
export function useStepActions(step: OnboardingStep) {
  const navigate = useNavigate()
  const save = useSaveStep()
  const goTo = (target: OnboardingStep) => void navigate({ to: '/onboarding/$step', params: { step: target } })
  const advance = (view: OnboardingView) => {
    const visible = visibleSteps(view)
    const next = ONBOARDING_STEPS.slice(ONBOARDING_STEPS.indexOf(step) + 1).find((s) => visible.includes(s))
    if (next) goTo(next)
  }
  return {
    pending: save.isPending,
    error: save.error,
    goTo,
    save: (data?: object) => save.mutateAsync({ step, data }),
    complete: (data?: object) => save.mutate({ step, data, complete: true }, { onSuccess: advance }),
    skip: (data?: object) => save.mutate({ step, data, skip: true }, { onSuccess: advance }),
  }
}

export type PrimaryAction = { label: string; onClick: () => void; disabled?: boolean; pending?: boolean }

/** Every onboarding step: the wizard frame, a "save and exit" way out, Back, and one primary action. */
export function StepFrame({
  view,
  step,
  title,
  description,
  aside,
  primary,
  secondary,
  onSave,
  children,
}: {
  view: OnboardingView
  step: OnboardingStep
  title: string
  description?: ReactNode
  aside?: ReactNode
  primary: PrimaryAction
  secondary?: ReactNode
  /** Keeps unsaved edits when leaving; resolves once saved. */
  onSave?: () => Promise<unknown>
  children: ReactNode
}) {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const order = visibleSteps(view)
  const index = Math.max(0, order.indexOf(step))
  const furthest = ONBOARDING_STEPS.indexOf(view.state.currentStep)
  const reachable = (target: OnboardingStep) =>
    ONBOARDING_STEPS.indexOf(target) <= furthest || view.state.completedSteps.includes(target) || Boolean(view.state.liveAt)
  const goTo = (target: string) => void navigate({ to: '/onboarding/$step', params: { step: target as OnboardingStep } })
  const exit = async () => {
    try {
      await onSave?.()
    } finally {
      void navigate({ to: '/app/home' })
    }
  }

  return (
    <WizardLayout
      header={
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
          <Wordmark className="text-base" />
          <span className="text-sm text-fg-muted max-sm:hidden">{t('frame.setup')}</span>
          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitch />
            <Button variant="ghost" size="sm" onClick={() => void exit()}>
              <LogOut className="rtl:-scale-x-100" />
              <span className="max-sm:sr-only">{t('frame.saveExit')}</span>
            </Button>
          </div>
        </div>
      }
      steps={stepItems(view, step, (s) => t(`steps.${s}.short`))}
      onSelectStep={(target) => {
        if (reachable(target as OnboardingStep)) goTo(target)
      }}
      current={index + 1}
      total={order.length}
      title={title}
      description={description}
      aside={aside}
      footer={
        <>
          {index > 0 && (
            <Button variant="ghost" onClick={() => goTo(order[index - 1]!)}>
              <ArrowLeft className="rtl:-scale-x-100" />
              {t('frame.back')}
            </Button>
          )}
          <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
            {secondary}
            <Button onClick={primary.onClick} disabled={primary.disabled || primary.pending}>
              {primary.label}
              <ArrowRight className="rtl:-scale-x-100" />
            </Button>
          </div>
        </>
      }
    >
      {children}
    </WizardLayout>
  )
}

/** A titled block inside a step. */
export function Section({ title, description, action, children }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-border pb-8 not-first:pt-8 last:border-b-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 max-w-xl text-sm text-fg-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
