import { CalendarDays, ExternalLink, Plus, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import type { CalendarSetup, ServiceItem } from '@deskhand/schemas'
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Label,
  StatusChip,
} from '@deskhand/ui'
import { useConnectCalendar, useDisconnectCalendar } from '../../../api/onboarding'
import { cleanServices, localId, ServicesEditor } from '../editors'
import { Section, StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

/** Simulated calendar permission screen; a real build hands off to Google or Microsoft. */
function CalendarDialog({ provider, onClose, defaultEmail }: { provider: 'google' | 'outlook' | null; onClose: () => void; defaultEmail: string }) {
  const { t } = useTranslation('onboarding')
  const connect = useConnectCalendar()
  const [account, setAccount] = useState(defaultEmail)
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(account)
  return (
    <Dialog open={provider !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('services.calendar.dialogTitle', { provider: t(`services.calendar.providers.${provider ?? 'google'}`) })}</DialogTitle>
          <DialogDescription>{t('services.calendar.dialogBody')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (provider && valid) connect.mutate({ provider, account: account.trim() }, { onSuccess: onClose })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cal-account">{t('services.calendar.account')}</Label>
            <Input id="cal-account" type="email" value={account} onChange={(e) => setAccount(e.target.value)} />
          </div>
          <ul className="list-disc ps-5 text-[13px] text-fg-muted">
            <li>{t('services.calendar.scopeBusy')}</li>
            <li>{t('services.calendar.scopeEvents')}</li>
          </ul>
          <DialogFooter>
            <Button type="submit" disabled={!valid || connect.isPending}>
              {t('services.calendar.allow')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Step 6 (PRD 6.1): what people can book, who does the work and which calendar to keep free. */
export function ServicesStep({ view, session }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('services')
  const disconnect = useDisconnectCalendar()
  const { profile, calendar } = view.state
  const [services, setServices] = useState<ServiceItem[]>(view.state.knowledge.services)
  const [staff, setStaff] = useState<CalendarSetup['staff']>(calendar.staff)
  const [deferred, setDeferred] = useState(calendar.deferred)
  const [provider, setProvider] = useState<'google' | 'outlook' | null>(null)
  const locale = session.locations[0]?.locale ?? 'en'
  const payload = (overrides?: { deferred?: boolean }) => ({
    services: cleanServices(services),
    calendar: { staff: staff.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() })), deferred: overrides?.deferred ?? deferred },
  })

  return (
    <StepFrame
      view={view}
      step="services"
      title={t('steps.services.title')}
      description={t('steps.services.body')}
      onSave={() => actions.save(payload())}
      primary={{ label: t('frame.continue'), pending: actions.pending, onClick: () => actions.complete(payload()) }}
    >
      <Section title={t('services.title')} description={t('services.body')}>
        <ServicesEditor services={services} onChange={setServices} currency={profile.currency} market={session.account.market} locale={locale} industry={profile.industry} />
      </Section>

      <Section title={t('services.staffTitle')} description={t('services.staffBody')}>
        <div className="flex flex-col gap-2">
          {staff.map((person) => (
            <div key={person.id} className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <Input
                aria-label={t('services.staffName')}
                value={person.name}
                onChange={(e) => setStaff((list) => list.map((p) => (p.id === person.id ? { ...p, name: e.target.value } : p)))}
                className="max-w-xs"
              />
              {staff.length > 1 && (
                <IconButton label={t('services.removeStaff', { name: person.name })} onClick={() => setStaff((list) => list.filter((p) => p.id !== person.id))}>
                  <Trash2 />
                </IconButton>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="self-start" onClick={() => setStaff((list) => [...list, { id: localId('stf'), name: '' }])}>
            <Plus />
            {t('services.addStaff')}
          </Button>
        </div>
      </Section>

      <Section title={t('services.calendar.title')} description={t('services.calendar.body')}>
        {calendar.provider ? (
          <div className="flex flex-wrap items-center gap-3">
            <StatusChip domain="connection" value="healthy" />
            <span className="text-sm">
              {t(`services.calendar.providers.${calendar.provider}`)} · {calendar.account}
            </span>
            <Button variant="ghost" size="sm" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
              {t('channels.disconnect')}
            </Button>
          </div>
        ) : deferred ? (
          <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
            <CalendarDays className="size-4" aria-hidden />
            {t('services.calendar.deferred')}
            <Button variant="link" onClick={() => setDeferred(false)}>
              {t('services.calendar.connectNow')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setProvider('google')}>
              {t('services.calendar.connect', { provider: t('services.calendar.providers.google') })}
            </Button>
            <Button variant="outline" onClick={() => setProvider('outlook')}>
              {t('services.calendar.connect', { provider: t('services.calendar.providers.outlook') })}
            </Button>
            <Button variant="ghost" onClick={() => setDeferred(true)}>
              {t('services.calendar.later')}
            </Button>
          </div>
        )}
        <CalendarDialog provider={provider} onClose={() => setProvider(null)} defaultEmail={session.user.email} />
      </Section>

      <Section title={t('services.bookingPage')} description={t('services.bookingPageBody')}>
        <Card className="flex flex-wrap items-center gap-3 p-3">
          <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
            {`${window.location.origin}${view.bookingPageHref}`}
          </code>
          <Button asChild variant="outline" size="sm">
            <a href={view.bookingPageHref} target="_blank" rel="noreferrer">
              <ExternalLink />
              {t('services.preview')}
            </a>
          </Button>
        </Card>
      </Section>
    </StepFrame>
  )
}
