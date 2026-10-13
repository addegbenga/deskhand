import { Link, useNavigate } from '@tanstack/react-router'
import { Inbox as InboxIcon, ListFilter, MoreHorizontal, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatRelative, useTranslation } from '@deskhand/i18n'
import { can, canSeeArea, ChannelKindSchema, type ConversationThread, type InboxView } from '@deskhand/schemas'
import {
  AIBadge,
  AISurface,
  Avatar,
  Badge,
  Banner,
  Button,
  ChannelIcon,
  Checkbox,
  ConfidenceMeter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  IconButton,
  Input,
  Label,
  MessageBubble,
  NoPermissionState,
  Pane,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  ThreePane,
  WhyPopover,
  toast,
  usePermission,
} from '@deskhand/ui'
import {
  useAcceptDraft,
  useBulkConversations,
  useConversations,
  useDiscardDraft,
  usePatchConversation,
  useRateMessage,
  useTeamOptions,
  useTestMessage,
  useThread,
} from '../../api/crm'
import { useConnections } from '../../api/settings'
import { useSession } from '../../api/queries'
import { now } from '../../lib/clock'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'
import { TaskFormDialog } from '../tasks/TaskFormDialog'
import { Composer } from './Composer'
import { ContactSidePanel } from './ContactSidePanel'

const VIEWS: InboxView[] = ['all', 'mine', 'unassigned', 'needs_human', 'ai_handled', 'waiting', 'snoozed', 'closed']
const ALL = 'all'
const CHANNELS = ChannelKindSchema.options
const DATES = ['all', 'today', '7d', '30d'] as const

export function InboxPage({ conversationId }: { conversationId?: string }) {
  const { t } = useTranslation(['inbox', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const { locationId } = useSelectedLocation(session)
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const viewAccess = usePermission('conversations.view')
  const [view, setView] = useState<InboxView>('all')
  const [q, setQ] = useState('')
  const [channel, setChannel] = useState(ALL)
  const [assignee, setAssignee] = useState(ALL)
  const [tag, setTag] = useState(ALL)
  const [stage, setStage] = useState(ALL)
  const [language, setLanguage] = useState(ALL)
  const [since, setSince] = useState(ALL)
  const [locationFilter, setLocationFilter] = useState(ALL)
  const [selected, setSelected] = useState<string[]>([])
  const [taskOpen, setTaskOpen] = useState(false)
  const team = useTeamOptions()
  const connections = useConnections()
  const list = useConversations({
    view,
    q,
    channel: channel === ALL ? undefined : channel,
    assignedUserId: assignee === ALL ? undefined : assignee,
    tag: tag === ALL ? undefined : tag,
    stage: stage === ALL ? undefined : stage,
    language: language === ALL ? undefined : language,
    since: since === ALL ? undefined : since,
    locationId: locationFilter === ALL ? locationId : locationFilter,
  })
  const thread = useThread(conversationId)
  const bulk = useBulkConversations()
  const test = useTestMessage()
  const patch = usePatchConversation(conversationId ?? '')
  const acceptDraft = useAcceptDraft(conversationId ?? '')
  const discardDraft = useDiscardDraft(conversationId ?? '')
  const rate = useRateMessage()
  const canSend = can(session.membership.role, 'messages.send')
  const aiOff = session.account.aiMode === 'manual' || session.account.aiMode === 'off'
  const items = list.data?.items ?? []

  const ids = useMemo(() => (list.data?.items ?? []).map((c) => c.id), [list.data?.items])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (event.key === 'Escape') target.blur()
        return
      }
      const index = conversationId ? ids.indexOf(conversationId) : -1
      if (event.key === 'j' && index < ids.length - 1) void navigate({ to: '/app/inbox/$conversationId', params: { conversationId: ids[index + 1]! } })
      if (event.key === 'k' && index > 0) void navigate({ to: '/app/inbox/$conversationId', params: { conversationId: ids[index - 1]! } })
      if (event.key === 'e' && conversationId) void patch.mutateAsync({ assignedUserId: session.user.id })
      if (event.key === 's' && conversationId) void patch.mutateAsync({ status: 'snoozed' })
      if (event.key === 'c' && conversationId) void patch.mutateAsync({ status: 'closed' })
      if (event.key === '/') {
        event.preventDefault()
        document.getElementById('composer')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [conversationId, ids, navigate, patch, session.user.id])

  if (!canSeeArea(session.membership.role, 'inbox')) {
    return <NoPermissionState roleLabel={t(`common:roles.${viewAccess.requiredRole}`)} />
  }

  const activeFilters = [channel, assignee, tag, stage, language, since, locationFilter].filter((value) => value !== ALL).length
  const channels = CHANNELS.map((item) => t(`common:channels.${item}`)).slice(0, 3).join(', ')
  const down = (connections.data?.groups ?? [])
    .flatMap((group) => group.cards)
    .filter((card) => (CHANNELS as readonly string[]).includes(card.kind) && (card.health === 'broken' || card.health === 'degraded' || card.status === 'needs_attention'))

  return (
    <>
    <ThreePane
      showThread={Boolean(conversationId)}
      list={
        <Pane>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <h1 className="text-base font-semibold">{t('title')}</h1>
            {selected.length > 0 && canSend && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => void bulk.mutateAsync({ ids: selected, action: 'close' }).then(() => setSelected([]))}>
                  {t('bulk.close')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void bulk.mutateAsync({ ids: selected, action: 'assign_me' }).then(() => setSelected([]))}>
                  {t('bulk.assign')}
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-border px-2 py-2">
            {VIEWS.filter((item) => !(aiOff && item === 'ai_handled')).map((item) => (
              <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} onClick={() => setView(item)}>
                {t(`views.${item}`)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} className="ps-8" />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" aria-label={t('filters.button')}>
                  <ListFilter />
                  {t('filters.button')}
                  {activeFilters > 0 ? <Badge tone="brand">{activeFilters}</Badge> : null}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{t('filters.title')}</p>
                  {activeFilters > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setChannel(ALL)
                        setAssignee(ALL)
                        setTag(ALL)
                        setStage(ALL)
                        setLanguage(ALL)
                        setSince(ALL)
                        setLocationFilter(ALL)
                      }}
                    >
                      {t('filters.clear')}
                    </Button>
                  )}
                </div>
                <FilterSelect label={t('filters.channel')} value={channel} onChange={setChannel}>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {CHANNELS.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`common:channels.${item}`)}
                    </SelectItem>
                  ))}
                </FilterSelect>
                {session.locations.length > 1 && (
                  <FilterSelect label={t('filters.location')} value={locationFilter} onChange={setLocationFilter}>
                    <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                    {session.locations.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </FilterSelect>
                )}
                <FilterSelect label={t('filters.employee')} value={assignee} onChange={setAssignee}>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {(team.data ?? []).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </FilterSelect>
                <FilterSelect label={t('filters.tag')} value={tag} onChange={setTag}>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {(list.data?.tags ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </FilterSelect>
                <FilterSelect label={t('filters.stage')} value={stage} onChange={setStage}>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {(list.data?.stages ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </FilterSelect>
                <FilterSelect label={t('filters.language')} value={language} onChange={setLanguage}>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {(list.data?.languages ?? []).map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </FilterSelect>
                <FilterSelect label={t('filters.date')} value={since} onChange={setSince}>
                  {DATES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {t(`filters.dates.${item}`)}
                    </SelectItem>
                  ))}
                </FilterSelect>
              </PopoverContent>
            </Popover>
          </div>
          {down.length > 0 && (
            <Banner
              className="mx-3 mb-2"
              severity="danger"
              title={t('channelDown', { channel: t(`common:channels.${down[0]!.kind}`) })}
              action={
                <Link className="text-sm font-medium underline" to="/app/connections">
                  {t('channelDownFix')}
                </Link>
              }
            />
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {list.isPending &&
              Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="mx-3 my-2 h-16" />
              ))}
            {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
            {list.data && items.length === 0 && (
              <EmptyState
                icon={InboxIcon}
                title={list.data.total === 0 ? t('empty.title') : t('empty.none')}
                description={list.data.total === 0 ? t('empty.body', { channels: channels || t('common:channels.webchat') }) : t('empty.none')}
                action={
                  list.data.total === 0 && canSend ? (
                    <Button
                      onClick={() =>
                        void test.mutateAsync().then((res) => navigate({ to: '/app/inbox/$conversationId', params: { conversationId: res.conversationId } }))
                      }
                    >
                      {t('empty.test')}
                    </Button>
                  ) : undefined
                }
              />
            )}
            {items.map((item) => {
              const active = item.id === conversationId
              return (
                <div key={item.id} className={active ? 'bg-surface-2' : 'hover:bg-surface-2'}>
                  <div className="flex items-start gap-2 px-3 py-2">
                    {canSend && (
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={(on) => setSelected((cur) => (on ? [...cur, item.id] : cur.filter((id) => id !== item.id)))}
                        aria-label={item.contactName}
                      />
                    )}
                    <Link to="/app/inbox/$conversationId" params={{ conversationId: item.id }} className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Avatar name={item.contactName} className="size-8" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.contactName}</p>
                            <ChannelIcon channel={item.channel} />
                            {item.unreadCount > 0 && <Badge tone="brand">{item.unreadCount}</Badge>}
                            {!aiOff && item.aiControl === 'ai' && <AIBadge />}
                            {item.aiControl === 'human' && <Badge>{t('humanOnly')}</Badge>}
                          </div>
                          <p className="truncate text-xs text-fg-muted">{item.lastMessagePreview}</p>
                          {item.assignedName ? <p className="truncate text-[11px] text-fg-muted">{item.assignedName}</p> : null}
                        </div>
                        <div className="shrink-0 text-end">
                          <time className="text-[11px] text-fg-muted">{formatRelative(item.lastMessageAt, now(), ctx)}</time>
                          {item.waitMinutes > 0 && item.lastDirection === 'inbound' && (
                            <p className="text-[11px] text-attention">{t('waiting', { minutes: item.waitMinutes })}</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="border-t border-border px-3 py-1 text-[11px] text-fg-muted">{t('shortcuts')}</p>
        </Pane>
      }
      thread={
        conversationId && thread.data ? (
          <Pane>
            <header className="flex items-center gap-2 border-b border-border px-4 py-2">
              <Link to="/app/inbox" className="text-sm text-brand md:hidden">
                {t('title')}
              </Link>
              <Avatar name={`${thread.data.contact.firstName} ${thread.data.contact.lastName}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {thread.data.contact.firstName} {thread.data.contact.lastName}
                </p>
                <p className="text-xs text-fg-muted">
                  {t(`common:channels.${thread.data.conversation.channel}`)}
                  {thread.data.conversation.channel === 'whatsapp' &&
                    (thread.data.window.open ? ` · ${t('windowOpen')}` : ` · ${t('windowClosed')}`)}
                </p>
              </div>
              {canSend && (
                <Select
                  value={thread.data.conversation.status}
                  onValueChange={(status) => void patch.mutate({ status: status as typeof thread.data.conversation.status })}
                >
                  <SelectTrigger className="h-8 w-36" aria-label={t('actions.close')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEWS.slice(0, 1).length > 0 && (
                      <>
                        <SelectItem value="open">{t('views.all')}</SelectItem>
                        <SelectItem value="snoozed">{t('views.snoozed')}</SelectItem>
                        <SelectItem value="closed">{t('views.closed')}</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              )}
              {canSend && !aiOff && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void patch.mutateAsync({ aiControl: thread.data.conversation.aiControl === 'ai' ? 'human' : 'ai' }).then(() =>
                      toast.success(thread.data.conversation.aiControl === 'ai' ? t('ai.taken') : t('ai.handed')),
                    )
                  }
                >
                  {thread.data.conversation.aiControl === 'ai' ? t('ai.takeOver') : t('ai.handBack')}
                </Button>
              )}
              {canSend && (
                <ThreadMenu
                  thread={thread.data}
                  meId={session.user.id}
                  members={team.data ?? []}
                  onPatch={(body) => void patch.mutateAsync(body).then(() => toast.success(t('updated')))}
                  onAddTask={() => setTaskOpen(true)}
                />
              )}
            </header>
            {thread.data.othersViewing[0] && (
              <p className="border-b border-attention/30 bg-attention/10 px-4 py-1 text-xs text-attention">
                {t('collision', { name: thread.data.othersViewing[0] })}
              </p>
            )}
            <div className="min-h-0 flex-1 overflow-y-auto py-3" aria-live="polite">
              {thread.data.conversation.kind === 'call' && (
                <div className="mx-4 mb-3 rounded-md border border-border p-3 text-sm">
                  <p className="font-medium">{t('call.title')}</p>
                  <Button size="sm" variant="outline" className="mt-2">
                    {t('call.play')}
                  </Button>
                  <p className="mt-1 text-xs text-fg-muted">{t('call.logged')}</p>
                </div>
              )}
              {thread.data.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  time={formatRelative(message.createdAt, now(), ctx)}
                  showAi={!aiOff}
                  onRate={canSend && !aiOff ? (rating) => void rate.mutate({ id: message.id, rating }) : undefined}
                />
              ))}
              {!aiOff && thread.data.conversation.draft && (
                <AISurface className="mx-4 my-2">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <AIBadge name={thread.data.conversation.draft.employeeName} />
                    <ConfidenceMeter level={thread.data.conversation.draft.confidence} />
                    <WhyPopover
                      sources={thread.data.conversation.draft.why.sources}
                      rules={thread.data.conversation.draft.why.rules}
                      tools={thread.data.conversation.draft.why.tools}
                    />
                  </div>
                  <p className="text-sm">{thread.data.conversation.draft.body}</p>
                  {canSend && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="ai" onClick={() => void acceptDraft.mutateAsync({ body: thread.data.conversation.draft!.body }).then(() => toast.success(t('sent')))}>
                        {t('ai.accept')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => document.getElementById('composer')?.focus()}>
                        {t('ai.edit')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void discardDraft.mutateAsync()}>
                        {t('ai.discard')}
                      </Button>
                    </div>
                  )}
                </AISurface>
              )}
            </div>
            <Composer conversationId={conversationId} thread={thread.data} canSend={canSend} />
          </Pane>
        ) : conversationId && thread.isPending ? (
          <div className="p-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="mt-6 h-40 w-full" />
          </div>
        ) : conversationId && thread.isError ? (
          <ErrorState onRetry={() => void thread.refetch()} />
        ) : (
          <EmptyState icon={InboxIcon} title={t('select')} description={t('selectBody')} />
        )
      }
      panel={thread.data ? <ContactSidePanel thread={thread.data} /> : <div />}
    />
    {thread.data && (
      <TaskFormDialog
        open={taskOpen}
        onOpenChange={setTaskOpen}
        preset={{
          linkedKind: 'conversation',
          linkedId: thread.data.conversation.id,
          label: `${thread.data.contact.firstName} ${thread.data.contact.lastName}`,
        }}
      />
    )}
    </>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-fg-muted">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-full" aria-label={label}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}

function ThreadMenu({
  thread,
  meId,
  members,
  onPatch,
  onAddTask,
}: {
  thread: ConversationThread
  meId: string
  members: { id: string; name: string }[]
  onPatch: (body: {
    status?: ConversationThread['conversation']['status']
    assignedUserId?: string | null
    snoozedUntil?: string | null
  }) => void
  onAddTask: () => void
}) {
  const { t } = useTranslation('inbox')
  const closed = thread.conversation.status === 'closed'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton label={t('actions.more')} variant="ghost">
          <MoreHorizontal />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onPatch({ assignedUserId: meId })}>{t('actions.assignMe')}</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>{t('actions.assign')}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {members.map((member) => (
              <DropdownMenuItem key={member.id} onSelect={() => onPatch({ assignedUserId: member.id })}>
                {member.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onSelect={() => onPatch({ status: 'snoozed', snoozedUntil: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() })}>
          {t('actions.snooze')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onPatch({ status: closed ? 'open' : 'closed' })}>{closed ? t('actions.reopen') : t('actions.close')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/bookings">{t('actions.booking')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/payments">{t('actions.payment')}</Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            window.setTimeout(onAddTask, 0)
          }}
        >
          {t('actions.task')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/app/contacts/$contactId" params={{ contactId: thread.contact.id }}>
            {t('actions.contact')}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
