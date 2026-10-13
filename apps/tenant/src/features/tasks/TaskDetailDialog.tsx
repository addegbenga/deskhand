import { Link } from '@tanstack/react-router'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import type { Task } from '@deskhand/schemas'
import {
  Badge,
  Button,
  CreatedByChip,
  Dialog,
  DialogContent,
  DialogTitle,
  WhyPopover,
  usePermission,
} from '@deskhand/ui'
import { usePatchTask } from '../../api/booking'
import { useTeamOptions } from '../../api/crm'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'

const DAY = 24 * 60 * 60 * 1000

export function TaskDetailDialog({
  task,
  onOpenChange,
  onEdit,
}: {
  task: Task | null
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}) {
  const { t } = useTranslation(['tasks', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const access = usePermission('calendar.edit')
  const team = useTeamOptions()
  const patch = usePatchTask()
  const aiOff = session.account.aiMode === 'manual' || session.account.aiMode === 'off'
  const assignee = (team.data ?? []).find((member) => member.id === task?.assignedUserId)

  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {task && (
          <>
            <DialogTitle>{task.title}</DialogTitle>
            <div className="mt-3 grid gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{task.done ? t('statusDone') : t('statusOpen')}</Badge>
                <Badge>{t(`common:status.priority.${task.priority}`)}</Badge>
                {task.createdBy.kind === 'ai_employee' && !aiOff ? (
                  <span className="inline-flex items-center gap-1">
                    <CreatedByChip kind="ai_employee" />
                    <WhyPopover sources={['Handoff']} rules={[t('aiWhy')]} tools={[]} />
                  </span>
                ) : (
                  <CreatedByChip kind={task.createdBy.kind} />
                )}
              </div>
              <p className="text-fg-muted">{t('due', { when: formatDateTime(task.dueAt, ctx) })}</p>
              <p>
                <span className="text-fg-muted">{t('assigneeLabel')}: </span>
                {assignee?.name ?? task.createdBy.name ?? '—'}
              </p>
              <p>
                <span className="text-fg-muted">{t('created')}: </span>
                {formatDateTime(task.createdAt, ctx)}
                {task.createdBy.name ? ` · ${task.createdBy.name}` : ''}
              </p>
              {task.linkedKind && (
                <div>
                  <p className="text-fg-muted">
                    {t('linkedKind')}: {t(`linked.kinds.${task.linkedKind}`)}
                    {task.contactName ? ` · ${task.contactName}` : ''}
                  </p>
                  {task.linkedKind === 'contact' && task.linkedId && (
                    <Link className="text-brand" to="/app/contacts/$contactId" params={{ contactId: task.linkedId }}>
                      {t('openLink')}
                    </Link>
                  )}
                  {task.linkedKind === 'conversation' && task.linkedId && (
                    <Link className="text-brand" to="/app/inbox/$conversationId" params={{ conversationId: task.linkedId }}>
                      {t('openLink')}
                    </Link>
                  )}
                  {task.linkedKind === 'opportunity' && (
                    <Link className="text-brand" to="/app/pipeline">
                      {t('openLink')}
                    </Link>
                  )}
                  {task.linkedKind === 'booking' && (
                    <Link className="text-brand" to="/app/bookings">
                      {t('openLink')}
                    </Link>
                  )}
                </div>
              )}
              <div>
                <p className="text-fg-muted">{t('notesLabel')}</p>
                <p className="mt-1 whitespace-pre-wrap">{task.notes.trim() ? task.notes : t('notesEmpty')}</p>
              </div>
              {access.allowed && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void patch.mutate({ id: task.id, done: !task.done })}>
                    {task.done ? t('reopen') : t('complete')}
                  </Button>
                  {!task.done && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void patch.mutate({ id: task.id, dueAt: new Date(new Date(task.dueAt).getTime() + DAY).toISOString() })
                      }
                    >
                      {t('snooze')}
                    </Button>
                  )}
                  {onEdit && (
                    <Button size="sm" onClick={onEdit}>
                      {t('edit')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
