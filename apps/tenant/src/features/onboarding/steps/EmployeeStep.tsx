import { Bot, Hand } from 'lucide-react'
import { useState } from 'react'
import { EMPLOYEE_NAMES } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { ToneSchema, type EmployeeChoice } from '@deskhand/schemas'
import { AIBadge, AISurface, Badge, ChoiceCard, ChoiceCards, cn, FieldError, Input, Label } from '@deskhand/ui'
import { Section, StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

/** Step 7 (PRD 6.1, 15.21): create the AI employee, or run Manual only for now. Both paths reach go-live. */
export function EmployeeStep({ view, session }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('employee')
  const [choice, setChoice] = useState<EmployeeChoice>({ ...view.state.employee, tone: view.state.employee.tone ?? view.state.profile.tone })
  const [touched, setTouched] = useState(false)
  const names = EMPLOYEE_NAMES[session.account.market]
  const valid = choice.mode === 'manual' || (choice.mode === 'ai' && choice.name.trim().length >= 2)
  const knowledgeSkipped = view.state.skippedSteps.includes('knowledge') || !view.state.completedSteps.includes('knowledge')

  return (
    <StepFrame
      view={view}
      step="employee"
      title={t('steps.employee.title')}
      description={t('steps.employee.body')}
      onSave={() => (valid ? actions.save({ ...choice, name: choice.name.trim() }) : Promise.resolve())}
      primary={{
        label: t('frame.continue'),
        pending: actions.pending,
        onClick: () => {
          setTouched(true)
          if (valid) actions.complete({ ...choice, name: choice.name.trim() })
        },
      }}
    >
      <ChoiceCards value={choice.mode ?? ''} onValueChange={(mode) => setChoice((c) => ({ ...c, mode: mode as EmployeeChoice['mode'] }))} className="md:grid-cols-2">
        <ChoiceCard value="ai" icon={<Bot />} title={t('employee.ai')} description={t('employee.aiBody')} badge={<Badge tone="brand">{t('employee.recommended')}</Badge>} />
        <ChoiceCard value="manual" icon={<Hand />} title={t('employee.manual')} description={t('employee.manualBody')} />
      </ChoiceCards>
      {touched && !choice.mode && <FieldError className="mt-3">{t('employee.pick')}</FieldError>}

      {choice.mode === 'ai' && (
        <div className="mt-8">
          <Section title={t('employee.nameTitle')} description={t('employee.nameBody')}>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setChoice((c) => ({ ...c, name }))}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      choice.name === name ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:border-fg-muted/40',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="flex max-w-xs flex-col gap-1.5">
                <Label htmlFor="em-name">{t('employee.name')}</Label>
                <Input id="em-name" value={choice.name} onChange={(e) => setChoice((c) => ({ ...c, name: e.target.value }))} aria-invalid={(touched && !valid) || undefined} />
                {touched && !valid && <FieldError>{t('errors.required')}</FieldError>}
              </div>
            </div>
          </Section>
          <Section title={t('employee.toneTitle')}>
            <ChoiceCards value={choice.tone} onValueChange={(tone) => setChoice((c) => ({ ...c, tone: tone as EmployeeChoice['tone'] }))} className="sm:grid-cols-3">
              {ToneSchema.options.map((tone) => (
                <ChoiceCard key={tone} value={tone} title={t(`tones.${tone}.name`)} />
              ))}
            </ChoiceCards>
          </Section>
          <Section title={t('employee.previewTitle')} description={t('employee.previewBody')}>
            <AISurface>
              <div className="mb-2">
                <AIBadge name={choice.name.trim() || undefined} />
              </div>
              <p className="text-sm">{t(`employee.greeting.${choice.tone}`, { name: choice.name.trim() || names[0], business: view.state.profile.name })}</p>
            </AISurface>
            {knowledgeSkipped && <p className="mt-3 text-[13px] text-attention">{t('employee.needsKnowledge')}</p>}
          </Section>
        </div>
      )}

      {choice.mode === 'manual' && <p className="mt-6 max-w-xl rounded-md bg-surface-2 p-4 text-sm text-fg-muted">{t('employee.manualNote')}</p>}
    </StepFrame>
  )
}
