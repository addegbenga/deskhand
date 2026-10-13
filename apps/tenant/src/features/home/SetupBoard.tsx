import { Link } from '@tanstack/react-router'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { MilestoneSchema, ONBOARDING_STEPS, type Gate, type Milestone, type OnboardingView } from '@deskhand/schemas'
import { Button, usePermission } from '@deskhand/ui'
import { useOnboarding } from '../../api/onboarding'
import { useConnections, useJoinRequests, useTeam } from '../../api/settings'
import { useSession } from '../../api/queries'
import { connectionSetupItems } from '../../lib/setup-blockers'
import { teamSetupItems } from '../../lib/team-needs'
import { TeamNeedsList } from '../settings/TeamNeeds'

const MILESTONES = MilestoneSchema.options

function missingCopy(gate: Gate, t: (key: string, params?: Record<string, string | number>) => string) {
  return gate.missing.map((item) => t(item.key, item.params)).join(' ')
}

function MilestoneFix({ milestone, children }: { milestone: Milestone; children: React.ReactNode }) {
  const className = 'text-sm font-medium text-brand hover:underline'
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

function Board({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('home')
  const { t: tOnboarding } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation('common')
  const { account } = useSession()
  const blocking = view.gates.filter((gate) => gate.status === 'blocking')
  const manual = view.state.employee.mode === 'manual'
  const steps = ONBOARDING_STEPS.filter((step) => !(step === 'knowledge' && manual))
  const openSteps = steps.filter((step) => !view.state.completedSteps.includes(step))
  const relevantMilestones = account.aiMode === 'manual' ? MILESTONES.filter((m) => !['ai_taught', 'ai_live', 'autopilot_replies'].includes(m)) : MILESTONES
  const openMilestones = view.state.liveAt ? relevantMilestones.filter((m) => !account.milestones.includes(m)) : []
  const noServices = view.knowledge.servicesTotal === 0
  const team = useTeam()
  const joins = useJoinRequests()
  const connections = useConnections()
  const teamNeeds = teamSetupItems(team.data ?? [], joins.data ?? [])
  const connectionNeeds = connectionSetupItems(connections.data)
  const blockingTeam = teamNeeds.filter((item) => item.blocking)
  const otherTeam = teamNeeds.filter((item) => !item.blocking)
  if (!blocking.length && !openSteps.length && !openMilestones.length && !noServices && !teamNeeds.length && !connectionNeeds.length) return null

  return (
    <section className="mb-8 rounded-lg border border-border bg-surface p-4" aria-label={t('setupBoard.title')}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t('setupBoard.title')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('setupBoard.body')}</p>
        </div>
        {!view.state.liveAt && (
          <Button asChild size="sm">
            <Link to="/onboarding/$step" params={{ step: view.state.currentStep }}>
              {t('setupBoard.resume')}
              <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        )}
      </div>

      {(blocking.length > 0 || blockingTeam.length > 0 || connectionNeeds.length > 0) && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger">{t('setupBoard.blocking')}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('setupBoard.blocksGoLive')}</p>
          <ul className="mt-2 space-y-2">
            {blocking.map((gate) => (
              <li key={gate.id} className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tOnboarding(`gates.${gate.id}`)}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">{missingCopy(gate, tOnboarding)}</p>
                </div>
                <Link
                  className="shrink-0 text-sm font-medium text-brand hover:underline"
                  to="/onboarding/$step"
                  params={{ step: gate.step }}
                >
                  {t('setupBoard.fix')}
                </Link>
              </li>
            ))}
            {connectionNeeds.map((card) => (
              <li key={card.kind} className="flex items-start gap-2 rounded-md border border-danger/20 bg-danger/5 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{tCommon(`connections.${card.kind}`)}</p>
                  <p className="mt-0.5 text-sm text-fg-muted">
                    {tCommon(`connections.problems.${card.problem ?? 'unknown'}`)} {t('setupBoard.impactConnection')}
                  </p>
                </div>
                <Link className="shrink-0 text-sm font-medium text-brand hover:underline" to="/app/connections">
                  {t('setupBoard.fix')}
                </Link>
              </li>
            ))}
          </ul>
          {blockingTeam.length > 0 && team.data ? (
            <div className="mt-2">
              <TeamNeedsList members={team.data} joins={joins.data ?? []} items={blockingTeam} />
            </div>
          ) : null}
        </div>
      )}

      {noServices && (
        <p className="mt-3 rounded-md border border-attention/30 bg-attention/10 px-3 py-2 text-sm">
          {t('setupBoard.blocksBookings')}{' '}
          <Link className="font-medium text-brand hover:underline" to="/app/settings/$page" params={{ page: 'business' }}>
            {t('setupBoard.fix')}
          </Link>
        </p>
      )}

      {openSteps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('setupBoard.open')}</p>
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {openSteps.map((step) => {
              const gate = blocking.find((item) => item.step === step)
              return (
                <li key={step} className="flex items-start justify-between gap-3 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{tOnboarding(`steps.${step}.short`)}</p>
                    {gate ? <p className="text-xs text-danger">{missingCopy(gate, tOnboarding)}</p> : null}
                  </div>
                  <Link className="shrink-0 text-sm font-medium text-brand hover:underline" to="/onboarding/$step" params={{ step }}>
                    {t('setupBoard.fix')}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {otherTeam.length > 0 && team.data && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('setupBoard.team')}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('setupBoard.teamBody')}</p>
          <div className="mt-2">
            <TeamNeedsList members={team.data} joins={joins.data ?? []} items={otherTeam} />
          </div>
        </div>
      )}

      {openMilestones.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('setupBoard.milestones')}</p>
          <ul className="mt-2 space-y-2">
            {openMilestones.map((milestone) => (
              <li key={milestone} className="flex items-center justify-between gap-3">
                <span className="text-sm">{tCommon(`setup.milestones.${milestone}`)}</span>
                <MilestoneFix milestone={milestone}>{t('setupBoard.fix')}</MilestoneFix>
              </li>
            ))}
          </ul>
        </div>
      )}

    </section>
  )
}

/** Home surface for remaining setup and go-live blockers (PRD 29.1). */
export function SetupBoard() {
  const { allowed } = usePermission('connections.manage')
  const onboarding = useOnboarding()
  if (!allowed || !onboarding.data) return null
  return <Board view={onboarding.data} />
}

