import { Search, SquareKanban } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea, type Opportunity, type PipelineStage } from '@deskhand/schemas'
import {
  AIBadge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  KanbanBoard,
  KanbanCard,
  KanbanColumn,
  NoPermissionState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useMoveOpportunity, usePipeline } from '../../api/booking'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'

export function PipelinePage() {
  const { t } = useTranslation(['pipeline', 'common'])
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const ctx = { ...useLocaleContext(session), language: document.documentElement.lang || 'en' }
  const access = usePermission('pipeline.edit')
  const [q, setQ] = useState('')
  const [dragging, setDragging] = useState<Opportunity | null>(null)
  const [reasonFor, setReasonFor] = useState<{ item: Opportunity; stage: PipelineStage } | null>(null)
  const [reason, setReason] = useState('')
  const board = usePipeline(locationId, q.trim())
  const searching = q.trim().length > 0
  const move = useMoveOpportunity()

  const drop = (stage: PipelineStage) => {
    if (!dragging || !access.allowed) return
    if (stage.won || stage.lost) {
      setReasonFor({ item: dragging, stage })
      setDragging(null)
      return
    }
    void move.mutateAsync({ id: dragging.id, stageId: stage.id }).then(() => toast.success(t('move', { stage: stage.name })))
    setDragging(null)
  }

  const ageDays = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))

  const grouped = useMemo(() => {
    const map = new Map<string, Opportunity[]>()
    for (const stage of board.data?.stages ?? []) map.set(stage.id, [])
    for (const item of board.data?.items ?? []) map.get(item.stageId)?.push(item)
    return map
  }, [board.data])

  if (!canSeeArea(session.membership.role, 'sales')) {
    return <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative mb-4 max-w-sm">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
        <Input
          className="ps-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('search')}
          placeholder={t('search')}
        />
      </div>
      {board.isPending && !board.data && <Skeleton className="h-64" />}
      {board.isError && <ErrorState onRetry={() => void board.refetch()} />}
      {board.data && board.data.items.length === 0 && (
        <EmptyState
          icon={SquareKanban}
          title={searching ? t('noResults.title') : t('empty.title')}
          description={searching ? t('noResults.body') : t('empty.body')}
        />
      )}
      {board.data && board.data.items.length > 0 && (
        <KanbanBoard>
          {board.data.stages.map((stage) => {
            const items = grouped.get(stage.id) ?? []
            const total = items.reduce((sum, item) => sum + (item.value ?? 0), 0)
            const stale = items.some((item) => ageDays(item.enteredStageAt) > stage.staleAfterDays)
            return (
              <KanbanColumn
                key={stage.id}
                title={stage.name}
                meta={`${items.length} · ${formatMoney(total, ctx.currency, ctx.locale)}`}
                hint={stale ? t('stale', { days: stage.staleAfterDays }) : undefined}
                onDrop={() => drop(stage)}
              >
                {items.map((item) => (
                  <KanbanCard key={item.id} onDragStart={access.allowed ? () => setDragging(item) : undefined}>
                    <p className="font-medium">{item.contactName}</p>
                    <p className="text-xs text-fg-muted">
                      {item.value != null ? formatMoney(item.value, ctx.currency, ctx.locale) : '—'} · {t('age', { days: ageDays(item.enteredStageAt) })}
                    </p>
                    {item.nextTask && <p className="mt-1 text-xs">{t('nextTask', { task: item.nextTask })}</p>}
                    {item.aiWorking && <AIBadge name={t('ai')} />}
                  </KanbanCard>
                ))}
              </KanbanColumn>
            )
          })}
        </KanbanBoard>
      )}
      <Dialog open={Boolean(reasonFor)} onOpenChange={() => setReasonFor(null)}>
        <DialogContent>
          <DialogTitle>{t('reasonNeeded', { outcome: reasonFor?.stage.won ? t('won') : t('lost') })}</DialogTitle>
          <Select value={reason} onValueChange={setReason}>
            <SelectTrigger className="mt-3" aria-label={t('reason')}>
              <SelectValue placeholder={t('reason')} />
            </SelectTrigger>
            <SelectContent>
              {(reasonFor?.stage.won ? board.data?.wonReasons : board.data?.lostReasons)?.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="mt-4"
            disabled={!reason || !reasonFor}
            onClick={() => {
              if (!reasonFor) return
              void move.mutateAsync({ id: reasonFor.item.id, stageId: reasonFor.stage.id, reason }).then(() => {
                toast.success(t('move', { stage: reasonFor.stage.name }))
                setReasonFor(null)
                setReason('')
              })
            }}
          >
            {t('confirm')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
