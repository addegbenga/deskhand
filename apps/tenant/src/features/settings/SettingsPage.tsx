import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { formatMoney, formatRelative, useTranslation } from '@deskhand/i18n'
import { now } from '../../lib/clock'
import { useLocaleContext } from '../../lib/location'
import { TeamNeedsList } from './TeamNeeds'
import { SETTINGS_PAGE_IDS, can, type InviteRole, type SettingsPageId } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import { useSession } from '../../api/queries'
import {
  useApiKeys,
  useApproveJoin,
  useAudit,
  useBilling,
  useBranding,
  useCancelPlan,
  useChangePlan,
  useCloseAccount,
  useConnectionAction,
  useCreateJoinLink,
  useExportData,
  useInvitationAction,
  useInvitations,
  useInvite,
  useInvoices,
  useJoinRequests,
  useLanguages,
  useNotificationPrefs,
  useOffboard,
  usePatchBranding,
  usePatchNotifications,
  usePatchUsage,
  useRevokeSession,
  useSecurity,
  useSimulateUsage,
  useTeam,
  useUsage,
  useWebhooks,
} from '../../api/settings'
import { bookingScript } from '../../lib/embed-snippets'
import { BusinessSetup } from './BusinessSetup'
import { WidgetSnippet } from './WidgetSnippet'
import {
  Badge,
  Button,
  CopyField,
  Dialog,
  DialogContent,
  DialogTitle,
  ErrorState,
  Input,
  InviteResults,
  Label,
  NoPermissionState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  UpgradePrompt,
  UsageBar,
  toast,
} from '@deskhand/ui'

const INVITE_ROLES: InviteRole[] = ['admin', 'manager', 'staff', 'readonly']

export function SettingsPage({ page }: { page: SettingsPageId }) {
  const session = useSession()
  const { t } = useTranslation('common')
  if (!SETTINGS_PAGE_IDS.includes(page)) return null
  if (page === 'billing' && !can(session.membership.role, 'billing.manage')) {
    return <NoPermissionState roleLabel={t('roles.owner')} />
  }
  if (page === 'data' && !can(session.membership.role, 'account.delete')) {
    return <NoPermissionState roleLabel={t('roles.owner')} />
  }
  if (['team', 'audit', 'api', 'business', 'branding', 'languages', 'channels'].includes(page) && !['owner', 'admin'].includes(session.membership.role)) {
    return <NoPermissionState roleLabel={t('roles.admin')} />
  }
  if (page === 'usage' && !['owner', 'admin'].includes(session.membership.role)) {
    return <NoPermissionState roleLabel={t('roles.admin')} />
  }
  if (page === 'team') return <TeamSettings />
  if (page === 'billing') return <BillingSettings />
  if (page === 'usage') return <UsageSettings />
  if (page === 'security') return <SecuritySettings />
  if (page === 'data') return <DataSettings />
  if (page === 'audit') return <AuditSettings />
  if (page === 'api') return <ApiSettings />
  if (page === 'business') return <BusinessSetup />
  if (page === 'branding') return <BrandingPane />
  if (page === 'notifications') return <NotificationPane />
  if (page === 'languages') return <LanguagesPane />
  if (page === 'locations') return <LocationsPane />
  if (page === 'channels') return <ChannelsPane />
  return <RepliesPane />
}

function BrandingPane() {
  const { t } = useTranslation('settings')
  const query = useBranding()
  const patch = usePatchBranding()
  if (query.isPending || !query.data) return <Skeleton className="h-32" />
  const data = query.data
  return (
    <div className="grid max-w-xl gap-3">
      <Input defaultValue={data.logoText} onBlur={(event) => void patch.mutateAsync({ logoText: event.target.value })} aria-label={t('branding.logo')} />
      <Input defaultValue={data.brandColor} onBlur={(event) => void patch.mutateAsync({ brandColor: event.target.value })} aria-label={t('branding.color')} />
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={data.showPoweredBy} onCheckedChange={(showPoweredBy) => void patch.mutateAsync({ showPoweredBy })} />
        {t('branding.poweredBy')}
      </label>
    </div>
  )
}

function NotificationPane() {
  const { t } = useTranslation('settings')
  const query = useNotificationPrefs()
  const patch = usePatchNotifications()
  if (query.isPending || !query.data) return <Skeleton className="h-32" />
  const data = query.data
  return (
    <div className="grid max-w-md gap-3">
      {(['email', 'inApp', 'whatsapp'] as const).map((key) => (
        <label key={key} className="flex items-center gap-2 text-sm">
          <Switch checked={data[key]} onCheckedChange={(value) => void patch.mutateAsync({ [key]: value })} />
          {t(`notifications.${key}`)}
        </label>
      ))}
    </div>
  )
}

function LanguagesPane() {
  const { t } = useTranslation('settings')
  const query = useLanguages()
  if (query.isPending || !query.data) return <Skeleton className="h-32" />
  const data = query.data
  return (
    <dl className="grid max-w-md gap-2 text-sm">
      <div>
        <dt className="text-fg-muted">{t('languages.market')}</dt>
        <dd>{data.market}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('languages.region')}</dt>
        <dd>{data.region}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('languages.served')}</dt>
        <dd>{data.languages.join(', ')}</dd>
      </div>
      <p className="text-fg-muted">{t('languages.changeRegion')}</p>
    </dl>
  )
}

function LocationsPane() {
  const session = useSession()
  return (
    <ul className="space-y-2">
      {session.locations.map((location) => (
        <li key={location.id} className="rounded-md border border-border p-3 text-sm">
          <p className="font-medium">{location.name}</p>
          <p className="text-fg-muted">{location.address}</p>
        </li>
      ))}
    </ul>
  )
}

function ChannelsPane() {
  const { t } = useTranslation('settings')
  const session = useSession()
  const slug = session.account.slug
  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-fg-muted">
        {t('channels.hint')}{' '}
        <Link className="underline" to="/app/connections">
          {t('connections.title')}
        </Link>
      </p>
      <div>
        <Label>{t('channels.widget')}</Label>
        <div className="mt-2">
          <WidgetSnippet slug={slug} />
        </div>
      </div>
      <div>
        <Label>{t('channels.booking')}</Label>
        <p className="mt-1 text-xs text-fg-muted">{t('channels.bookingHint')}</p>
        <CopyField className="mt-2" label={t('channels.booking')} value={bookingScript(slug, 'inline')} multiline />
        <Link className="mt-2 inline-block text-sm text-brand" to="/app/booking-page">
          {t('channels.bookingSettings')}
        </Link>
      </div>
    </div>
  )
}

function RepliesPane() {
  const { t } = useTranslation('settings')
  return (
    <p className="text-sm text-fg-muted">
      {t('replies.hint')}{' '}
      <Link className="underline" to="/app/marketing/templates">
        {t('pages.replies')}
      </Link>
    </p>
  )
}

function TeamSettings() {
  const { t } = useTranslation(['settings', 'common'])
  const session = useSession()
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const members = useTeam()
  const invitations = useInvitations()
  const invite = useInvite()
  const invitationAction = useInvitationAction()
  const requests = useJoinRequests()
  const approve = useApproveJoin()
  const joinLink = useCreateJoinLink()
  const offboard = useOffboard()
  const [emails, setEmails] = useState('ada.okonkwo@gmail.com, x@mailinator.com, not-an-email')
  const [role, setRole] = useState<InviteRole>('staff')
  const [note, setNote] = useState('')
  const [offId, setOffId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState('')
  const [reassign, setReassign] = useState(session.user.id)

  if (members.isPending) return <Skeleton className="h-40" />
  if (members.isError) return <ErrorState onRetry={() => void members.refetch()} />

  return (
    <div className="space-y-8">
      <form
        className="grid max-w-xl gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          void invite.mutateAsync({ emails, role, note }).then(
            (result) => {
              if (result.results.some((item) => item.result === 'plan_limit')) toast.error(t('usage.upgrade'))
              else toast.success(t('saved'))
            },
            () => toast.error(t('common:actions.retry')),
          )
        }}
      >
        <Label htmlFor="emails">{t('team.emails')}</Label>
        <Textarea id="emails" value={emails} onChange={(event) => setEmails(event.target.value)} />
        <p className="text-xs text-fg-muted">{t('team.emailsHint')}</p>
        <Select value={role} onValueChange={(value) => setRole(value as InviteRole)}>
          <SelectTrigger aria-label={t('team.role')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITE_ROLES.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`common:roles.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={note} onChange={(event) => setNote(event.target.value)} aria-label={t('team.note')} />
        <Button type="submit">{t('team.send')}</Button>
      </form>
      {invite.data && <InviteResults results={invite.data.results} label={(result) => t(`team.results.${result}`)} />}
      <div>
        <Button
          variant="outline"
          onClick={() =>
            void joinLink.mutateAsync(role).then((link) => {
              void navigator.clipboard.writeText(`${window.location.origin}${link.href}`)
              toast.success(t('team.copyLink'))
            })
          }
        >
          {t('team.createLink')}
        </Button>
      </div>
      <section>
        <h2 className="mb-2 font-medium">{t('team.pending')}</h2>
        <ul className="space-y-2">
          {invitations.data?.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <span>
                {item.email} · {t(`common:roles.${item.role}`)} · {item.status}
              </span>
              <span className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => void invitationAction.mutateAsync({ id: item.id, action: 'resend' })}>
                  {t('team.resend')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void invitationAction.mutateAsync({ id: item.id, action: 'revoke' })}>
                  {t('team.revoke')}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">{t('team.requests')}</h2>
        <ul className="space-y-2">
          {requests.data?.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {item.name} · {item.email} · {item.status}
              </span>
              {item.status === 'pending' && (
                <Button size="sm" onClick={() => void approve.mutateAsync(item.id)}>
                  {t('team.approve')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">{t('team.needsTitle')}</h2>
        <p className="mb-3 text-sm text-fg-muted">{t('team.needsBody')}</p>
        <TeamNeedsList members={members.data ?? []} joins={requests.data ?? []} />
      </section>
      <section>
        <ul className="space-y-2">
          {members.data?.map((member) => (
            <li key={member.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-fg-muted">
                  {member.email} · {t(`common:roles.${member.role}`)}
                  {member.locationNames.length ? ` · ${member.locationNames.join(', ')}` : ''}
                </p>
                <p className="mt-1 flex flex-wrap gap-2 text-xs">
                  <Badge tone={member.twoFactor ? 'success' : member.role === 'owner' || member.role === 'admin' ? 'danger' : 'attention'}>
                    {member.twoFactor ? t('team.twoFactorOn') : t('team.twoFactorOff')}
                  </Badge>
                  <Badge tone={member.calendarConnected ? 'success' : member.bookable ? 'attention' : 'neutral'}>
                    {member.calendarConnected ? t('team.calendarOn') : t('team.calendarOff')}
                  </Badge>
                  {member.lastActiveAt ? (
                    <span className="text-fg-muted">
                      {t('team.lastActive')}: {formatRelative(member.lastActiveAt, now(), ctx)}
                    </span>
                  ) : null}
                </p>
              </div>
              {member.role !== 'owner' && (
                <Button size="sm" variant="outline" onClick={() => setOffId(member.id)}>
                  {t('team.offboard')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <Dialog open={Boolean(offId)} onOpenChange={() => setOffId(null)}>
        <DialogContent>
          <DialogTitle>{t('team.offboard')}</DialogTitle>
          <Label>{t('team.reassign')}</Label>
          <Select value={reassign} onValueChange={setReassign}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.data
                ?.filter((item) => item.id !== offId)
                .map((item) => (
                  <SelectItem key={item.userId} value={item.userId}>
                    {item.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Label htmlFor="off-name">{t('team.confirmName')}</Label>
          <Input id="off-name" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          <Button
            onClick={() => {
              if (!offId) return
              void offboard.mutateAsync({ id: offId, reassignToUserId: reassign, confirmation: confirm }).then(
                () => {
                  setOffId(null)
                  toast.success(t('saved'))
                },
                (error) => toast.error(isApiError(error) ? error.message : t('common:actions.retry')),
              )
            }}
          >
            {t('team.offboard')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function BillingSettings() {
  const { t } = useTranslation('settings')
  const ctx = useLocaleContext(useSession())
  const billing = useBilling()
  const invoices = useInvoices()
  const change = useChangePlan()
  const cancel = useCancelPlan()
  const session = useSession()
  const [confirm, setConfirm] = useState('')
  if (billing.isPending || !billing.data) return <Skeleton className="h-32" />
  return (
    <div className="space-y-6">
      <p className="text-sm">
        {t('billing.plan')}: {t(`billing.${billing.data.plan}`)} · {billing.data.paymentMethod}
      </p>
      <div className="flex flex-wrap gap-2">
        {(['starter', 'growth', 'pro'] as const).map((plan) => (
          <Button key={plan} variant={plan === billing.data.plan ? 'primary' : 'outline'} onClick={() => void change.mutateAsync(plan)}>
            {t(`billing.${plan}`)}
          </Button>
        ))}
      </div>
      <section>
        <h2 className="mb-2 font-medium">{t('billing.invoices')}</h2>
        <ul className="space-y-1 text-sm">
          {invoices.data?.map((item) => (
            <li key={item.id}>
              {item.number} · {formatMoney(item.amount, item.currency || ctx.currency, ctx.locale)} · {item.status}
            </li>
          ))}
        </ul>
      </section>
      <div className="max-w-md space-y-2">
        <Label htmlFor="cancel">{t('data.confirm', { name: session.account.name })}</Label>
        <Input id="cancel" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
        <Button variant="danger" onClick={() => void cancel.mutateAsync({ exportChoice: 'now', confirmation: confirm })}>
          {t('billing.cancel')}
        </Button>
      </div>
    </div>
  )
}

function UsageSettings() {
  const { t } = useTranslation('settings')
  const usage = useUsage()
  const simulate = useSimulateUsage()
  const patch = usePatchUsage()
  if (usage.isPending || !usage.data) return <Skeleton className="h-32" />
  const capped = usage.data.meters.some((meter) => meter.alert === 'cap')
  return (
    <div className="space-y-4">
      {capped && (
        <UpgradePrompt
          title={t('usage.upgrade')}
          action={
            <Button asChild size="sm">
              <Link to="/app/settings/$page" params={{ page: 'billing' }}>
                {t('billing.change')}
              </Link>
            </Button>
          }
        />
      )}
      {usage.data.meters.map((meter) => (
        <UsageBar key={meter.unit} meter={meter} label={t(`usage.units.${meter.unit}`)} />
      ))}
      <p className="text-sm text-fg-muted">{t('usage.projected')}</p>
      <Button variant="outline" onClick={() => void simulate.mutateAsync()}>
        {t('usage.simulate')}
      </Button>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={usage.data.capMode === 'hard'} onCheckedChange={(hard) => void patch.mutateAsync({ capMode: hard ? 'hard' : 'soft' })} />
        {t('usage.hard')}
      </label>
    </div>
  )
}

function SecuritySettings() {
  const { t } = useTranslation('settings')
  const query = useSecurity()
  const revoke = useRevokeSession()
  const connect = useConnectionAction()
  if (query.isPending || !query.data) return <Skeleton className="h-32" />
  return (
    <div className="space-y-4">
      <p className="text-sm">{t('security.required')}</p>
      <Badge tone={query.data.twoFactor ? 'success' : 'attention'}>{t('security.twoFactor')}</Badge>
      <section>
        <h2 className="mb-2 font-medium">{t('security.sessions')}</h2>
        <ul className="space-y-2">
          {query.data.sessions.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {item.device} · {item.location}
              </span>
              {!item.current && (
                <Button size="sm" variant="outline" onClick={() => void revoke.mutateAsync(item.id)}>
                  {t('security.signOut')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
      <div>
        <p className="mb-2 font-medium">{t('security.calendar')}</p>
        <Button variant="outline" onClick={() => void connect.mutateAsync({ kind: 'google_calendar', action: 'connect' })}>
          {query.data.calendarConnected ? t('connections.test') : t('connections.connect')}
        </Button>
      </div>
    </div>
  )
}

function DataSettings() {
  const { t } = useTranslation('settings')
  const session = useSession()
  const exporter = useExportData()
  const close = useCloseAccount()
  const [confirm, setConfirm] = useState('')
  const download = () =>
    void exporter.mutateAsync(['contacts', 'conversations', 'bookings', 'reviews']).then((file) => {
      const href = URL.createObjectURL(new Blob([file.csv], { type: 'text/csv' }))
      const link = document.createElement('a')
      link.href = href
      link.download = file.filename
      link.click()
    })
  return (
    <div className="max-w-md space-y-4">
      <Button onClick={download}>{t('data.export')}</Button>
      <Label htmlFor="close">{t('data.confirm', { name: session.account.name })}</Label>
      <Input id="close" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
      <Button
        variant="danger"
        onClick={() =>
          void close.mutateAsync({ exportChoice: 'now', confirmation: confirm }).then(
            () => toast.success(t('data.closed')),
            (error) => toast.error(isApiError(error) ? error.message : t('save')),
          )
        }
      >
        {t('data.close')}
      </Button>
    </div>
  )
}

function AuditSettings() {
  const { t } = useTranslation('settings')
  const [q, setQ] = useState('')
  const audit = useAudit(q)
  return (
    <div className="space-y-3">
      <Input value={q} onChange={(event) => setQ(event.target.value)} aria-label={t('audit.search')} />
      <ul className="space-y-1 text-sm">
        {audit.data?.map((item) => (
          <li key={item.id}>
            {item.actor} · {item.action} · {item.target}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ApiSettings() {
  const { t } = useTranslation('settings')
  const keys = useApiKeys()
  const hooks = useWebhooks()
  return (
    <div className="space-y-4 text-sm">
      <h2 className="font-medium">{t('api.keys')}</h2>
      <ul>
        {keys.data?.map((item) => (
          <li key={item.id}>
            {item.name} · {t('api.lastUsed')}
          </li>
        ))}
      </ul>
      <h2 className="font-medium">{t('api.webhooks')}</h2>
      <ul>
        {hooks.data?.map((item) => (
          <li key={item.id}>
            {item.url} · {item.status}
          </li>
        ))}
      </ul>
      <p className="text-fg-muted">{t('api.replay')}</p>
    </div>
  )
}
