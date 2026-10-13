import { Link, useNavigate } from '@tanstack/react-router'
import { Calendar, FileText, MessageCircle, NotebookPen, Paperclip, Sparkles, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatDateTime, formatMoney, formatRelative, useTranslation } from '@deskhand/i18n'
import { can } from '@deskhand/schemas'
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChannelIcon,
  ConsentBadge,
  CreatedByChip,
  EmptyState,
  ErrorState,
  Input,
  Label,
  Breadcrumbs,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@deskhand/ui'
import { useTask } from '../../api/booking'
import { TaskDetailDialog } from '../tasks/TaskDetailDialog'
import { TaskFormDialog } from '../tasks/TaskFormDialog'
import {
  useAddNote,
  useCompanies,
  useContact,
  useCustomFields,
  useDeleteMemory,
  usePatchContact,
  usePatchMemory,
  useRecordConsent,
} from '../../api/crm'
import { useSession } from '../../api/queries'
import { useTeam } from '../../api/settings'
import { now } from '../../lib/clock'
import { useLocaleContext } from '../../lib/location'

export const CONTACT_TABS = [
  'overview',
  'timeline',
  'conversations',
  'bookings',
  'payments',
  'notes',
  'files',
  'consent',
  'memory',
] as const
export type ContactTab = (typeof CONTACT_TABS)[number]

function waHref(phone: string | null) {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <div className="mt-1 text-sm text-fg">{children || '—'}</div>
    </div>
  )
}

export function ContactDetailPage({ contactId, tab }: { contactId: string; tab: ContactTab }) {
  const { t } = useTranslation(['contacts', 'common', 'inbox'])
  const session = useSession()
  const navigate = useNavigate()
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const query = useContact(contactId)
  const fields = useCustomFields()
  const companies = useCompanies()
  const team = useTeam()
  const patch = usePatchContact(contactId)
  const addNote = useAddNote(contactId)
  const deleteMemory = useDeleteMemory()
  const editMemory = usePatchMemory()
  const record = useRecordConsent(contactId)
  const canEdit = can(session.membership.role, 'contacts.edit')
  const [note, setNote] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [stage, setStage] = useState('')
  const [language, setLanguage] = useState('en')
  const [tags, setTags] = useState('')
  const [companyId, setCompanyId] = useState('__none__')
  const [custom, setCustom] = useState<Record<string, string>>({})
  const [memoryDraft, setMemoryDraft] = useState<Record<string, string>>({})
  const [taskOpen, setTaskOpen] = useState(false)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskEditing, setTaskEditing] = useState(false)
  const fullTask = useTask(taskId)
  const data = query.data
  const contact = data?.contact
  const name = contact ? `${contact.firstName} ${contact.lastName}` : ''

  useEffect(() => {
    if (!contact) return
    setFirstName(contact.firstName)
    setLastName(contact.lastName)
    setPhone(contact.phone ?? '')
    setEmail(contact.email ?? '')
    setStage(contact.stage)
    setLanguage(contact.language)
    setTags(contact.tags.join(', '))
    setCompanyId(contact.companyId ?? '__none__')
    setCustom(
      Object.fromEntries(Object.entries(contact.customFields).map(([key, value]) => [key, value == null ? '' : String(value)])),
    )
  }, [contact])

  const setTab = (next: string) => {
    void navigate({
      to: '/app/contacts/$contactId',
      params: { contactId },
      search: { tab: next as ContactTab },
    })
  }

  if (query.isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-64 w-full" />
      </PageContainer>
    )
  }
  if (query.isError || !contact || !data) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => void query.refetch()} />
      </PageContainer>
    )
  }

  const owner = (team.data ?? []).find((member) => member.userId === contact.assignedUserId || member.id === contact.assignedUserId)
  const thread = data.conversations[0]
  const whatsapp = waHref(contact.phone)
  const save = () => {
    const customFields = Object.fromEntries(
      (fields.data ?? []).map((field) => {
        const raw = custom[field.key]
        if (field.type === 'number') return [field.key, raw ? Number(raw) : null]
        if (field.type === 'boolean') return [field.key, raw === 'true']
        return [field.key, raw || null]
      }),
    )
    void patch
      .mutateAsync({
        firstName,
        lastName,
        phone: phone || null,
        email: email || null,
        stage,
        language,
        tags: tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        companyId: companyId === '__none__' ? null : companyId,
        customFields,
      })
      .then(() => toast.success(t('saved')))
  }

  return (
    <>
    <PageContainer>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/contacts">{label}</Link> }, { label: name }]} />}
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} className="size-12" />
            <span>
              {name}
              <span className="mt-1 block text-sm font-normal text-fg-muted">
                {contact.phone || contact.email || t('fields.noChannel')}
              </span>
            </span>
          </span>
        }
        action={
          <div className="flex flex-wrap gap-2">
            {thread && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/app/inbox/$conversationId" params={{ conversationId: thread.id }}>
                  <MessageCircle />
                  {t('actions.message')}
                </Link>
              </Button>
            )}
            {whatsapp && (
              <Button size="sm" variant="outline" asChild>
                <a href={whatsapp} target="_blank" rel="noreferrer">
                  {t('actions.whatsapp')}
                </a>
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={save} disabled={patch.isPending}>
                {t('common:actions.save')}
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge>{t(`source.${contact.sourceLabel}`)}</Badge>
        <Badge tone="neutral">{contact.language.toUpperCase()}</Badge>
        {contact.stage && <Badge tone="brand">{contact.stage}</Badge>}
        {contact.optedOut && <Badge tone="danger">{t('inbox:panel.optedOut')}</Badge>}
        {contact.consents.map((entry) => (
          <span key={entry.channel} className="inline-flex items-center gap-1">
            <ChannelIcon channel={entry.channel} className="size-3.5 text-fg-muted" />
            <ConsentBadge status={entry.status} />
          </span>
        ))}
        {contact.tags.map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
        <CreatedByChip kind={contact.createdBy.kind} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start">
          {CONTACT_TABS.map((item) => (
            <TabsTrigger key={item} value={item}>
              {t(`tabs.${item}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-fn">{t('create.firstName')}</Label>
                <Input id="c-fn" className="mt-1" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="c-ln">{t('create.lastName')}</Label>
                <Input id="c-ln" className="mt-1" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="c-ph">{t('columns.phone')}</Label>
                <Input id="c-ph" className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="c-em">{t('columns.email')}</Label>
                <Input id="c-em" className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="c-stage">{t('columns.stage')}</Label>
                <Input id="c-stage" className="mt-1" value={stage} onChange={(e) => setStage(e.target.value)} disabled={!canEdit} />
              </div>
              <div>
                <Label htmlFor="c-lang">{t('columns.language')}</Label>
                <Input id="c-lang" className="mt-1" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!canEdit} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="c-tags">{t('columns.tags')}</Label>
                <Input id="c-tags" className="mt-1" value={tags} onChange={(e) => setTags(e.target.value)} disabled={!canEdit} />
              </div>
              {(fields.data ?? []).map((field) => (
                <div key={field.id}>
                  <Label htmlFor={`cf-${field.key}`}>{field.label}</Label>
                    {field.type === 'dropdown' ? (
                    <Select value={custom[field.key] ?? ''} onValueChange={(value) => setCustom((cur) => ({ ...cur, [field.key]: value }))}>
                      <SelectTrigger id={`cf-${field.key}`} className="mt-1" disabled={!canEdit}>
                        <SelectValue placeholder={field.label} />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id={`cf-${field.key}`}
                      className="mt-1"
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={custom[field.key] ?? ''}
                      onChange={(e) => setCustom((cur) => ({ ...cur, [field.key]: e.target.value }))}
                      disabled={!canEdit}
                    />
                  )}
                </div>
              ))}
            </div>
          </Card>
          <Card className="space-y-4 p-4">
            <Field label={t('columns.source')}>{t(`source.${contact.sourceLabel}`)}</Field>
            <div>
              <Label htmlFor="c-co">{t('fields.company')}</Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={!canEdit}>
                <SelectTrigger id="c-co" className="mt-1">
                  <SelectValue placeholder={t('fields.none')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('fields.none')}</SelectItem>
                  {(companies.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {contact.companyId && (
                <Link to="/app/contacts/companies/$companyId" params={{ companyId: contact.companyId }} className="mt-1 inline-block text-xs text-fg-muted hover:underline">
                  {t('companiesPage.open')}
                </Link>
              )}
            </div>
            <Field label={t('fields.owner')}>{owner?.name ?? t('fields.unassigned')}</Field>
            <Field label={t('fields.value')}>
              {contact.value != null ? formatMoney(contact.value, ctx.currency, ctx.locale) : '—'}
            </Field>
            <Field label={t('fields.added')}>{formatDateTime(contact.createdAt, ctx)}</Field>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          {data.timeline.length === 0 ? (
            <EmptyState icon={NotebookPen} title={t('emptyTab.timeline')} description={t('emptyTab.timelineBody')} />
          ) : (
            <ol className="relative space-y-3 border-s border-border ps-4">
              {data.timeline.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -start-[21px] top-2 size-2.5 rounded-full bg-brand" />
                  <p className="text-[11px] text-fg-muted">
                    {formatRelative(event.at, now(), ctx)} · {t(`timeline.${event.kind}`)}
                  </p>
                  <p className="text-sm">{event.title}</p>
                  {event.body && <p className="text-xs text-fg-muted">{event.body}</p>}
                  <CreatedByChip kind={event.createdBy.kind} />
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="conversations">
          {data.conversations.length === 0 ? (
            <EmptyState icon={MessageCircle} title={t('emptyTab.conversations')} description={t('emptyTab.conversationsBody')} />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.conversations.map((item) => (
                <li key={item.id}>
                  <Link
                    to="/app/inbox/$conversationId"
                    params={{ conversationId: item.id }}
                    className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-surface-2"
                  >
                    <ChannelIcon channel={item.channel} className="mt-0.5 size-4 text-fg-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{t(`common:channels.${item.channel}`)}</span>
                        <span className="text-[11px] text-fg-muted">{formatRelative(item.lastMessageAt, now(), ctx)}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-fg-muted">{item.lastMessagePreview}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="bookings">
          {data.bookings.length === 0 ? (
            <EmptyState icon={Calendar} title={t('emptyTab.bookings')} description={t('emptyTab.bookingsBody')} />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {data.bookings.map((item) => (
                <li key={item.id} className="rounded-lg border border-border p-3 text-sm">
                  <p className="font-medium">{item.service}</p>
                  <p className="text-fg-muted">{formatDateTime(item.startsAt, ctx)}</p>
                  <p className="mt-1 text-xs text-fg-muted">{item.staffName}</p>
                  <Badge className="mt-2">{t(`common:status.booking.${item.status}`)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="payments">
          {data.payments.length === 0 ? (
            <EmptyState icon={Wallet} title={t('emptyTab.payments')} description={t('emptyTab.paymentsBody')} />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.payments.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>
                    <span className="font-medium">{formatMoney(item.amount, item.currency, ctx.locale)}</span>
                    <span className="ms-2 text-xs text-fg-muted">{formatRelative(item.at, now(), ctx)}</span>
                  </span>
                  <Badge tone={item.status === 'paid' ? 'success' : item.status === 'failed' ? 'danger' : 'neutral'}>
                    {t(`common:status.payment.${item.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="notes" className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="flex gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('notes.placeholder')} disabled={!canEdit} />
              <Button
                disabled={!note || !canEdit}
                onClick={() => void addNote.mutateAsync(note).then(() => setNote(''))}
              >
                {t('notes.add')}
              </Button>
            </div>
            {data.notes.length === 0 ? (
              <p className="mt-3 text-sm text-fg-muted">{t('notes.empty')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {data.notes.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border px-3 py-2">
                    <p>{item.body}</p>
                    <p className="mt-1 text-[11px] text-fg-muted">
                      {item.createdBy.name ?? t(`common:createdBy.${item.createdBy.kind}`)}
                      {' · '}
                      {formatRelative(item.createdAt, now(), ctx)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{t('tasks.title')}</p>
              <div className="flex gap-1">
                {can(session.membership.role, 'calendar.edit') && (
                  <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)}>
                    {t('tasks.add')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/app/tasks">{t('tasks.open')}</Link>
                </Button>
              </div>
            </div>
            {data.tasks.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('tasks.empty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {data.tasks.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border px-3 py-2 text-start"
                      onClick={() => setTaskId(item.id)}
                    >
                      <p className={item.done ? 'text-fg-muted line-through' : 'font-medium'}>{item.title}</p>
                      <p className="text-[11px] text-fg-muted">{formatDateTime(item.dueAt, ctx)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="files">
          {data.files.length === 0 ? (
            <EmptyState icon={Paperclip} title={t('filesEmpty')} description={t('emptyTab.filesBody')} />
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {data.files.map((file) => (
                <li key={file.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <span className="flex items-center gap-2">
                    <FileText className="size-4 text-fg-muted" />
                    {file.name}
                  </span>
                  <span className="text-[11px] text-fg-muted">{formatRelative(file.at, now(), ctx)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="consent">
          {contact.optedOut && (
            <p className="mb-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">{t('consent.suppressed')}</p>
          )}
          <p className="mb-3 text-sm font-medium">{t('consent.channels')}</p>
          <ul className="mb-6 flex flex-col gap-2 text-sm">
            {contact.consents.map((entry) => (
              <li key={entry.channel} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="flex items-center gap-2">
                  <ChannelIcon channel={entry.channel} className="size-4 text-fg-muted" />
                  {t(`common:channels.${entry.channel}`)}
                </span>
                <ConsentBadge status={entry.status} />
                <span className="w-full text-xs text-fg-muted sm:w-auto">
                      {t(`consent.sources.${entry.source}`)} · {t('consent.wording', { version: entry.wordingVersion })} ·{' '}
                  {t('consent.at', { date: formatDateTime(entry.recordedAt, ctx) })}
                </span>
                {canEdit && entry.status === 'missing' && !contact.optedOut && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void record.mutateAsync({ channel: entry.channel, status: 'granted' }).then(() => toast.success(t('consent.recorded')))
                    }
                  >
                    {t('consent.record')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <p className="mb-2 text-sm font-medium">{t('consent.ledger')}</p>
          {data.ledger.length === 0 ? (
            <p className="text-sm text-fg-muted">{t('consent.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {data.ledger.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-border px-3 py-2">
                  <p>
                    {t(`common:channels.${entry.channel}`)} · {t(`consent.purpose.${entry.purpose}`)}
                  </p>
                  <p className="text-xs text-fg-muted">
                    {t(`consent.sources.${entry.source}`)} · {entry.wordingVersion} · {formatDateTime(entry.recordedAt, ctx)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="memory">
          {session.account.aiMode === 'manual' || session.account.aiMode === 'off' || data.memories.length === 0 ? (
            <EmptyState icon={Sparkles} title={t('memory.empty')} description={t('memory.emptyBody')} />
          ) : (
            <ul className="flex flex-col gap-2">
              {data.memories.map((item) => (
                <li key={item.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                  <p className="text-xs font-medium text-fg-muted">{t(`memory.keys.${item.key}`)}</p>
                  {canEdit ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Input
                        value={memoryDraft[item.id] ?? item.value}
                        onChange={(e) => setMemoryDraft((cur) => ({ ...cur, [item.id]: e.target.value }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void editMemory.mutateAsync({ id: item.id, value: memoryDraft[item.id] ?? item.value }).then(() => toast.success(t('memory.saved')))
                        }
                      >
                        {t('common:actions.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-outline"
                        onClick={() => void deleteMemory.mutateAsync(item.id).then(() => toast.success(t('memory.deleted')))}
                      >
                        {t('memory.delete')}
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-1">{item.value}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
    <TaskFormDialog
      open={taskOpen || taskEditing}
      task={taskEditing ? fullTask.data : null}
      onOpenChange={(next) => {
        setTaskOpen(next)
        if (!next) setTaskEditing(false)
      }}
      preset={{ linkedKind: 'contact', linkedId: contactId, label: name }}
    />
    <TaskDetailDialog
      task={taskOpen || taskEditing ? null : fullTask.data ?? null}
      onOpenChange={(next) => {
        if (!next) setTaskId(null)
      }}
      onEdit={() => setTaskEditing(true)}
    />
    </>
  )
}
