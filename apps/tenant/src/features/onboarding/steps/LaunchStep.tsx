import { Link } from '@tanstack/react-router'
import { CircleCheck, CircleDashed, CircleMinus, ExternalLink, PartyPopper, Play, Send, ThumbsDown, ThumbsUp, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import {
  REQUIRED_SANDBOX_SCRIPTS,
  SandboxScriptSchema,
  type ChannelKind,
  type Gate,
  type OnboardingView,
  type SandboxChatReply,
  type SandboxRun,
  type Session,
} from '@deskhand/schemas'
import {
  AIBadge,
  AISurface,
  Badge,
  Button,
  Card,
  cn,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@deskhand/ui'
import { isApiError } from '../../../api/client'
import {
  useAcceptAllSandbox,
  useConfirmHandoff,
  useGoLive,
  useRunSandbox,
  useSandboxChat,
  useSandboxVerdict,
  useSetHandoff,
  useTestMessage,
} from '../../../api/onboarding'
import { isConnected } from './ChannelsStep'
import { isManual, Section, StepFrame } from '../StepFrame'
import type { StepProps } from './types'

const ALL_SCRIPTS = SandboxScriptSchema.options

function GateRow({ gate }: { gate: Gate }) {
  const { t } = useTranslation('onboarding')
  const Icon = gate.status === 'done' ? CircleCheck : gate.status === 'not_needed' ? CircleMinus : CircleDashed
  return (
    <li className="flex gap-2.5 py-2.5">
      <Icon
        className={cn('mt-0.5 size-4 shrink-0', gate.status === 'done' ? 'text-success' : gate.status === 'blocking' ? 'text-attention' : 'text-fg-muted')}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', gate.status === 'not_needed' && 'text-fg-muted')}>
          {t(`gates.${gate.id}`)}
          <span className="sr-only">{t(`gates.status.${gate.status}`)}</span>
        </p>
        {gate.status === 'not_needed' && <p className="text-[13px] text-fg-muted">{t('gates.notNeeded')}</p>}
        {gate.missing.length > 0 && (
          <ul className="mt-0.5 flex flex-col gap-0.5 text-[13px] text-fg-muted">
            {gate.missing.map((m) => (
              <li key={m.key + JSON.stringify(m.params)}>
                {t(m.key, { ...m.params, script: typeof m.params.script === 'string' ? t(`sandbox.scripts.${m.params.script}`) : undefined })}
              </li>
            ))}
          </ul>
        )}
        {gate.status === 'blocking' && gate.step !== 'launch' && (
          <Link to="/onboarding/$step" params={{ step: gate.step }} className="mt-1 inline-block text-[13px] font-medium text-brand hover:underline">
            {t('gates.fix')}
          </Link>
        )}
      </div>
    </li>
  )
}

export function Readiness({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('onboarding')
  const blocking = view.gates.filter((g) => g.status === 'blocking').length
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold">{t('gates.title')}</p>
      <p className={cn('mt-1 text-[13px]', blocking ? 'text-attention' : 'text-success')}>
        {blocking ? t('gates.blocking', { count: blocking }) : t('gates.allClear')}
      </p>
      <ul className="mt-2 divide-y divide-border">
        {view.gates.map((gate) => (
          <GateRow key={gate.id} gate={gate} />
        ))}
      </ul>
    </Card>
  )
}

function Reply({ reply, employeeName }: { reply: Pick<SandboxChatReply, 'customer' | 'reply' | 'replyKind' | 'sources'>; employeeName: string }) {
  const { t } = useTranslation('onboarding')
  return (
    <div className="flex flex-col gap-2">
      <p className="max-w-[85%] self-start rounded-lg rounded-ss-sm bg-surface-2 px-3 py-2 text-sm">{reply.customer}</p>
      <AISurface className="max-w-[90%] self-end">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <AIBadge name={employeeName} />
          <Badge tone={reply.replyKind === 'handoff' ? 'attention' : reply.replyKind === 'refusal' ? 'neutral' : 'info'}>{t(`sandbox.kinds.${reply.replyKind}`)}</Badge>
        </div>
        <p className="text-sm">{reply.reply}</p>
        {reply.sources.length > 0 && (
          <p className="mt-2 text-xs text-fg-muted">
            {t('sandbox.sources', { sources: reply.sources.map((s) => `${t(`sandbox.sourceKinds.${s.kind}`)}: ${s.label}`).join(' · ') })}
          </p>
        )}
      </AISurface>
    </div>
  )
}

function SandboxRunCard({ run, employeeName }: { run: SandboxRun; employeeName: string }) {
  const { t } = useTranslation('onboarding')
  const verdict = useSandboxVerdict()
  const rerun = useRunSandbox()
  const required = REQUIRED_SANDBOX_SCRIPTS.includes(run.script)
  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{t(`sandbox.scripts.${run.script}`)}</span>
        {required && <Badge tone="attention">{t('sandbox.required')}</Badge>}
      </div>
      <Reply reply={run} employeeName={employeeName} />
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="text-[13px] text-fg-muted">{t('sandbox.wasItRight')}</span>
        <Button
          size="sm"
          variant={run.verdict === 'right' ? 'primary' : 'outline'}
          aria-pressed={run.verdict === 'right'}
          disabled={verdict.isPending}
          onClick={() => verdict.mutate({ script: run.script, verdict: 'right' })}
        >
          <ThumbsUp />
          {t('sandbox.right')}
        </Button>
        <Button
          size="sm"
          variant={run.verdict === 'wrong' ? 'danger-outline' : 'outline'}
          aria-pressed={run.verdict === 'wrong'}
          disabled={verdict.isPending}
          onClick={() => verdict.mutate({ script: run.script, verdict: 'wrong' })}
        >
          <ThumbsDown />
          {t('sandbox.wrong')}
        </Button>
        {run.verdict === 'wrong' && (
          <span className="flex w-full flex-wrap items-center gap-2 text-[13px] text-fg-muted">
            {t('sandbox.fixHint')}
            <Link to="/onboarding/$step" params={{ step: 'knowledge' }} className="font-medium text-brand hover:underline">
              {t('sandbox.fixLink')}
            </Link>
            <Button size="sm" variant="ghost" disabled={rerun.isPending} onClick={() => rerun.mutate([run.script])}>
              {t('sandbox.rerun')}
            </Button>
          </span>
        )}
      </div>
    </Card>
  )
}

function FreeChat({ employeeName }: { employeeName: string }) {
  const { t } = useTranslation('onboarding')
  const chat = useSandboxChat()
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<SandboxChatReply[]>([])
  return (
    <div className="flex flex-col gap-3">
      {history.map((reply) => (
        <Reply key={reply.ranAt + reply.customer} reply={reply} employeeName={employeeName} />
      ))}
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          const text = message.trim()
          if (!text) return
          chat.mutate(text, {
            onSuccess: (reply) => {
              setHistory((h) => [...h, reply])
              setMessage('')
            },
          })
        }}
      >
        <Input aria-label={t('sandbox.chatLabel')} placeholder={t('sandbox.chatPlaceholder')} value={message} onChange={(e) => setMessage(e.target.value)} />
        <Button type="submit" variant="outline" disabled={!message.trim() || chat.isPending}>
          <Send className="rtl:-scale-x-100" />
          {t('sandbox.send')}
        </Button>
      </form>
    </div>
  )
}

function SandboxSection({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('onboarding')
  const run = useRunSandbox()
  const acceptAll = useAcceptAllSandbox()
  const runs = view.state.launch.sandbox
  const byScript = new Map(runs.map((r) => [r.script, r]))
  const passed = runs.filter((r) => r.verdict === 'right').length
  const unrated = runs.filter((r) => r.verdict === null).length
  const notRun = ALL_SCRIPTS.filter((s) => !byScript.has(s))
  const employeeName = view.state.employee.name

  return (
    <>
      <Section
        title={t('sandbox.title')}
        description={t('sandbox.body')}
        action={
          <div className="flex flex-wrap gap-2">
            {unrated > 0 && (
              <Button variant="outline" size="sm" disabled={acceptAll.isPending} onClick={() => acceptAll.mutate()}>
                <ThumbsUp />
                {t('sandbox.acceptAll', { count: unrated })}
              </Button>
            )}
            <Button size="sm" disabled={run.isPending} onClick={() => run.mutate(notRun.length ? notRun : ALL_SCRIPTS)}>
              <Play />
              {run.isPending ? t('sandbox.running') : notRun.length ? t('sandbox.runAll', { count: notRun.length }) : t('sandbox.runAgain')}
            </Button>
          </div>
        }
      >
        <p className="mb-4 text-[13px] text-fg-muted">{t('sandbox.progress', { passed, total: ALL_SCRIPTS.length })}</p>
        <div className="flex flex-col gap-3">
          {ALL_SCRIPTS.filter((s) => byScript.has(s)).map((script) => (
            <SandboxRunCard key={script} run={byScript.get(script)!} employeeName={employeeName} />
          ))}
        </div>
      </Section>
      <Section title={t('sandbox.chatTitle')} description={t('sandbox.chatBody')}>
        <FreeChat employeeName={employeeName} />
      </Section>
    </>
  )
}

function TestMessageSection({ view, session }: { view: OnboardingView; session: Session }) {
  const { t, i18n } = useTranslation('onboarding')
  const send = useTestMessage()
  const channels = (['whatsapp', 'sms', 'email', 'webchat', 'messenger', 'instagram'] as ChannelKind[]).filter((k) => isConnected(view, k))
  const [channel, setChannel] = useState<ChannelKind | undefined>(channels[0])
  const [to, setTo] = useState(channel === 'email' ? session.user.email : (session.user.phone ?? ''))
  const sent = view.state.launch.testMessage
  const location = session.locations[0]
  if (channels.length === 0) return <p className="text-[13px] text-fg-muted">{t('test.noChannel')}</p>
  return (
    <div className="flex flex-col gap-3">
      <form
        className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault()
          if (channel && to.trim().length >= 3) send.mutate({ channel, to: to.trim() })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tm-channel">{t('test.channel')}</Label>
          <Select
            value={channel}
            onValueChange={(value) => {
              setChannel(value as ChannelKind)
              setTo(value === 'email' ? session.user.email : (session.user.phone ?? ''))
            }}
          >
            <SelectTrigger id="tm-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {channels.map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`channels.kinds.${k}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tm-to">{t('test.to')}</Label>
          <Input id="tm-to" dir="ltr" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={to.trim().length < 3 || send.isPending}>
          <Send className="rtl:-scale-x-100" />
          {send.isPending ? t('test.sending') : t('test.send')}
        </Button>
      </form>
      {sent && (
        <p className="flex items-center gap-2 text-[13px] text-success">
          <CircleCheck className="size-4" aria-hidden />
          {t('test.sent', {
            to: sent.to,
            channel: t(`channels.kinds.${sent.channel}`),
            time: formatDateTime(sent.sentAt, { locale: location?.locale ?? i18n.language, timeZone: location?.timezone ?? 'UTC' }, { timeStyle: 'short' }),
          })}
        </p>
      )}
    </div>
  )
}

function HandoffSection({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('onboarding')
  const setHandoff = useSetHandoff()
  const confirm = useConfirmHandoff()
  const current = view.state.launch.handoff
  const [userId, setUserId] = useState(current?.userId ?? view.team[0]?.id ?? '')
  const [channel, setChannel] = useState<'email' | 'whatsapp' | 'in_app'>(current?.channel ?? 'in_app')
  const person = view.team.find((m) => m.id === (current?.userId ?? userId))
  const changed = !current || current.userId !== userId || current.channel !== channel

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ho-person">{t('handoff.person')}</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="ho-person">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {view.team.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ho-channel">{t('handoff.channel')}</Label>
          <Select value={channel} onValueChange={(v) => setChannel(v as typeof channel)}>
            <SelectTrigger id="ho-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['in_app', 'email', 'whatsapp'] as const).map((c) => (
                <SelectItem key={c} value={c}>
                  {t(`handoff.channels.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" disabled={!userId || !changed || setHandoff.isPending} onClick={() => setHandoff.mutate({ userId, channel })}>
          <Send className="rtl:-scale-x-100" />
          {t('handoff.sendTest')}
        </Button>
      </div>
      {current && !changed && (
        current.confirmedAt ? (
          <p className="flex items-center gap-2 text-[13px] text-success">
            <CircleCheck className="size-4" aria-hidden />
            {t('handoff.confirmed', { name: person?.name ?? '' })}
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface-2 p-3 text-[13px]">
            <span className="flex-1">{t('handoff.sent', { name: person?.name ?? '', channel: t(`handoff.channels.${current.channel}`) })}</span>
            <Button size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
              {t('handoff.gotIt')}
            </Button>
          </div>
        )
      )}
    </div>
  )
}

function LiveScreen({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('onboarding')
  const manual = isManual(view)
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <PartyPopper className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold text-balance">{t('live.title', { business: view.state.profile.name })}</h1>
        <p className="mt-3 text-[15px] text-fg-muted">{manual ? t('live.manual') : t('live.suggest', { name: view.state.employee.name })}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/app/home">{t('live.home')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={view.bookingPageHref} target="_blank" rel="noreferrer">
              <ExternalLink />
              {t('live.bookingPage')}
            </a>
          </Button>
        </div>
      </Card>
    </div>
  )
}

/** Step 9 (PRD 6.1, 6.2): test in the sandbox, send a real test, pick who gets handoffs, then go live. */
export function LaunchStep({ view, session }: StepProps) {
  const { t } = useTranslation('onboarding')
  const goLive = useGoLive()
  const manual = isManual(view)
  const blocking = view.gates.filter((g) => g.status === 'blocking')
  const [justLaunched, setJustLaunched] = useState(false)

  if (view.state.liveAt && justLaunched) return <LiveScreen view={view} />

  return (
    <StepFrame
      view={view}
      step="launch"
      title={view.state.liveAt ? t('steps.launch.liveTitle') : t('steps.launch.title')}
      description={manual ? t('steps.launch.manualBody') : t('steps.launch.body')}
      aside={<Readiness view={view} />}
      primary={{
        label: view.state.liveAt ? t('live.home') : manual ? t('launch.goLiveManual') : t('launch.goLive'),
        pending: goLive.isPending,
        disabled: !view.state.liveAt && blocking.length > 0,
        onClick: () => {
          if (view.state.liveAt) {
            setJustLaunched(true)
            return
          }
          goLive.mutate(undefined, {
            onSuccess: () => setJustLaunched(true),
            onError: (error) => toast.error(isApiError(error, 'validation_failed') ? t('launch.blocked') : t('errors.generic')),
          })
        },
      }}
      secondary={
        !view.state.liveAt &&
        blocking.length > 0 && (
          <span className="flex items-center gap-1.5 text-[13px] text-attention max-sm:hidden">
            <TriangleAlert className="size-4" aria-hidden />
            {t('gates.blocking', { count: blocking.length })}
          </span>
        )
      }
    >
      {!manual && (
        <p className="mb-6 rounded-md border border-ai/25 bg-ai/6 p-3 text-[13px]">{t('launch.suggestNote', { name: view.state.employee.name })}</p>
      )}
      {!manual && <SandboxSection view={view} />}
      <Section title={t('test.title')} description={t('test.body')}>
        <TestMessageSection view={view} session={session} />
      </Section>
      {!manual && (
        <Section title={t('handoff.title')} description={t('handoff.body')}>
          <HandoffSection view={view} />
        </Section>
      )}
      {goLive.isError && !isApiError(goLive.error, 'validation_failed') && <FieldError>{t('errors.generic')}</FieldError>}
    </StepFrame>
  )
}
