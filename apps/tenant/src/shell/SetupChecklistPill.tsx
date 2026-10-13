import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, Circle } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { MilestoneSchema, ONBOARDING_STEPS, type Milestone, type OnboardingView } from '@deskhand/schemas'
import { Button, cn, Popover, PopoverContent, PopoverTrigger, Progress, usePermission } from '@deskhand/ui'
import { useOnboarding } from '../api/onboarding'
import { useSession } from '../api/queries'
import { useConnections, useJoinRequests, useTeam } from '../api/settings'
import { connectionSetupItems, extraBlockingCount } from '../lib/setup-blockers'
import { teamSetupItems } from '../lib/team-needs'

const MILESTONES = MilestoneSchema.options

function Ring({ percent }: { percent: number }) {
  return (
    <span className="relative size-4" aria-hidden>
      <svg viewBox="0 0 16 16" className="size-4 -rotate-90">
        <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-brand" strokeDasharray={`${(percent / 100) * 40.8} 40.8`} />
      </svg>
    </span>
  )
}

function Row({ complete, label, detail }: { complete: boolean; label: string; detail?: string }) {
  const { t } = useTranslation('common')
  return (
    <>
      {complete ? (
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-success-fg">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      ) : (
        <Circle className="mt-0.5 size-4 shrink-0 text-fg-muted" aria-hidden />
      )}
      <span className={cn('min-w-0', complete && 'text-fg-muted line-through')}>
        {label}
        {detail && !complete ? <span className="mt-0.5 block text-xs font-normal text-danger no-underline">{detail}</span> : null}
      </span>
      <span className="sr-only">{complete ? t('setup.done') : t('setup.todo')}</span>
    </>
  )
}

function MilestoneLink({ milestone, children }: { milestone: Milestone; children: React.ReactNode }) {
  const className = 'flex items-start gap-2 text-sm hover:text-brand'
  switch (milestone) {
    case 'profile_complete':
      return (
        <Link className={className} to="/app/settings/$page" params={{ page: 'business' }}>
          {children}
        </Link>
      )
    case 'first_channel_live':
      return (
        <Link className={className} to="/app/connections">
          {children}
        </Link>
      )
    case 'ai_taught':
      return (
        <Link className={className} to="/app/ai/knowledge">
          {children}
        </Link>
      )
    case 'ai_live':
    case 'autopilot_replies':
      return (
        <Link className={className} to="/app/ai/employees">
          {children}
        </Link>
      )
    case 'first_lead_handled':
      return (
        <Link className={className} to="/app/inbox">
          {children}
        </Link>
      )
    case 'first_booking_or_payment':
      return (
        <Link className={className} to="/app/bookings">
          {children}
        </Link>
      )
  }
}

/** Before go-live: the remaining setup steps, with a way back in. Steps not needed for Manual only drop out. */
function SetupSteps({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('common')
  const { t: tOnboarding } = useTranslation('onboarding')
  const manual = view.state.employee.mode === 'manual'
  const steps = ONBOARDING_STEPS.filter((s) => !(s === 'knowledge' && manual))
  const done = steps.filter((s) => view.state.completedSteps.includes(s)).length
  const percent = Math.round((done / steps.length) * 100)
  const blocking = view.gates.filter((gate) => gate.status === 'blocking').length
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-surface-2"
        >
          <Ring percent={percent} />
          {t('setup.stepsPill', { done, total: steps.length })}
          {blocking > 0 ? <span className="text-danger">{t('setup.blocking', { count: blocking })}</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">{t('setup.finishTitle')}</p>
        <p className="mt-1 text-sm text-fg-muted">{t('setup.finishBody')}</p>
        <Progress value={percent} className="mt-3" aria-label={t('setup.stepsPill', { done, total: steps.length })} />
        <ul className="mt-3 flex flex-col gap-2">
          {steps.map((s) => {
            const complete = view.state.completedSteps.includes(s)
            const gate = view.gates.find((item) => item.step === s && item.status === 'blocking')
            const detail = gate?.missing.map((item) => tOnboarding(item.key, item.params)).join(' ')
            const label = tOnboarding(`steps.${s}.short`)
            return (
              <li key={s}>
                {complete ? (
                  <span className="flex items-start gap-2 text-sm">
                    <Row complete label={label} />
                  </span>
                ) : (
                  <Link className="flex items-start gap-2 text-sm hover:text-brand" to="/onboarding/$step" params={{ step: s }}>
                    <Row complete={false} label={label} detail={detail} />
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
        <Button asChild size="sm" className="mt-4 w-full">
          <Link to="/onboarding/$step" params={{ step: view.state.currentStep }}>
            {t('setup.resume')}
            <ArrowRight className="rtl:-scale-x-100" />
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost" className="mt-1 w-full">
          <Link to="/app/home">{t('setup.seeBoard')}</Link>
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** After go-live: activation milestones until they are all done (PRD 6.4, 28.2). */
function Milestones({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('common')
  const { t: tOnboarding } = useTranslation('onboarding')
  const { t: tSettings } = useTranslation('settings')
  const { account } = useSession()
  const team = useTeam()
  const joins = useJoinRequests()
  const connections = useConnections()
  const relevant = account.aiMode === 'manual' ? MILESTONES.filter((m) => !['ai_taught', 'ai_live', 'autopilot_replies'].includes(m)) : MILESTONES
  const done = relevant.filter((m) => account.milestones.includes(m)).length
  const blocking = view.gates.filter((gate) => gate.status === 'blocking')
  const teamNeeds = teamSetupItems(team.data ?? [], joins.data ?? [])
  const connectionNeeds = connectionSetupItems(connections.data)
  const extraBlocking = extraBlockingCount(team.data ?? [], joins.data ?? [], connections.data)
  const blockingCount = blocking.length + extraBlocking
  if (done === relevant.length && blockingCount === 0) return null
  const percent = Math.round((done / relevant.length) * 100)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[13px] font-medium transition-colors hover:bg-surface-2"
        >
          <Ring percent={percent} />
          {t('setup.pill', { done, total: relevant.length })}
          {blockingCount > 0 ? <span className="text-danger">{t('setup.blocking', { count: blockingCount })}</span> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="text-sm font-semibold">{t('setup.title')}</p>
        <p className="mt-1 text-sm text-fg-muted">{t('setup.body')}</p>
        <Progress value={percent} className="mt-3" aria-label={t('setup.pill', { done, total: relevant.length })} />
        {blockingCount > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {blocking.map((gate) => (
              <li key={gate.id}>
                <Link className="flex flex-col gap-0.5 text-sm hover:text-brand" to="/onboarding/$step" params={{ step: gate.step }}>
                  <span className="font-medium text-danger">{tOnboarding(`gates.${gate.id}`)}</span>
                  <span className="text-xs text-fg-muted">{gate.missing.map((item) => tOnboarding(item.key, item.params)).join(' ')}</span>
                </Link>
              </li>
            ))}
            {connectionNeeds.map((card) => (
              <li key={card.kind}>
                <Link className="flex flex-col gap-0.5 text-sm hover:text-brand" to="/app/connections">
                  <span className="font-medium text-danger">{t(`connections.${card.kind}`)}</span>
                  <span className="text-xs text-fg-muted">{t(`connections.problems.${card.problem ?? 'unknown'}`)}</span>
                </Link>
              </li>
            ))}
            {teamNeeds
              .filter((item) => item.blocking)
              .map((item) => (
                <li key={item.id}>
                  {item.kind === 'calendar' ? (
                    <Link className="flex flex-col gap-0.5 text-sm hover:text-brand" to="/app/staff">
                      <span className="font-medium text-danger">{tSettings('team.needCalendar', { name: item.name })}</span>
                      <span className="text-xs text-fg-muted">{tSettings('team.impactCalendar')}</span>
                    </Link>
                  ) : (
                    <Link className="flex flex-col gap-0.5 text-sm hover:text-brand" to="/app/settings/$page" params={{ page: 'team' }}>
                      <span className="font-medium text-danger">{tSettings('team.needMfaRequired', { name: item.name })}</span>
                      <span className="text-xs text-fg-muted">{tSettings('team.impactMfaRequired')}</span>
                    </Link>
                  )}
                </li>
              ))}
          </ul>
        )}
        <ul className="mt-3 flex flex-col gap-2">
          {relevant.map((m) => {
            const complete = account.milestones.includes(m)
            return (
              <li key={m}>
                {complete ? (
                  <span className="flex items-start gap-2 text-sm">
                    <Row complete label={t(`setup.milestones.${m}`)} />
                  </span>
                ) : (
                  <MilestoneLink milestone={m}>
                    <Row complete={false} label={t(`setup.milestones.${m}`)} />
                  </MilestoneLink>
                )}
              </li>
            )
          })}
        </ul>
        <Button asChild size="sm" variant="ghost" className="mt-4 w-full">
          <Link to="/app/home">{t('setup.seeBoard')}</Link>
        </Button>
      </PopoverContent>
    </Popover>
  )
}

/** Setup belongs to people who can manage the AI and connections. */
export function SetupChecklistPill() {
  const { allowed } = usePermission('connections.manage')
  if (!allowed) return null
  return <SetupPillForManager />
}

function SetupPillForManager() {
  const onboarding = useOnboarding()
  if (!onboarding.data) return null
  return onboarding.data.state.liveAt ? <Milestones view={onboarding.data} /> : <SetupSteps view={onboarding.data} />
}
