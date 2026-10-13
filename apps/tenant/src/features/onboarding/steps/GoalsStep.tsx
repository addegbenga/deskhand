import { CalendarCheck, Megaphone, MessageSquareReply, Star, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { GOAL_RECIPES } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { GoalSchema, type Goal } from '@deskhand/schemas'
import { Badge, Button, Checkbox, cn } from '@deskhand/ui'
import { StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

const ICONS: Record<Goal, LucideIcon> = {
  reply_faster: MessageSquareReply,
  more_bookings: CalendarCheck,
  collect_reviews: Star,
  run_promotions: Megaphone,
}

/** Step 3 (PRD 6.1): goals pick which automations we suggest. Nothing switches on until the owner says so. */
export function GoalsStep({ view }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('goals')
  const [goals, setGoals] = useState<Goal[]>(view.state.goals)
  const toggle = (goal: Goal, on: boolean) => setGoals((g) => (on ? [...g, goal] : g.filter((x) => x !== goal)))

  return (
    <StepFrame
      view={view}
      step="goals"
      title={t('steps.goals.title')}
      description={t('steps.goals.body')}
      onSave={() => actions.save({ goals })}
      primary={{ label: t('frame.continue'), pending: actions.pending, onClick: () => actions.complete({ goals }) }}
      secondary={
        goals.length === 0 && (
          <Button variant="ghost" onClick={() => actions.skip({ goals })} disabled={actions.pending}>
            {t('frame.skip')}
          </Button>
        )
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {GoalSchema.options.map((goal) => {
          const Icon = ICONS[goal]
          const on = goals.includes(goal)
          return (
            <label
              key={goal}
              className={cn(
                'flex cursor-pointer gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-fg-muted/40',
                on && 'border-brand bg-brand/5',
              )}
            >
              <Icon className={cn('mt-0.5 size-5 shrink-0 text-fg-muted', on && 'text-brand')} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{t(`goals.${goal}.title`)}</span>
                <span className="mt-1 block text-[13px] text-fg-muted">{t(`goals.${goal}.body`)}</span>
                <span className="mt-3 block text-xs font-medium text-fg-muted">{t('goals.recipes')}</span>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {GOAL_RECIPES[goal].map((recipe) => (
                    <Badge key={recipe} tone={on ? 'brand' : 'neutral'}>
                      {t(`recipes.${recipe}`)}
                    </Badge>
                  ))}
                </span>
              </span>
              <Checkbox checked={on} onCheckedChange={(v) => toggle(goal, v === true)} className="mt-0.5" />
            </label>
          )
        })}
      </div>
      <p className="mt-4 text-[13px] text-fg-muted">{t('goals.note')}</p>
    </StepFrame>
  )
}
