import { Check, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'
import { Progress } from './display'

export type StepStatus = 'done' | 'current' | 'todo' | 'skipped' | 'not_needed'

export type StepperItem = { id: string; label: string; status: StepStatus; hint?: string }

/** Vertical step list for wizards. Steps are buttons so people can go back to any step (FE-DOC 5). */
export function Stepper({
  steps,
  onSelect,
  className,
}: {
  steps: StepperItem[]
  onSelect?: (id: string) => void
  className?: string
}) {
  const { t } = useTranslation('common')
  return (
    <ol className={cn('flex flex-col', className)}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        const muted = step.status === 'not_needed'
        return (
          <li key={step.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden
                className={cn('absolute start-3 top-7 bottom-1 w-px -translate-x-1/2 rtl:translate-x-1/2', step.status === 'done' ? 'bg-brand' : 'bg-border')}
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular',
                step.status === 'done' && 'border-brand bg-brand text-brand-fg',
                step.status === 'current' && 'border-brand bg-surface text-brand ring-4 ring-brand/15',
                step.status === 'todo' && 'border-border bg-surface text-fg-muted',
                (step.status === 'skipped' || muted) && 'border-dashed border-border bg-surface text-fg-muted',
              )}
            >
              {step.status === 'done' ? <Check className="size-3.5" strokeWidth={3} /> : muted ? <Minus className="size-3" /> : index + 1}
            </span>
            <button
              type="button"
              disabled={!onSelect || muted}
              onClick={() => onSelect?.(step.id)}
              aria-current={step.status === 'current' ? 'step' : undefined}
              className={cn(
                'flex min-h-6 flex-col items-start rounded-sm text-start text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-default',
                step.status === 'current' ? 'font-semibold text-fg' : 'text-fg-muted',
                onSelect && !muted && 'hover:text-fg',
              )}
            >
              <span className={cn(muted && 'line-through decoration-fg-muted/40')}>{step.label}</span>
              {step.hint && <span className="text-xs font-normal text-fg-muted">{step.hint}</span>}
              <span className="sr-only">{t(`wizard.status.${step.status}`)}</span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Wizard page: header, step list on wide screens, a progress bar on phones, content and a sticky footer
 * with one primary action. Spacious on purpose: people learn here (FE-DOC 4.1).
 */
export function WizardLayout({
  header,
  steps,
  onSelectStep,
  current,
  total,
  title,
  description,
  aside,
  footer,
  children,
}: {
  header: ReactNode
  steps: StepperItem[]
  onSelectStep?: (id: string) => void
  current: number
  total: number
  title: string
  description?: ReactNode
  aside?: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const { t } = useTranslation('common')
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">{header}</header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-10 px-4 pt-6 pb-28 md:px-8 md:pt-10">
        <nav aria-label={t('wizard.steps')} className="w-56 shrink-0 max-lg:hidden">
          <div className="sticky top-24">
            <Stepper steps={steps} onSelect={onSelectStep} />
          </div>
        </nav>
        <main id="main" className="min-w-0 flex-1">
          <div className="mb-6 lg:hidden">
            <p className="text-xs font-medium text-fg-muted tabular">{t('wizard.stepOf', { current, total })}</p>
            <Progress value={(current / total) * 100} className="mt-2" aria-label={t('wizard.stepOf', { current, total })} />
          </div>
          <p className="text-xs font-medium tracking-wide text-fg-muted uppercase max-lg:hidden tabular">
            {t('wizard.stepOf', { current, total })}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-balance md:text-[28px]">{title}</h1>
          {description && <div className="mt-2 max-w-2xl text-[15px] text-fg-muted">{description}</div>}
          <div className={cn('mt-8', aside && 'grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]')}>
            <div className="min-w-0">{children}</div>
            {aside && <aside className="min-w-0">{aside}</aside>}
          </div>
        </main>
      </div>
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-8">{footer}</div>
      </footer>
    </div>
  )
}
