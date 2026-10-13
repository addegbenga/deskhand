import { Download, Plus, Receipt, Users } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { formatDateTime, formatMoney, formatRelative, useTranslation } from '@deskhand/i18n'
import { STATUS_MAP, type StatusDomain } from '@deskhand/ui'
import {
  AIBadge,
  AISurface,
  Avatar,
  Banner,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Combobox,
  ConfidenceMeter,
  CurrencyInput,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  OfflineBanner,
  PageContainer,
  PageHeader,
  PermissionGate,
  PhoneInput,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StaleBanner,
  StatusChip,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  TimePicker,
  toast,
  Tooltip,
  useRole,
} from '@deskhand/ui'
import { getMarketPack } from '@deskhand/config'
import { isApiError } from '@deskhand/schemas'
import { useDemoContacts, useSession } from '../../api/queries'
import { now } from '../../lib/clock'
import { useLocaleContext } from '../../lib/location'

type Mode = 'ok' | 'empty' | 'error' | 'forbidden'

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function ContactListSkeleton() {
  return (
    <ul className="flex flex-col divide-y divide-border" aria-busy>
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-8 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </li>
      ))}
    </ul>
  )
}

function LiveStates() {
  const { t, i18n } = useTranslation('common')
  const session = useSession()
  const ctx = useLocaleContext(session)
  const [mode, setMode] = useState<Mode>('ok')
  const [forceLoading, setForceLoading] = useState(false)
  const query = useDemoContacts(mode)

  let body: ReactNode
  if (forceLoading || query.isPending) body = <ContactListSkeleton />
  else if (query.isError) {
    const error = query.error
    body =
      isApiError(error, 'forbidden') ? (
        <NoPermissionState
          roleLabel={t(`roles.${error.requiredRole ?? 'owner'}`)}
          onRequestAccess={() => toast.success(t('states.noPermission.requested'))}
        />
      ) : (
        <ErrorState
          supportCode={isApiError(error) ? error.supportCode : undefined}
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      )
  } else if (query.data.items.length === 0) {
    body = (
      <EmptyState
        icon={Users}
        title={t('dev.states.emptyTitle')}
        description={t('dev.states.emptyBody')}
        action={
          <Button>
            <Plus />
            {t('quickCreate.contact')}
          </Button>
        }
      />
    )
  } else {
    body = (
      <ul className="flex flex-col divide-y divide-border">
        {query.data.items.map((contact) => (
          <li key={contact.id} className="flex items-center gap-3 py-3">
            <Avatar name={`${contact.firstName} ${contact.lastName}`} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {contact.firstName} {contact.lastName}
              </p>
              <p className="truncate text-xs text-fg-muted" dir="ltr">
                {contact.phone}
              </p>
            </div>
            <time className="text-xs text-fg-muted" dateTime={contact.createdAt} title={formatDateTime(contact.createdAt, ctx)}>
              {formatRelative(contact.createdAt, now(), { ...ctx, language: i18n.language })}
            </time>
            <span className="hidden sm:inline">
              <StatusChip domain="consent" value={contact.email ? 'granted' : 'missing'} />
            </span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <Section title={t('dev.states.liveTitle')} description={t('dev.states.liveBody')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList>
            {(['ok', 'empty', 'error', 'forbidden'] as const).map((m) => (
              <TabsTrigger key={m} value={m}>
                {t(`dev.states.modes.${m}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={forceLoading} onCheckedChange={setForceLoading} />
          {t('dev.states.forceLoading')}
        </label>
      </div>
      {mode === 'forbidden' && <p className="mt-3 text-xs text-fg-muted">{t('dev.states.forbiddenHint')}</p>}
      <div className="mt-4 min-h-72">{body}</div>
    </Section>
  )
}

function ControlsGallery() {
  const { t } = useTranslation('common')
  const session = useSession()
  const ctx = useLocaleContext(session)
  const pack = getMarketPack(session.account.market)
  const [date, setDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [market, setMarket] = useState(session.account.market)
  const [amount, setAmount] = useState<number | null>(15000)
  const [service, setService] = useState<string | null>(null)

  return (
    <Section title={t('dev.states.controlsTitle')} description={t('dev.states.controlsBody')}>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="demo-name">{t('fields.name')}</Label>
          <Input id="demo-name" placeholder={t('fields.namePlaceholder')} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-channel">{t('fields.channel')}</Label>
          <Select defaultValue="whatsapp">
            <SelectTrigger id="demo-channel">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['whatsapp', 'webchat', 'email', 'sms'] as const).map((c) => (
                <SelectItem key={c} value={c} disabled={!pack.channels[c]}>
                  {t(`connections.${c}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-service">{t('fields.service')}</Label>
          <Combobox
            id="demo-service"
            value={service}
            onChange={setService}
            placeholder={t('fields.servicePlaceholder')}
            searchPlaceholder={t('fields.search')}
            emptyText={t('search.noResults')}
            options={['Knotless braids', 'Cornrows', 'Passion twist', 'Silk press', 'Wig install'].map((s) => ({ value: s, label: s }))}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-phone">{t('fields.phone')}</Label>
          <PhoneInput id="demo-phone" market={market} onMarketChange={setMarket} value={phone} onChange={setPhone} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-date">{t('fields.date')}</Label>
          <DatePicker id="demo-date" value={date} onChange={setDate} locale={ctx.locale} weekStartsOn={pack.weekStartsOn} placeholder={t('fields.pickDate')} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-time">{t('fields.time', { zone: ctx.timeZone })}</Label>
          <TimePicker id="demo-time" value={time} onChange={setTime} locale={ctx.locale} hourCycle={pack.hourCycle} placeholder={t('fields.pickTime')} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-amount">{t('fields.amount')}</Label>
          <CurrencyInput id="demo-amount" value={amount} onChange={setAmount} currency={ctx.currency} locale={ctx.locale} />
          <p className="tabular text-xs text-fg-muted">{amount !== null && formatMoney(amount, ctx.currency, ctx.locale)}</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="demo-note">{t('fields.note')}</Label>
          <Textarea id="demo-note" placeholder={t('fields.notePlaceholder')} />
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> {t('fields.consent')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch defaultChecked /> {t('fields.aiSuggestions')}
          </label>
        </div>
        <RadioGroup defaultValue="approve" aria-label={t('fields.autonomy')}>
          {(['suggest', 'approve', 'autopilot'] as const).map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm">
              <RadioGroupItem value={v} /> {t(`fields.autonomyLevels.${v}`)}
            </label>
          ))}
        </RadioGroup>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => toast.success(t('dev.states.saved'))}>{t('actions.save')}</Button>
        <Button variant="outline">{t('actions.cancel')}</Button>
        <Button variant="secondary">{t('dev.states.secondary')}</Button>
        <Button variant="ghost">{t('dev.states.ghost')}</Button>
        <Button variant="ai">{t('dev.states.aiAction')}</Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="danger-outline">{t('dev.states.deleteContacts')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dev.states.deleteTitle', { count: 3 })}</DialogTitle>
              <DialogDescription>{t('dev.states.deleteBody', { count: 3 })}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t('actions.cancel')}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="danger" onClick={() => toast.success(t('dev.states.deleted', { count: 3 }))}>
                  {t('dev.states.deleteConfirm', { count: 3 })}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="outline">{t('dev.states.openDrawer')}</Button>
          </DrawerTrigger>
          <DrawerContent className="p-6">
            <DrawerHeader>
              <DrawerTitle>{t('dev.states.drawerTitle')}</DrawerTitle>
              <DrawerDescription>{t('dev.states.drawerBody')}</DrawerDescription>
            </DrawerHeader>
          </DrawerContent>
        </Drawer>
        <Tooltip content={t('dev.states.tooltip')}>
          <Button variant="ghost">{t('dev.states.hoverMe')}</Button>
        </Tooltip>
      </div>
    </Section>
  )
}

export function StatesDemo() {
  const { t } = useTranslation('common')
  const role = useRole()
  const [drafting, setDrafting] = useState(true)

  return (
    <PageContainer className="flex flex-col gap-6">
      <PageHeader title={t('dev.statesTitle')} description={t('dev.statesIntro')} />

      <LiveStates />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t('dev.states.offlineTitle')} description={t('dev.states.offlineBody')}>
          <OfflineBanner className="rounded-md" />
        </Section>
        <Section title={t('dev.states.staleTitle')} description={t('dev.states.staleBody')}>
          <StaleBanner onRefresh={() => toast(t('dev.states.refreshed'))} />
        </Section>
      </div>

      <Section title={t('dev.states.permissionTitle')} description={t('dev.states.permissionBody', { role: t(`roles.${role}`) })}>
        <div className="flex flex-wrap items-center gap-3">
          <PermissionGate capability="contacts.export" mode="disable">
            <Button variant="outline">
              <Download />
              {t('dev.states.exportContacts')}
            </Button>
          </PermissionGate>
          <PermissionGate capability="billing.manage" mode="disable">
            <Button variant="outline">
              <Receipt />
              {t('dev.states.manageBilling')}
            </Button>
          </PermissionGate>
          <PermissionGate capability="team.manage" mode="hide">
            <Button variant="outline">{t('dev.states.inviteTeammate')}</Button>
          </PermissionGate>
        </div>
        <p className="mt-3 text-xs text-fg-muted">{t('dev.states.permissionHint')}</p>
      </Section>

      <Section title={t('dev.states.bannersTitle')}>
        <div className="flex flex-col gap-3">
          <Banner severity="info" title={t('banners.trial.title', { days: 9 })} action={<Button size="sm" variant="outline">{t('banners.trial.fix')}</Button>}>
            {t('banners.trial.body')}
          </Banner>
          <Banner severity="attention" title={t('banners.past_due.title', { days: 3 })} action={<Button size="sm" variant="outline">{t('banners.past_due.fix')}</Button>}>
            {t('banners.past_due.body')}
          </Banner>
          <Banner severity="danger" title={t('banners.compliance_blocking.title')} action={<Button size="sm" variant="outline">{t('banners.compliance_blocking.fix')}</Button>}>
            {t('banners.compliance_blocking.body')}
          </Banner>
        </div>
      </Section>

      <Section title={t('dev.states.chipsTitle')} description={t('dev.states.chipsBody')}>
        <dl className="grid gap-4">
          {(Object.keys(STATUS_MAP) as StatusDomain[]).map((domain) => (
            <div key={domain} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
              <dt className="text-sm text-fg-muted">{t(`dev.states.domains.${domain}`)}</dt>
              <dd className="flex flex-wrap gap-2">
                {Object.keys(STATUS_MAP[domain]).map((value) => (
                  <StatusChip
                    key={value}
                    domain={domain}
                    value={value as never}
                    detail={domain === 'connection' && value !== 'healthy' ? t('connections.problems.token_expired') : undefined}
                  />
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t('dev.states.aiTitle')} description={t('dev.states.aiBody')}>
        <div className="flex flex-wrap items-center gap-3">
          <AIBadge name="Ada" />
          <AIBadge />
          <ConfidenceMeter level="high" />
          <ConfidenceMeter level="medium" />
          <ConfidenceMeter level="low" />
        </div>
        <AISurface drafting={drafting} className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <AIBadge name="Ada" />
            <label className="flex items-center gap-2 text-xs text-fg-muted">
              <Switch checked={drafting} onCheckedChange={setDrafting} />
              {t('dev.states.drafting')}
            </label>
          </div>
          <p className="text-sm">{t('dev.states.sampleDraft')}</p>
        </AISurface>
      </Section>

      <ControlsGallery />
    </PageContainer>
  )
}
