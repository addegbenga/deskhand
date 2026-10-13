import { AtSign, Camera, Globe, Mail, MessageCircle, MessagesSquare, Phone, Smartphone, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { APP_DOMAIN, getMarketPack } from '@deskhand/config'
import { WidgetSnippet } from '../../settings/WidgetSnippet'
import { useTranslation } from '@deskhand/i18n'
import type { ChannelKind, OnboardingView, Session } from '@deskhand/schemas'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ChoiceCard,
  ChoiceCards,
  CopyField,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  FieldHint,
  Input,
  Label,
  PhoneInput,
  StatusChip,
} from '@deskhand/ui'
import {
  useConnectSimple,
  useConnectWhatsApp,
  useDisconnectChannel,
  useEmailDomain,
  useEmailManaged,
  useSaveStep,
  useVerifyDns,
} from '../../../api/onboarding'
import { StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

const ICONS: Record<ChannelKind, LucideIcon> = {
  whatsapp: MessageCircle,
  webchat: MessagesSquare,
  email: Mail,
  sms: Smartphone,
  messenger: AtSign,
  instagram: Camera,
  voice: Phone,
}

type Connectable = Exclude<ChannelKind, 'voice'>

export function isConnected(view: OnboardingView, kind: ChannelKind) {
  const c = view.state.channels
  switch (kind) {
    case 'whatsapp':
      return Boolean(c.whatsapp)
    case 'email':
      return Boolean(c.email?.connectedAt)
    case 'webchat':
      return Boolean(c.webchat)
    case 'messenger':
      return Boolean(c.messenger)
    case 'instagram':
      return Boolean(c.instagram)
    case 'sms':
      return Boolean(c.sms)
    default:
      return false
  }
}

function ConnectedRow({ kind, children }: { kind: Connectable; children: ReactNode }) {
  const { t } = useTranslation('onboarding')
  const disconnect = useDisconnectChannel()
  return (
    <div className="flex flex-wrap items-center gap-3">
      <StatusChip domain="connection" value="healthy" />
      <span className="min-w-0 flex-1 truncate text-sm">{children}</span>
      <Button variant="ghost" size="sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate(kind)}>
        {t('channels.disconnect')}
      </Button>
    </div>
  )
}

/** Simulated Meta embedded sign-up: log in, pick the business portfolio, add the number (PRD 5.5). */
function WhatsAppDialog({ open, onOpenChange, view, session }: { open: boolean; onOpenChange: (open: boolean) => void; view: OnboardingView; session: Session }) {
  const { t } = useTranslation('onboarding')
  const connect = useConnectWhatsApp()
  const [stage, setStage] = useState<'login' | 'business' | 'number'>('login')
  const [portfolio, setPortfolio] = useState(view.state.profile.name)
  const [displayName, setDisplayName] = useState(view.state.profile.name)
  const [number, setNumber] = useState(view.state.profile.phone)
  const digits = number.replace(/\D/g, '')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setStage('login')
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('channels.whatsapp.dialog.title')}</DialogTitle>
          <DialogDescription>{t(`channels.whatsapp.dialog.${stage}Body`)}</DialogDescription>
        </DialogHeader>
        {stage === 'login' && (
          <div className="flex flex-col gap-3">
            <p className="rounded-md border border-dashed border-border p-3 text-[13px] text-fg-muted">{t('channels.whatsapp.dialog.simulated')}</p>
            <Button onClick={() => setStage('business')}>{t('channels.whatsapp.dialog.continueAs', { name: session.user.name })}</Button>
          </div>
        )}
        {stage === 'business' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (portfolio.trim().length >= 2) setStage('number')
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wa-portfolio">{t('channels.whatsapp.dialog.portfolio')}</Label>
              <Input id="wa-portfolio" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
              <FieldHint>{t('channels.whatsapp.dialog.portfolioHint')}</FieldHint>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={portfolio.trim().length < 2}>
                {t('frame.continue')}
              </Button>
            </DialogFooter>
          </form>
        )}
        {stage === 'number' && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              if (digits.length >= 7 && displayName.trim().length >= 2) {
                connect.mutate(
                  { businessPortfolio: portfolio.trim(), number: number.trim(), displayName: displayName.trim() },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wa-number">{t('channels.whatsapp.dialog.number')}</Label>
              <PhoneInput id="wa-number" market={session.account.market} value={number} onChange={setNumber} />
              <FieldHint>{t('channels.whatsapp.dialog.numberHint')}</FieldHint>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wa-display">{t('channels.whatsapp.dialog.displayName')}</Label>
              <Input id="wa-display" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
            {connect.isError && <FieldError>{t('errors.generic')}</FieldError>}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStage('business')}>
                {t('frame.back')}
              </Button>
              <Button type="submit" disabled={digits.length < 7 || displayName.trim().length < 2 || connect.isPending}>
                {t('channels.whatsapp.dialog.finish')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function WhatsAppPanel({ view, session }: { view: OnboardingView; session: Session }) {
  const { t } = useTranslation('onboarding')
  const [open, setOpen] = useState(false)
  const wa = view.state.channels.whatsapp
  if (!wa) {
    return (
      <>
        <p className="text-[13px] text-fg-muted">{t('channels.whatsapp.body')}</p>
        <Button className="mt-3" onClick={() => setOpen(true)}>
          {t('channels.whatsapp.connect')}
        </Button>
        <WhatsAppDialog open={open} onOpenChange={setOpen} view={view} session={session} />
      </>
    )
  }
  const pending = wa.templates.filter((tpl) => tpl.status !== 'approved').length
  return (
    <div className="flex flex-col gap-3">
      <ConnectedRow kind="whatsapp">
        <span dir="ltr">{wa.number}</span> · {wa.displayName}
      </ConnectedRow>
      <div>
        <p className="text-[13px] font-medium">{t('channels.whatsapp.templates')}</p>
        <p className="text-[13px] text-fg-muted">{pending ? t('channels.whatsapp.templatesPending', { count: pending }) : t('channels.whatsapp.templatesReady')}</p>
        <ul className="mt-2 flex flex-col gap-1.5">
          {wa.templates.map((tpl) => (
            <li key={tpl.name} className="flex items-center gap-2 text-[13px]">
              <code dir="ltr" className="font-mono text-xs">
                {tpl.name}
              </code>
              <Badge tone="neutral">{t(`channels.whatsapp.category.${tpl.category}`)}</Badge>
              <StatusChip domain="template" value={tpl.status} className="ms-auto" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmailPanel({ view, session }: { view: OnboardingView; session: Session }) {
  const { t } = useTranslation('onboarding')
  const managed = useEmailManaged()
  const addDomain = useEmailDomain()
  const verify = useVerifyDns()
  const disconnect = useDisconnectChannel()
  const [mode, setMode] = useState<'managed' | 'domain'>('managed')
  const [domain, setDomain] = useState(view.state.profile.link.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? '')
  const [address, setAddress] = useState('hello')
  const email = view.state.channels.email
  const managedAddress = `${session.account.slug}@mail.${APP_DOMAIN}`
  const domainOk = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(domain.trim())

  if (email?.mode === 'managed') return <ConnectedRow kind="email">{email.address}</ConnectedRow>
  if (email?.mode === 'domain') {
    const verified = email.records.filter((r) => r.status === 'verified').length
    return (
      <div className="flex flex-col gap-3">
        {email.connectedAt ? (
          <ConnectedRow kind="email">{email.address}</ConnectedRow>
        ) : (
          <p className="text-[13px] text-fg-muted">{t('channels.email.addRecords', { domain: email.domain ?? '' })}</p>
        )}
        <div className="flex flex-col gap-2">
          {email.records.map((record) => (
            <div key={record.purpose} className="rounded-md border border-border p-3">
              <div className="mb-2 flex items-center gap-2 text-[13px]">
                <Badge tone="neutral">{record.type}</Badge>
                <span className="font-medium">{t(`channels.email.purpose.${record.purpose}`)}</span>
                <Badge tone={record.status === 'verified' ? 'success' : 'info'} className="ms-auto">
                  {t(`channels.email.recordStatus.${record.status}`)}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <CopyField value={record.host} label={t('channels.email.host')} />
                <CopyField value={record.value} label={t('channels.email.value')} />
              </div>
            </div>
          ))}
        </div>
        {!email.connectedAt && (
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={verify.isPending} onClick={() => verify.mutate()}>
              {verify.isPending ? t('channels.email.checking') : t('channels.email.verify')}
            </Button>
            {email.verifyAttempts > 0 && (
              <span className="text-[13px] text-fg-muted">{t('channels.email.partial', { verified, total: email.records.length })}</span>
            )}
            <Button variant="ghost" size="sm" className="ms-auto" disabled={disconnect.isPending} onClick={() => disconnect.mutate('email')}>
              {t('channels.email.changeDomain')}
            </Button>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCards value={mode} onValueChange={(v) => setMode(v as 'managed' | 'domain')} className="sm:grid-cols-2">
        <ChoiceCard value="managed" title={t('channels.email.managed')} description={t('channels.email.managedBody')} />
        <ChoiceCard value="domain" title={t('channels.email.domain')} description={t('channels.email.domainBody')} />
      </ChoiceCards>
      {mode === 'managed' ? (
        <div className="flex flex-wrap items-center gap-3">
          <code dir="ltr" className="rounded bg-surface-2 px-2 py-1 font-mono text-xs">
            {managedAddress}
          </code>
          <Button disabled={managed.isPending} onClick={() => managed.mutate()}>
            {t('channels.email.useManaged')}
          </Button>
        </div>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            if (domainOk && address.trim()) addDomain.mutate({ domain: domain.trim(), address: address.trim() })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="em-domain">{t('channels.email.domainLabel')}</Label>
            <Input id="em-domain" dir="ltr" placeholder={t('channels.email.domainPlaceholder')} value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="em-address">{t('channels.email.address')}</Label>
            <Input id="em-address" dir="ltr" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button type="submit" disabled={!domainOk || !address.trim() || addDomain.isPending}>
            {t('channels.email.addDomain')}
          </Button>
        </form>
      )}
    </div>
  )
}

function WebchatPanel({ view, session }: { view: OnboardingView; session: Session }) {
  const { t } = useTranslation('onboarding')
  const connect = useConnectSimple()
  const [placement, setPlacement] = useState<'booking_page' | 'website'>('booking_page')
  const webchat = view.state.channels.webchat
  if (webchat) {
    return (
      <div className="flex flex-col gap-3">
        <ConnectedRow kind="webchat">{t(`channels.webchat.placement.${webchat.placement}`)}</ConnectedRow>
        <WidgetSnippet slug={session.account.slug} />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      <ChoiceCards value={placement} onValueChange={(v) => setPlacement(v as 'booking_page' | 'website')} className="sm:grid-cols-2">
        <ChoiceCard value="booking_page" title={t('channels.webchat.placement.booking_page')} description={t('channels.webchat.bookingPageBody')} />
        <ChoiceCard value="website" title={t('channels.webchat.placement.website')} description={t('channels.webchat.websiteBody')} />
      </ChoiceCards>
      <Button className="self-start" disabled={connect.isPending} onClick={() => connect.mutate({ kind: 'webchat', value: placement })}>
        {t('channels.webchat.turnOn')}
      </Button>
    </div>
  )
}

function SimplePanel({ view, kind }: { view: OnboardingView; kind: 'messenger' | 'instagram' | 'sms' }) {
  const { t } = useTranslation('onboarding')
  const connect = useConnectSimple()
  const c = view.state.channels
  const defaults = { messenger: view.state.profile.name, instagram: '', sms: view.state.profile.name.replace(/[^a-z0-9]/gi, '').slice(0, 11) }
  const [value, setValue] = useState(defaults[kind])
  const current = kind === 'messenger' ? c.messenger?.page : kind === 'instagram' ? c.instagram?.handle : c.sms?.sender
  if (current) return <ConnectedRow kind={kind}>{current}</ConnectedRow>
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault()
        if (value.trim()) connect.mutate({ kind, value: value.trim() })
      }}
    >
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={`ch-${kind}`}>{t(`channels.${kind}.label`)}</Label>
        <Input id={`ch-${kind}`} value={value} onChange={(e) => setValue(e.target.value)} maxLength={kind === 'sms' ? 11 : undefined} />
        <FieldHint>{t(`channels.${kind}.hint`)}</FieldHint>
      </div>
      <Button type="submit" disabled={!value.trim() || connect.isPending} className="sm:mb-6">
        {t(`channels.${kind}.connect`)}
      </Button>
    </form>
  )
}

/** Step 5 (PRD 6.1, 5.5): pick any mix of channels and connect each; nothing here needs a developer. */
export function ChannelsStep({ view, session }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('channels')
  const select = useSaveStep()
  const market = getMarketPack(session.account.market)
  const kinds = (Object.keys(market.channels) as ChannelKind[]).filter((k) => market.channels[k] || k === 'voice')
  const selected = view.state.channels.selected
  const connected = kinds.filter((k) => isConnected(view, k)).length
  const toggle = (kind: ChannelKind, on: boolean) =>
    select.mutate({ step: 'channels', data: { selected: on ? [...selected, kind] : selected.filter((k) => k !== kind) } })

  const panel = (kind: ChannelKind) => {
    switch (kind) {
      case 'whatsapp':
        return <WhatsAppPanel view={view} session={session} />
      case 'email':
        return <EmailPanel view={view} session={session} />
      case 'webchat':
        return <WebchatPanel view={view} session={session} />
      case 'messenger':
      case 'instagram':
      case 'sms':
        return <SimplePanel view={view} kind={kind} />
      default:
        return null
    }
  }

  return (
    <StepFrame
      view={view}
      step="channels"
      title={t('steps.channels.title')}
      description={t('steps.channels.body')}
      primary={{ label: t('frame.continue'), pending: actions.pending, onClick: () => actions.complete({ selected }) }}
    >
      <div className="flex flex-col gap-3">
        {kinds.map((kind) => {
          const Icon = ICONS[kind]
          const later = kind === 'voice'
          const on = selected.includes(kind)
          const live = isConnected(view, kind)
          return (
            <Card key={kind} className={cn('p-4', on && 'border-brand/40')}>
              <label className={cn('flex items-start gap-3', later ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
                <Checkbox checked={on} disabled={later || select.isPending} onCheckedChange={(v) => toggle(kind, v === true)} className="mt-1" />
                <Icon className="mt-0.5 size-5 shrink-0 text-fg-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {t(`channels.kinds.${kind}`)}
                    {later && <Badge tone="neutral">{t('channels.later')}</Badge>}
                    {live && <Badge tone="success">{t('channels.connected')}</Badge>}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-fg-muted">{t(`channels.blurb.${kind}`)}</span>
                </span>
              </label>
              {on && !later && <div className="mt-4 border-t border-border pt-4 ps-0 sm:ps-14">{panel(kind)}</div>}
            </Card>
          )
        })}
      </div>
      <p className={cn('mt-4 flex items-center gap-2 text-[13px]', connected ? 'text-fg-muted' : 'text-attention')}>
        <Globe className="size-4" aria-hidden />
        {connected ? t('channels.summary', { count: connected }) : t('channels.noneYet')}
      </p>
    </StepFrame>
  )
}
