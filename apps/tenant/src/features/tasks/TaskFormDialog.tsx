import { useEffect, useMemo, useState } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { TaskLinkedKindSchema, type Task, type TaskLinkedKind } from '@deskhand/schemas'
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
  usePermission,
} from '@deskhand/ui'
import { isApiError } from '../../api/client'
import { useCalendar, useCreateTask, usePatchTask, usePipeline } from '../../api/booking'
import { useContacts, useConversations, useTeamOptions } from '../../api/crm'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

const NONE = 'none'
const KINDS = TaskLinkedKindSchema.options
const DAY = 24 * 60 * 60 * 1000

export type TaskFormPreset = {
  linkedKind?: TaskLinkedKind | null
  linkedId?: string | null
  label?: string
}

function toLocalInput(iso: string) {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function withCurrent(options: { value: string; label: string }[], value: string | null, fallback: string) {
  if (!value || options.some((option) => option.value === value)) return options
  return [{ value, label: fallback }, ...options]
}

export function TaskFormDialog({
  open,
  onOpenChange,
  preset,
  task,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  preset?: TaskFormPreset
  task?: Task | null
}) {
  const { t } = useTranslation(['tasks', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = useLocaleContext(session)
  const access = usePermission('calendar.edit')
  const create = useCreateTask()
  const patch = usePatchTask()
  const team = useTeamOptions()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [dueLocal, setDueLocal] = useState('')
  const [assignedUserId, setAssignedUserId] = useState(session.user.id)
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal')
  const [linkedKind, setLinkedKind] = useState<TaskLinkedKind | null>(null)
  const [linkedId, setLinkedId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    if (task) {
      setTitle(task.title)
      setNotes(task.notes)
      setDueLocal(toLocalInput(task.dueAt))
      setAssignedUserId(task.assignedUserId)
      setPriority(task.priority)
      setLinkedKind(task.linkedKind)
      setLinkedId(task.linkedId)
      return
    }
    const due = new Date()
    due.setHours(due.getHours() + 4)
    setTitle('')
    setNotes('')
    setDueLocal(toLocalInput(due.toISOString()))
    setAssignedUserId(session.user.id)
    setPriority('normal')
    setLinkedKind(preset?.linkedKind ?? null)
    setLinkedId(preset?.linkedId ?? null)
  }, [open, preset?.linkedKind, preset?.linkedId, session.user.id, task])

  const contacts = useContacts({ q: '', locationId, enabled: open && linkedKind === 'contact' })
  const conversations = useConversations({ view: 'all', q: '', locationId, enabled: open && linkedKind === 'conversation' })
  const pipeline = usePipeline(locationId, '', open && linkedKind === 'opportunity')
  const from = new Date(Date.now() - 14 * DAY).toISOString()
  const to = new Date(Date.now() + 28 * DAY).toISOString()
  const calendar = useCalendar(locationId, from, to, open && linkedKind === 'booking')

  const recordOptions = useMemo(() => {
    if (linkedKind === 'contact') {
      return (contacts.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.firstName} ${item.lastName}`,
      }))
    }
    if (linkedKind === 'conversation') {
      return (conversations.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.contactName} · ${item.lastMessagePreview}`,
      }))
    }
    if (linkedKind === 'opportunity') {
      return (pipeline.data?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.contactName} · ${item.stageName}`,
      }))
    }
    if (linkedKind === 'booking') {
      return (calendar.data?.appointments ?? []).slice(0, 40).map((item) => ({
        value: item.id,
        label: `${item.contactName} · ${item.service} · ${formatDateTime(item.startsAt, ctx)}`,
      }))
    }
    return []
  }, [calendar.data, contacts.data, conversations.data, ctx, linkedKind, pipeline.data])

  const pending = create.isPending || patch.isPending
  const canSave = Boolean(title.trim() && dueLocal && access.allowed && !pending)

  const save = () => {
    if (!canSave) return
    const dueAt = new Date(dueLocal).toISOString()
    const link = linkedKind && linkedId ? { linkedKind, linkedId } : { linkedKind: null, linkedId: null }
    const fail = (error: unknown) => toast.error(isApiError(error) ? error.message : t('common:actions.retry'))
    if (task) {
      void patch
        .mutateAsync({
          id: task.id,
          title: title.trim(),
          notes: notes.trim(),
          dueAt,
          assignedUserId,
          priority,
        })
        .then(() => {
          toast.success(t('saveEdit'))
          onOpenChange(false)
        })
        .catch(fail)
      return
    }
    void create
      .mutateAsync({
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueAt,
        assignedUserId,
        priority,
        locationId: locationId ?? undefined,
        ...link,
      })
      .then(() => {
        toast.success(t('save'))
        onOpenChange(false)
      })
      .catch(fail)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogTitle>{task ? t('edit') : t('create')}</DialogTitle>
        <div className="mt-3 grid gap-3">
          <div>
            <Label htmlFor="task-title">{t('titleLabel')}</Label>
            <Input id="task-title" className="mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="task-due">{t('dueLabel')}</Label>
            <Input id="task-due" type="datetime-local" className="mt-1" value={dueLocal} onChange={(e) => setDueLocal(e.target.value)} />
          </div>
          <div>
            <Label>{t('assigneeLabel')}</Label>
            <Combobox
              modal
              className="mt-1"
              value={assignedUserId}
              onChange={setAssignedUserId}
              options={(team.data ?? []).map((member) => ({ value: member.id, label: member.name }))}
              placeholder={t('assigneeLabel')}
              searchPlaceholder={t('search')}
              emptyText={t('linked.empty')}
            />
          </div>
          <div>
            <Label>{t('priorityLabel')}</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as typeof priority)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['low', 'normal', 'high'] as const).map((item) => (
                  <SelectItem key={item} value={item}>
                    {t(`common:status.priority.${item}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!task && (
            <>
              <div>
                <Label>{t('linkedKind')}</Label>
                <Select
                  value={linkedKind ?? NONE}
                  onValueChange={(value) => {
                    setLinkedKind(value === NONE ? null : (value as TaskLinkedKind))
                    setLinkedId(null)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('linkedNone')}</SelectItem>
                    {KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {t(`linked.kinds.${kind}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {linkedKind && (
                <div>
                  <Label>{t('linkedRecord')}</Label>
                  <Combobox
                    modal
                    className="mt-1"
                    value={linkedId}
                    onChange={setLinkedId}
                    options={withCurrent(recordOptions, linkedId, preset?.label ?? t('linkedRecord'))}
                    placeholder={t('linked.search')}
                    searchPlaceholder={t('linked.search')}
                    emptyText={t('linked.empty')}
                  />
                  {!linkedId && <p className="mt-1 text-xs text-fg-muted">{t('needRecord')}</p>}
                </div>
              )}
            </>
          )}
          <div>
            <Label htmlFor="task-notes">{t('notesLabel')}</Label>
            <Textarea id="task-notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <Button type="button" disabled={!canSave} onClick={save}>
            {task ? t('saveEdit') : t('save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
