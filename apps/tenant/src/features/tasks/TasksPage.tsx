import { useNavigate } from '@tanstack/react-router'
import { ListFilter, SquareCheck } from 'lucide-react'
import { useState } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { canSeeArea, TaskLinkedKindSchema, type Task } from '@deskhand/schemas'
import {
  Badge,
  Button,
  CreatedByChip,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  WhyPopover,
  usePermission,
} from '@deskhand/ui'
import { usePatchTask, useTask, useTasks } from '../../api/booking'
import { useTeamOptions } from '../../api/crm'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'
import { TaskDetailDialog } from './TaskDetailDialog'
import { TaskFormDialog } from './TaskFormDialog'

const VIEWS = ['mine', 'team', 'today', 'overdue', 'done'] as const
const ALL = 'all'
const KINDS = TaskLinkedKindSchema.options

export function TasksPage({ create, taskId }: { create?: boolean; taskId?: string }) {
  const { t } = useTranslation(['tasks', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const { locationId } = useSelectedLocation(session)
  const ctx = useLocaleContext(session)
  const access = usePermission('calendar.edit')
  const team = useTeamOptions()
  const [view, setView] = useState<(typeof VIEWS)[number]>('mine')
  const [open, setOpen] = useState(Boolean(create))
  const [selectedId, setSelectedId] = useState<string | null>(taskId ?? null)
  const [editing, setEditing] = useState(false)
  const [q, setQ] = useState('')
  const [linkedKind, setLinkedKind] = useState(ALL)
  const [createdBy, setCreatedBy] = useState(ALL)
  const [assignedUserId, setAssignedUserId] = useState(ALL)
  const list = useTasks(view, locationId, {
    q: q.trim() || undefined,
    linkedKind: linkedKind === ALL ? undefined : linkedKind,
    createdBy: createdBy === ALL ? undefined : createdBy,
    assignedUserId: assignedUserId === ALL ? undefined : assignedUserId,
  })
  const fetched = useTask(selectedId)
  const selected: Task | null = list.data?.items.find((item) => item.id === selectedId) ?? fetched.data ?? null
  const patch = usePatchTask()
  const aiOff = session.account.aiMode === 'manual' || session.account.aiMode === 'off'
  const filterCount = [linkedKind, createdBy, assignedUserId].filter((value) => value !== ALL).length

  const clearSearch = () => {
    if (create || taskId) void navigate({ to: '/app/tasks', search: {} })
  }

  if (!canSeeArea(session.membership.role, 'tasks')) {
    return (
      <PageContainer>
        <PageHeader title={t('title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        action={
          access.allowed ? (
            <Button
              onClick={() => {
                setSelectedId(null)
                setEditing(false)
                setOpen(true)
              }}
            >
              {t('create')}
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {VIEWS.map((item) => (
          <Button key={item} size="sm" variant={view === item ? 'secondary' : 'ghost'} onClick={() => setView(item)}>
            {t(`views.${item}`)}
          </Button>
        ))}
        <div className="relative min-w-48 flex-1">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
              <ListFilter className="size-4" />
              {t('filters.button')}
              {filterCount > 0 ? <Badge>{filterCount}</Badge> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3 p-3">
            <div>
              <Label>{t('filters.kind')}</Label>
              <Select value={linkedKind} onValueChange={setLinkedKind}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`linked.kinds.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filters.createdBy')}</Label>
              <Select value={createdBy} onValueChange={setCreatedBy}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  <SelectItem value="person">{t('filters.person')}</SelectItem>
                  <SelectItem value="ai">{t('filters.ai')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('filters.assignee')}</Label>
              <Select value={assignedUserId} onValueChange={setAssignedUserId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
                  {(team.data ?? []).map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      {list.isPending && <Skeleton className="h-40" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data && list.data.items.length === 0 && (
        <EmptyState icon={SquareCheck} title={t('empty.title')} description={t('empty.body')} />
      )}
      <ul className="space-y-2">
        {list.data?.items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
            <button type="button" className="min-w-0 flex-1 text-start" onClick={() => setSelectedId(item.id)}>
              <p className="font-medium">{item.title}</p>
              <p className="text-xs text-fg-muted">
                {t('due', { when: formatDateTime(item.dueAt, ctx) })}
                {item.linkedKind ? ` · ${t(`linked.kinds.${item.linkedKind}`)}` : ''}
                {item.contactName ? ` · ${item.contactName}` : ''}
              </p>
              {item.createdBy.kind === 'ai_employee' && !aiOff && (
                <span className="mt-1 inline-flex items-center gap-1">
                  <CreatedByChip kind="ai_employee" />
                  <WhyPopover sources={['Handoff']} rules={[t('aiWhy')]} tools={[]} />
                </span>
              )}
            </button>
            <Badge>{t(`common:status.priority.${item.priority}`)}</Badge>
            {access.allowed && (
              <Button size="sm" variant="outline" onClick={() => void patch.mutate({ id: item.id, done: !item.done })}>
                {item.done ? t('reopen') : t('complete')}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <TaskFormDialog
        open={open}
        task={editing ? selected : null}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setEditing(false)
            clearSearch()
          }
        }}
      />
      <TaskDetailDialog
        task={open ? null : selected}
        onOpenChange={(next) => {
          if (!next) {
            setSelectedId(null)
            clearSearch()
          }
        }}
        onEdit={() => {
          setEditing(true)
          setOpen(true)
        }}
      />
    </PageContainer>
  )
}
