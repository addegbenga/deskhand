import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { CalendarDays, FileText, Link2, Megaphone } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatDateTime, formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea, type Campaign, type CampaignCheck, type PlannerPost } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import { useSmartLists, useTemplates } from '../../api/crm'
import {
  useApprovePost,
  useCampaigns,
  useCheckCampaign,
  useCreateCampaign,
  useCreateForm,
  useCreateLink,
  useCreateTemplate,
  useFormResponses,
  useForms,
  usePatchPost,
  usePatchTemplate,
  usePlanner,
  useSendCampaign,
  useTrackLinks,
} from '../../api/grow'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'
import {
  Badge,
  Button,
  CampaignCheckPanel,
  Combobox,
  Card,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  QrPoster,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusChip,
  Textarea,
  toast,
  usePermission,
} from '@deskhand/ui'
import { GrowTabs } from './GrowTabs'

function Guard({ children }: { children: ReactNode }) {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  if (!canSeeArea(session.membership.role, 'marketing')) {
    return (
      <PageContainer>
        <PageHeader title={t('marketing.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }
  return <>{children}</>
}

export function MarketingLayout() {
  const { t } = useTranslation('grow')
  const tabs = [
    { to: '/app/marketing/planner', label: t('marketing.tabs.planner') },
    { to: '/app/marketing/campaigns', label: t('marketing.tabs.campaigns') },
    { to: '/app/marketing/templates', label: t('marketing.tabs.templates') },
    { to: '/app/marketing/links', label: t('marketing.tabs.links') },
    { to: '/app/marketing/forms', label: t('marketing.tabs.forms') },
  ]
  return (
    <Guard>
      <PageContainer>
        <PageHeader title={t('marketing.title')} tabs={<GrowTabs items={tabs} />} />
        <Outlet />
      </PageContainer>
    </Guard>
  )
}

function checkLabels(t: (key: string) => string) {
  return {
    audience: t('marketing.audience'),
    sendable: t('marketing.sendable'),
    consent: t('marketing.consent'),
    optOut: t('marketing.optOut'),
    quiet: t('marketing.quiet'),
    template: t('marketing.templateStatus'),
    ready: t('marketing.ready'),
    blocked: t('marketing.blocked'),
  }
}

export function PlannerPage() {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const list = usePlanner()
  const approve = useApprovePost()
  const patch = usePatchPost()
  const access = usePermission('publishing.approve')
  const [editing, setEditing] = useState<Record<string, string>>({})

  const byDay = useMemo(() => {
    const groups = new Map<string, PlannerPost[]>()
    for (const post of list.data ?? []) {
      const key = post.scheduledFor?.slice(0, 10) ?? 'none'
      groups.set(key, [...(groups.get(key) ?? []), post])
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [list.data])

  if (list.isPending) return <Skeleton className="h-32" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  if (!list.data?.length) {
    return <EmptyState icon={CalendarDays} title={t('marketing.emptyPlanner.title')} description={t('marketing.emptyPlanner.body')} />
  }

  const run = (post: PlannerPost, status: PlannerPost['status']) =>
    void patch
      .mutateAsync({ id: post.id, status, scheduledFor: post.scheduledFor ?? new Date().toISOString() })
      .then(() => toast.success(t(status === 'scheduled' ? 'marketing.scheduledToast' : 'marketing.publishedToast')))

  return (
    <div className="space-y-6">
      {byDay.map(([day, posts]) => (
        <section key={day}>
          <h2 className="mb-2 text-sm font-medium text-fg-muted">
            {day === 'none' ? t('marketing.unscheduled') : formatDateTime(`${day}T12:00:00.000Z`, ctx, { dateStyle: 'full' })}
          </h2>
          <div className="grid gap-3">
            {posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {post.createdBy.kind === 'ai_employee' && post.status === 'draft' ? (
                    <Badge tone="ai">{t('marketing.draft')}</Badge>
                  ) : (
                    <StatusChip domain="post" value={post.status} />
                  )}
                  <span className="text-xs text-fg-muted">
                    {post.platform === 'whatsapp'
                      ? t('common:channels.whatsapp')
                      : post.platform === 'instagram'
                        ? t('common:channels.instagram')
                        : t('common:channels.messenger')}
                    {post.status === 'published' ? ` · ${t('marketing.likes', { count: post.likes })}` : ''}
                  </span>
                </div>
                <Textarea
                  className="mt-3"
                  value={editing[post.id] ?? post.caption}
                  onChange={(event) => setEditing((current) => ({ ...current, [post.id]: event.target.value }))}
                  disabled={!access.allowed || post.status === 'published'}
                />
                {access.allowed && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(editing[post.id] ?? post.caption) !== post.caption && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void patch.mutateAsync({ id: post.id, caption: editing[post.id] }).then(() => toast.success(t('marketing.saveCaption')))
                        }
                      >
                        {t('marketing.saveCaption')}
                      </Button>
                    )}
                    {post.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => void approve.mutateAsync(post.id).then(() => toast.success(t('marketing.approvedToast')))}
                      >
                        {t('marketing.approve')}
                      </Button>
                    )}
                    {post.status === 'approved' && (
                      <Button size="sm" onClick={() => run(post, 'scheduled')}>
                        {t('marketing.schedule')}
                      </Button>
                    )}
                    {(post.status === 'approved' || post.status === 'scheduled') && (
                      <Button size="sm" variant="outline" onClick={() => run(post, 'published')}>
                        {t('marketing.publishPost')}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export function CampaignsPage({ presetListId }: { presetListId?: string }) {
  const { t } = useTranslation(['grow', 'common', 'contacts'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const campaigns = useCampaigns()
  const templates = useTemplates()
  const smartLists = useSmartLists()
  const create = useCreateCampaign()
  const check = useCheckCampaign()
  const send = useSendCampaign()
  const access = usePermission('publishing.approve')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [listId, setListId] = useState('all')
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [templateId, setTemplateId] = useState('')
  const [result, setResult] = useState<CampaignCheck | null>(null)
  const [active, setActive] = useState<string | null>(null)
  const forChannel = (templates.data ?? []).filter((item) => item.channel === channel)
  const approved = forChannel.filter((item) => item.status === 'approved')
  const chosen = templateId || approved[0]?.id || forChannel[0]?.id || ''
  const selected = campaigns.data?.find((item) => item.id === active)
  const rows = useMemo(
    () => [...(campaigns.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [campaigns.data],
  )

  const open = (id: string) => {
    setActive(id)
    setResult(null)
    const row = campaigns.data?.find((item) => item.id === id)
    if (row && row.status !== 'sent') void check.mutateAsync(id).then(setResult)
  }

  useEffect(() => {
    if (!presetListId) return
    setListId(presetListId)
    setCreating(true)
  }, [presetListId])

  if (campaigns.isPending) return <Skeleton className="h-32" />
  if (campaigns.isError) return <ErrorState onRetry={() => void campaigns.refetch()} />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={() => {
            setName('')
            setListId(presetListId ?? 'all')
            setChannel('whatsapp')
            setTemplateId('')
            setCreating(true)
          }}
        >
          {t('marketing.newCampaign')}
        </Button>
      </div>
      {!rows.length ? (
        <EmptyState
          icon={Megaphone}
          title={t('marketing.emptyCampaigns.title')}
          description={t('marketing.emptyCampaigns.body')}
          action={
            <Button onClick={() => setCreating(true)}>{t('marketing.newCampaign')}</Button>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="bg-surface-2 text-start text-fg-muted">
              <tr>
                <th className="p-3 font-medium">{t('marketing.name')}</th>
                <th className="p-3 font-medium">{t('marketing.channel')}</th>
                <th className="p-3 font-medium">{t('marketing.colStatus')}</th>
                <th className="p-3 font-medium tabular">{t('marketing.audience')}</th>
                <th className="p-3 font-medium tabular">{t('marketing.delivered')}</th>
                <th className="p-3 font-medium tabular">{t('marketing.replies')}</th>
                <th className="p-3 font-medium tabular">{t('marketing.bookings')}</th>
                <th className="p-3 font-medium tabular">{t('marketing.revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.id}
                  className="cursor-pointer hover:bg-surface-2"
                  onClick={() => open(item.id)}
                >
                  <td className="border-t border-border p-3">
                    <button type="button" className="font-medium">
                      {item.name}
                    </button>
                  </td>
                  <td className="border-t border-border p-3">{t(`marketing.channels.${item.channel}`)}</td>
                  <td className="border-t border-border p-3">
                    <StatusChip domain="campaign" value={item.status} />
                  </td>
                  <td className="border-t border-border p-3 tabular">{item.audienceSize}</td>
                  <td className="border-t border-border p-3 tabular">{item.status === 'sent' ? item.delivered : '—'}</td>
                  <td className="border-t border-border p-3 tabular">{item.status === 'sent' ? item.replies : '—'}</td>
                  <td className="border-t border-border p-3 tabular">{item.status === 'sent' ? item.bookings : '—'}</td>
                  <td className="border-t border-border p-3 tabular">
                    {item.status === 'sent' ? formatMoney(item.revenue, ctx.currency, ctx.locale) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogTitle>{t('marketing.newCampaign')}</DialogTitle>
          <p className="text-sm text-fg-muted">{t('marketing.createHint')}</p>
          <div className="space-y-3">
            <div>
              <Label htmlFor="campaign-name">{t('marketing.name')}</Label>
              <Input id="campaign-name" className="mt-1" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label>{t('marketing.group')}</Label>
              <Combobox
                className="mt-1"
                value={listId}
                onChange={setListId}
                placeholder={t('marketing.allContacts')}
                searchPlaceholder={t('contacts:groups.search')}
                emptyText={t('contacts:groups.empty')}
                options={[
                  { value: 'all', label: t('marketing.allContacts') },
                  ...(smartLists.data ?? []).map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
              <p className="mt-1 text-xs text-fg-muted">{t('marketing.groupHint')}</p>
            </div>
            <div>
              <Label>{t('marketing.channel')}</Label>
              <Select
                value={channel}
                onValueChange={(value) => {
                  setChannel(value as 'whatsapp' | 'email')
                  setTemplateId('')
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">{t('marketing.channels.whatsapp')}</SelectItem>
                  <SelectItem value="email">{t('marketing.channels.email')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('marketing.template')}</Label>
              {forChannel.length === 0 ? (
                <p className="mt-1 text-sm text-fg-muted">{t('marketing.needTemplate')}</p>
              ) : (
                <Select value={chosen} onValueChange={setTemplateId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {forChannel.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!chosen || name.trim().length < 2 || create.isPending}
              onClick={() =>
                void create.mutateAsync({ name: name.trim(), channel, templateId: chosen, listId: listId === 'all' ? null : listId }).then((row) => {
                  toast.success(t('marketing.created'))
                  setCreating(false)
                  open(row.id)
                })
              }
            >
              {t('marketing.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(active)} onOpenChange={(openState) => !openState && setActive(null)}>
        <DialogContent className="max-w-xl">
          {selected && (
            <>
              <DialogTitle>{selected.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip domain="campaign" value={selected.status} />
                <span className="text-sm text-fg-muted">{t(`marketing.channels.${selected.channel}`)}</span>
                {selected.listId && (
                  <span className="text-sm text-fg-muted">
                    {t('marketing.group')}: {(smartLists.data ?? []).find((item) => item.id === selected.listId)?.name ?? selected.listId}
                  </span>
                )}
              </div>
              {selected.status === 'sent' ? (
                <CampaignResults campaign={selected} />
              ) : (
                <div className="space-y-3">
                  <Button variant="outline" size="sm" onClick={() => void check.mutateAsync(selected.id).then(setResult)}>
                    {t('marketing.check')}
                  </Button>
                  {result && (
                    <>
                      <CampaignCheckPanel {...result} labels={checkLabels(t)} />
                      <p className="text-sm font-medium">{t('marketing.why')}</p>
                      <ul className="max-h-40 overflow-auto text-sm text-fg-muted">
                        {result.reasons.map((row) => (
                          <li key={row.contactId + row.reason}>
                            {row.name}: {t(`marketing.reasons.${row.reason}`)}
                          </li>
                        ))}
                      </ul>
                      {access.allowed && (
                        <Button
                          disabled={!result.canSend || send.isPending}
                          onClick={() =>
                            void send.mutateAsync(selected.id).then(
                              () => {
                                toast.success(t('marketing.sentToast'))
                                setResult(null)
                              },
                              (error) => toast.error(isApiError(error) ? t('marketing.blocked') : t('common:actions.retry')),
                            )
                          }
                        >
                          {t('marketing.send')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CampaignResults({ campaign }: { campaign: Campaign }) {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-fg-muted">{t('marketing.delivered')}</dt>
        <dd className="tabular font-medium">{campaign.delivered}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('marketing.replies')}</dt>
        <dd className="tabular font-medium">{campaign.replies}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('marketing.bookings')}</dt>
        <dd className="tabular font-medium">{campaign.bookings}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('marketing.revenue')}</dt>
        <dd className="tabular font-medium">{formatMoney(campaign.revenue, ctx.currency, ctx.locale)}</dd>
      </div>
      <div>
        <dt className="text-fg-muted">{t('marketing.optOuts')}</dt>
        <dd className="tabular font-medium">{campaign.optOuts}</dd>
      </div>
    </dl>
  )
}

export function TemplatesPage() {
  const { t } = useTranslation('grow')
  const templates = useTemplates()
  const patch = usePatchTemplate()
  const create = useCreateTemplate()
  if (templates.isPending) return <Skeleton className="h-32" />
  if (templates.isError) return <ErrorState onRetry={() => void templates.refetch()} />
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void create
              .mutateAsync({
                name: 'Offer follow-up',
                channel: 'whatsapp',
                body: 'Hi {{1}}, we still have a chair this week. Reply YES to book.',
              })
              .then(() => toast.success(t('marketing.fromPack')))
          }
        >
          {t('marketing.fromPack')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            void create
              .mutateAsync({
                name: 'Visit reminder email',
                channel: 'email',
                body: 'Hi {{1}}, reminder of your visit on {{2}}.',
              })
              .then(() => toast.success(t('marketing.fromPack')))
          }
        >
          {t('marketing.channels.email')}
        </Button>
      </div>
      <p className="text-sm text-fg-muted">{t('marketing.emailFooter')}</p>
      {!templates.data?.length ? (
        <EmptyState icon={FileText} title={t('marketing.emptyTemplates.title')} description={t('marketing.emptyTemplates.body')} />
      ) : (
        templates.data.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{item.name}</p>
              <StatusChip domain="template" value={item.status} />
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              {item.language} · {item.channel} · {t('marketing.usage', { count: item.usageCount })}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">{item.body}</p>
            {item.rejectionReason && (
              <p className="mt-2 text-sm text-danger">
                {t('marketing.rejection')}: {item.rejectionReason}
              </p>
            )}
            {item.status === 'draft' && (
              <Button className="mt-3" size="sm" onClick={() => void patch.mutateAsync({ id: item.id, status: 'pending' })}>
                {t('marketing.submit')}
              </Button>
            )}
          </Card>
        ))
      )}
    </div>
  )
}

export function LinksPage() {
  const { t } = useTranslation('grow')
  const links = useTrackLinks()
  const create = useCreateLink()
  const [label, setLabel] = useState('Window poster')
  const [print, setPrint] = useState<{ href: string; title: string } | null>(null)
  if (links.isPending) return <Skeleton className="h-32" />
  if (links.isError) return <ErrorState onRetry={() => void links.refetch()} />
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <Label>{t('marketing.label')}</Label>
        <Input className="mt-1" value={label} onChange={(event) => setLabel(event.target.value)} />
        <Button
          className="mt-3"
          onClick={() =>
            void create.mutateAsync(label).then((row) => {
              toast.success(t('marketing.newLink'))
              setPrint({ href: row.href, title: row.label })
            })
          }
        >
          {t('marketing.newLink')}
        </Button>
        {!links.data?.length ? (
          <EmptyState className="mt-4" icon={Link2} title={t('marketing.emptyLinks.title')} description={t('marketing.emptyLinks.body')} />
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {links.data.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <span>
                  {item.label} · {t('marketing.clicks')} {item.clicks}
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" asChild>
                    <a href={item.href} target="_blank" rel="noreferrer">
                      {t('marketing.openLink')}
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void navigator.clipboard.writeText(item.href).then(() => toast.success(t('marketing.copied')))}
                  >
                    {t('marketing.copyLink')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPrint({ href: item.href, title: item.label })}>
                    {t('marketing.print')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {print && <QrPoster href={print.href} title={print.title} subtitle={print.href} />}
    </div>
  )
}

export function FormsListPage() {
  const { t } = useTranslation('grow')
  const list = useForms()
  const create = useCreateForm()
  const navigate = useNavigate()
  if (list.isPending) return <Skeleton className="h-32" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  return (
    <div>
      <Button className="mb-4" onClick={() => void create.mutateAsync(t('marketing.untitledForm')).then((form) => navigate({ to: '/app/marketing/forms/$formId', params: { formId: form.id } }))}>
        {t('marketing.newForm')}
      </Button>
      {!list.data?.length ? (
        <EmptyState icon={FileText} title={t('marketing.emptyForms.title')} description={t('marketing.emptyForms.body')} />
      ) : (
        <ul className="space-y-2">
          {list.data.map((form) => (
            <li key={form.id}>
              <Link className="flex items-center justify-between rounded-md border border-border p-3" to="/app/marketing/forms/$formId" params={{ formId: form.id }}>
                <span>
                  {form.name} · {form.kind}
                </span>
                <StatusChip domain="post" value={form.status === 'live' ? 'published' : 'draft'} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export { FormBuilderPage } from './FormBuilderPage'

export function FormResponsesPage({ formId }: { formId: string }) {
  const { t } = useTranslation('grow')
  const rows = useFormResponses(formId)
  if (rows.isPending) return <Skeleton className="h-32" />
  if (rows.isError) return <ErrorState onRetry={() => void rows.refetch()} />
  if (!rows.data?.length) {
    return (
      <div>
        <Link className="mb-4 inline-block text-sm text-brand" to="/app/marketing/forms" activeOptions={{ exact: true }}>
          {t('marketing.backForms')}
        </Link>
        <EmptyState icon={FileText} title={t('marketing.emptyResponses.title')} description={t('marketing.emptyResponses.body')} />
      </div>
    )
  }
  return (
    <div>
      <Link className="mb-4 inline-block text-sm text-brand" to="/app/marketing/forms" activeOptions={{ exact: true }}>
        {t('marketing.backForms')}
      </Link>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-start text-fg-muted">
            <th className="p-2">{t('marketing.responses')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.data.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="p-2">
                {row.contactName} — {Object.values(row.answers).join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
