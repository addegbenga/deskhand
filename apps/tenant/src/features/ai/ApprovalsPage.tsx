import { Link } from '@tanstack/react-router'
import { ListChecks } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { ApprovalKindSchema, canSeeArea, type Approval, type ApprovalKind } from '@deskhand/schemas'
import {
  AISurface,
  AutonomyChip,
  Button,
  Checkbox,
  ConfidenceMeter,
  EmptyState,
  ErrorState,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Skeleton,
  Textarea,
  WhyPopover,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useApprove, useApprovals, useBulkApprovals, useRejectApproval, useSnoozeApproval } from '../../api/ai'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'

const STATUSES = ['pending', 'snoozed', 'approved', 'rejected'] as const
const KINDS = ApprovalKindSchema.options

function sourceTo(item: Approval) {
  if (item.kind === 'post') return { to: '/app/marketing/planner' as const, params: undefined }
  if (item.kind === 'review_reply') return { to: '/app/reputation' as const, params: undefined }
  if (item.kind === 'bulk') return { to: '/app/marketing/campaigns' as const, params: undefined }
  if (item.conversationId) return { to: '/app/inbox/$conversationId' as const, params: { conversationId: item.conversationId } }
  return { to: '/app/inbox' as const, params: undefined }
}

export function ApprovalsPage() {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const access = usePermission('ai.approve')
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('pending')
  const [kind, setKind] = useState<ApprovalKind | 'all'>('all')
  const list = useApprovals(status)
  const approve = useApprove()
  const reject = useRejectApproval()
  const snooze = useSnoozeApproval()
  const bulk = useBulkApprovals()
  const [selected, setSelected] = useState<string[]>([])
  const [editId, setEditId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [reasons, setReasons] = useState<Record<string, string>>({})

  if (!canSeeArea(session.membership.role, 'ai') || access.scope === 'none') {
    return (
      <PageContainer>
        <PageHeader title={t('approvalsPage.title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  const items = useMemo(() => {
    const rows = list.data?.items ?? []
    return kind === 'all' ? rows : rows.filter((item) => item.kind === kind)
  }, [kind, list.data?.items])

  const waitMin = (createdAt: string) => Math.max(0, Math.round((Date.now() - new Date(createdAt).getTime()) / 60000))
  const typeIds = items.map((item) => item.id)
  const busy = approve.isPending || reject.isPending || snooze.isPending || bulk.isPending

  return (
    <PageContainer>
      <PageHeader
        title={t('approvalsPage.title')}
        description={t('approvalsPage.subtitle')}
        action={
          access.allowed && selected.length > 0 && status === 'pending' ? (
            <Button
              disabled={busy}
              onClick={() =>
                void bulk.mutateAsync({ ids: selected, action: 'approve' }).then(() => {
                  setSelected([])
                  toast.success(t('approvalsPage.bulk'))
                })
              }
            >
              {t('approvalsPage.bulk')}
            </Button>
          ) : (
            <Button asChild variant="outline">
              <Link to="/app/ai/activity">{t('activityPage.title')}</Link>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((value) => (
          <Button key={value} size="sm" variant={status === value ? 'secondary' : 'ghost'} onClick={() => { setStatus(value); setSelected([]) }}>
            {t(`approvalsPage.statuses.${value}`)}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant={kind === 'all' ? 'secondary' : 'ghost'} onClick={() => setKind('all')}>
          {t('approvalsPage.filterAll')}
        </Button>
        {KINDS.map((value) => (
          <Button key={value} size="sm" variant={kind === value ? 'secondary' : 'ghost'} onClick={() => setKind(value)}>
            {t(`approvalsPage.kinds.${value}`)}
          </Button>
        ))}
      </div>
      {access.allowed && status === 'pending' && kind !== 'all' && items.length > 0 && (
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              void bulk.mutateAsync({ ids: typeIds, action: 'approve' }).then(() => {
                toast.success(t('approvalsPage.approveType', { kind: t(`approvalsPage.kinds.${kind}`) }))
              })
            }
          >
            {t('approvalsPage.approveType', { kind: t(`approvalsPage.kinds.${kind}`) })}
          </Button>
        </div>
      )}

      {list.isPending && <Skeleton className="mt-6 h-40" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && (
        <EmptyState icon={ListChecks} title={t('approvalsPage.empty.title')} description={t('approvalsPage.empty.body')} />
      )}
      <ul className="mt-6 space-y-3">
        {items.map((item) => {
          const source = sourceTo(item)
          return (
            <li key={item.id} className="rounded-lg border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                {access.allowed && status === 'pending' && (
                  <Checkbox
                    checked={selected.includes(item.id)}
                    onCheckedChange={(on) => setSelected((cur) => (on ? [...cur, item.id] : cur.filter((id) => id !== item.id)))}
                    aria-label={item.contactName}
                  />
                )}
                <p className="font-medium">{t(`approvalsPage.kinds.${item.kind}`)}</p>
                <ConfidenceMeter level={item.confidence} />
                <AutonomyChip level="approve" />
                {status === 'pending' && (
                  <span className="text-xs text-fg-muted">{t('approvalsPage.waiting', { minutes: waitMin(item.createdAt) })}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                {item.contactName}
                {item.employeeName ? ` · ${item.employeeName}` : ''}
                {item.channel ? ` · ${t(`common:channels.${item.channel}`)}` : ''}
                {` · ${formatDateTime(item.createdAt, ctx)}`}
              </p>
              <p className="mt-2 text-sm">{t(`approvalsPage.origin.${item.kind}`, { employee: item.employeeName })}</p>
              <AISurface className="mt-3">
                {editId === item.id ? (
                  <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
                ) : (
                  <p className="text-sm">{item.draft}</p>
                )}
              </AISurface>
              <p className="mt-2 text-xs text-fg-muted">{item.reason}</p>
              {item.rejectReason && (
                <p className="mt-1 text-xs text-danger">
                  {t('approvalsPage.reject')}: {item.rejectReason}
                </p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <WhyPopover sources={[item.reason]} rules={[t(`approvalsPage.origin.${item.kind}`, { employee: item.employeeName })]} tools={[item.kind]} />
                <Button asChild size="sm" variant="link">
                  {source.params ? (
                    <Link to={source.to} params={source.params}>
                      {t('approvalsPage.openSource')}
                    </Link>
                  ) : (
                    <Link to={source.to}>{t('approvalsPage.openSource')}</Link>
                  )}
                </Button>
              </div>
              {access.allowed && status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void approve.mutateAsync({ id: item.id, body: editId === item.id ? draft : undefined }).then(() => {
                          toast.success(t('approvalsPage.approve'))
                          setEditId(null)
                        })
                      }
                    >
                      {editId === item.id ? t('approvalsPage.editApprove') : t('approvalsPage.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditId(item.id)
                        setDraft(item.draft)
                      }}
                    >
                      {t('approvalsPage.edit')}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => void snooze.mutateAsync(item.id)}>
                      {t('approvalsPage.snooze')}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger-outline"
                      disabled={busy}
                      onClick={() => {
                        const why = reasons[item.id]?.trim()
                        if (!why) {
                          toast.error(t('approvalsPage.reasonRequired'))
                          return
                        }
                        void reject.mutateAsync({ id: item.id, reason: why })
                      }}
                    >
                      {t('approvalsPage.reject')}
                    </Button>
                  </div>
                  <Textarea
                    placeholder={t('approvalsPage.reason')}
                    value={reasons[item.id] ?? ''}
                    onChange={(event) => setReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </PageContainer>
  )
}
