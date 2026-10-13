import { Link, Outlet, getRouteApi, useNavigate } from '@tanstack/react-router'
import { BookOpen } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import {
  KnowledgeCollectionIdSchema,
  KnowledgeStatusSchema,
  canSeeArea,
  type KnowledgeCollectionId,
  type KnowledgeItem,
  type KnowledgeStatus,
} from '@deskhand/schemas'
import {
  Button,
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
  Skeleton,
  StatusChip,
  Textarea,
  WhyPopover,
  toast,
  usePermission,
} from '@deskhand/ui'

import {
  useAddKnowledge,
  useAddTraining,
  useImportKnowledge,
  useKnowledge,
  useKnowledgePreview,
  usePatchKnowledge,
  useTraining,
  useVerifyKnowledge,
} from '../../api/ai'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'
import { GrowTabs } from '../grow/GrowTabs'

const collectionRoute = getRouteApi('/_shell/app/ai/knowledge/$collection')

const COLLECTIONS = KnowledgeCollectionIdSchema.options

export function KnowledgeLayout() {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const training = useTraining()
  if (!canSeeArea(session.membership.role, 'ai')) {
    return (
      <PageContainer>
        <PageHeader title={t('knowledgePage.title')} />
        <NoPermissionState roleLabel={t('common:roles.admin')} />
      </PageContainer>
    )
  }
  const items = [
    { to: '/app/ai/knowledge/overview', label: t('knowledgePage.gaps') },
    { to: '/app/ai/knowledge/training', label: `${t('knowledgePage.training')}${training.data?.length ? ` (${training.data.length})` : ''}` },
    { to: '/app/ai/knowledge/ask', label: t('knowledgePage.ask') },
    ...COLLECTIONS.map((id) => ({ to: `/app/ai/knowledge/${id}`, label: t(`collections.${id}`) })),
  ]
  return (
    <PageContainer>
      <PageHeader title={t('knowledgePage.title')} description={t('knowledgePage.subtitle')} />
      <GrowTabs items={items} />
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContainer>
  )
}

export function KnowledgeOverviewPage() {
  const { t } = useTranslation('ai')
  const list = useKnowledge()
  if (list.isPending) return <Skeleton className="h-40" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {list.data?.collections.map((col) => (
        <Link
          key={col.id}
          to="/app/ai/knowledge/$collection"
          params={{ collection: col.id }}
          className="rounded-md border border-border p-4 hover:bg-surface-2"
        >
          <p className="font-medium">{t(`collections.${col.id}`)}</p>
          <p className="mt-1 text-sm text-fg-muted">{t('knowledgePage.coverage', { percent: col.coverage })}</p>
          {col.missing.map((gap) => (
            <p key={gap} className="mt-1 text-sm text-attention">
              {t('knowledgePage.missing')}: {gap}
            </p>
          ))}
        </Link>
      ))}
    </div>
  )
}

export function KnowledgeAskPage() {
  const { t } = useTranslation(['ai', 'common'])
  const preview = useKnowledgePreview()
  const [question, setQuestion] = useState('How much are knotless braids?')
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-fg-muted">{t('knowledgePage.askHint')}</p>
      <Label htmlFor="ask-q">{t('knowledgePage.ask')}</Label>
      <Textarea id="ask-q" value={question} onChange={(event) => setQuestion(event.target.value)} />
      <Button disabled={question.trim().length < 2 || preview.isPending} onClick={() => void preview.mutateAsync({ question: question.trim() })}>
        {t('knowledgePage.askRun')}
      </Button>
      {preview.data && (
        <div className="rounded-lg border border-border p-4">
          <p className="text-sm">{preview.data.text}</p>
          {preview.data.blocked && <p className="mt-2 text-sm text-attention">{t('knowledgePage.wouldHandoff')}</p>}
          <WhyPopover sources={preview.data.why.sources} rules={preview.data.why.rules} tools={preview.data.why.tools} />
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('knowledgePage.used')}</p>
          {preview.data.items.length === 0 ? (
            <p className="mt-1 text-sm text-fg-muted">{t('knowledgePage.usedNone')}</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {preview.data.items.map((item) => (
                <li key={item.id} className="text-sm">
                  <StatusChip domain="knowledge" value={item.status} /> {item.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function KnowledgeTrainingPage() {
  const { t } = useTranslation('ai')
  const access = usePermission('ai.manage')
  const training = useTraining()
  const addTrain = useAddTraining()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof training.data>>()
    for (const item of training.data ?? []) {
      const list = map.get(item.topic) ?? []
      list.push(item)
      map.set(item.topic, list)
    }
    return [...map.entries()]
  }, [training.data])
  if (training.isPending) return <Skeleton className="h-40" />
  if (training.isError) return <ErrorState onRetry={() => void training.refetch()} />
  if (!training.data?.length) {
    return <EmptyState icon={BookOpen} title={t('knowledgePage.emptyTraining.title')} description={t('knowledgePage.emptyTraining.body')} />
  }
  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">{t('knowledgePage.trainingHint')}</p>
      {grouped.map(([topic, rows]) => (
        <section key={topic}>
          <h2 className="mb-2 font-medium">
            {topic} · {t('knowledgePage.asked', { count: rows.reduce((sum, row) => sum + row.askedCount, 0) })}
          </h2>
          <ul className="space-y-3">
            {rows.map((item) => (
              <li key={item.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{item.question}</p>
                <p className="text-sm text-fg-muted">{t('knowledgePage.asked', { count: item.askedCount })}</p>
                {access.allowed && (
                  <>
                    <Textarea
                      className="mt-2"
                      value={drafts[item.id] ?? item.draftAnswer}
                      onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="mt-2"
                      disabled={addTrain.isPending}
                      onClick={() =>
                        void addTrain.mutateAsync({ id: item.id, answer: drafts[item.id] ?? item.draftAnswer }).then(() =>
                          toast.success(t('knowledgePage.addToKb')),
                        )
                      }
                    >
                      {t('knowledgePage.addToKb')}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function KnowledgeCollectionPage() {
  const { t } = useTranslation(['ai', 'common'])
  const raw = collectionRoute.useParams().collection
  const parsed = KnowledgeCollectionIdSchema.safeParse(raw)
  const navigate = useNavigate()
  if (!parsed.success) {
    void navigate({ to: '/app/ai/knowledge/overview' })
    return null
  }
  const collection = parsed.data
  const access = usePermission('ai.manage')
  const session = useSession()
  const ctx = useLocaleContext(session)
  const list = useKnowledge(collection)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<KnowledgeStatus | 'all'>('all')
  const [active, setActive] = useState<KnowledgeItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)

  if (list.isPending) return <Skeleton className="h-40" />
  if (list.isError) return <ErrorState onRetry={() => void list.refetch()} />
  const items = (list.data?.items ?? []).filter((item) => {
    const matchesQuery = !query.trim() || `${item.title} ${item.answer}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStatus = status === 'all' || item.status === status
    return matchesQuery && matchesStatus
  })
  const coverage = list.data?.collections.find((col) => col.id === collection)

  const actions = access.allowed ? (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => setAdding(true)}>
        {t('knowledgePage.add')}
      </Button>
      <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
        {t('knowledgePage.import')}
      </Button>
    </div>
  ) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-fg-muted">
          {t('knowledgePage.coverage', { percent: coverage?.coverage ?? 0 })}
          {coverage?.missing.length ? ` · ${t('knowledgePage.missing')}: ${coverage.missing.join(', ')}` : ''}
        </p>
        {actions}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" value={query} onChange={(event) => setQuery(event.target.value)} aria-label={t('knowledgePage.search')} placeholder={t('knowledgePage.search')} />
        <Button size="sm" variant={status === 'all' ? 'secondary' : 'ghost'} onClick={() => setStatus('all')}>
          {t('knowledgePage.filterAll')}
        </Button>
        {KnowledgeStatusSchema.options.map((value) => (
          <Button key={value} size="sm" variant={status === value ? 'secondary' : 'ghost'} onClick={() => setStatus(value)}>
            <StatusChip domain="knowledge" value={value} />
          </Button>
        ))}
      </div>
      {!items.length ? (
        <EmptyState icon={BookOpen} title={t('knowledgePage.emptyCollection.title')} description={t('knowledgePage.emptyCollection.body')} />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-md border border-border p-3 text-start hover:bg-surface-2"
                onClick={() => setActive(item)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{item.title}</p>
                  <StatusChip domain="knowledge" value={item.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{item.answer}</p>
                <p className="mt-1 text-xs text-fg-muted">
                  {t(`knowledgePage.source.${item.source}`)}
                  {item.autoTranslated ? ` · ${t('knowledgePage.auto')}` : ''}
                  {item.expiresAt ? ` · ${t('knowledgePage.expires')} ${formatDateTime(item.expiresAt, ctx, { dateStyle: 'medium' })}` : ''}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && <AddItemDialog collection={collection} onClose={() => setAdding(false)} />}
      {importing && <ImportDialog collection={collection} onClose={() => setImporting(false)} />}
      {active && <ItemDialog key={active.id} item={active} onClose={() => setActive(null)} canEdit={access.allowed} />}
    </div>
  )
}

function AddItemDialog({ collection, onClose }: { collection: KnowledgeCollectionId; onClose: () => void }) {
  const { t } = useTranslation(['ai', 'common'])
  const add = useAddKnowledge()
  const [title, setTitle] = useState('')
  const [answer, setAnswer] = useState('')
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogTitle>{t('knowledgePage.add')}</DialogTitle>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            void add.mutateAsync({ collection, title: title.trim(), answer: answer.trim() }).then(() => {
              toast.success(t('knowledgePage.add'))
              onClose()
            })
          }}
        >
          <div>
            <Label htmlFor="kb-title">{t('knowledgePage.itemTitle')}</Label>
            <Input id="kb-title" className="mt-1" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
          <div>
            <Label htmlFor="kb-answer">{t('knowledgePage.itemAnswer')}</Label>
            <Textarea id="kb-answer" className="mt-1" value={answer} onChange={(event) => setAnswer(event.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common:actions.close')}
            </Button>
            <Button type="submit" disabled={add.isPending || title.trim().length < 2 || answer.trim().length < 2}>
              {t('knowledgePage.add')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog({ collection, onClose }: { collection: KnowledgeCollectionId; onClose: () => void }) {
  const { t } = useTranslation(['ai', 'common'])
  const importer = useImportKnowledge()
  const [url, setUrl] = useState('')
  const [paste, setPaste] = useState('')
  const done = () => {
    toast.success(t('knowledgePage.imported'))
    onClose()
  }
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent>
        <DialogTitle>{t('knowledgePage.import')}</DialogTitle>
        <p className="text-sm text-fg-muted">{t('knowledgePage.imported')}</p>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            void importer.mutateAsync({ url, collection }).then(done)
          }}
        >
          <Label htmlFor="kb-url">{t('knowledgePage.url')}</Label>
          <div className="flex flex-wrap gap-2">
            <Input id="kb-url" className="min-w-48 flex-1" value={url} onChange={(event) => setUrl(event.target.value)} />
            <Button type="submit" variant="outline" disabled={url.trim().length < 8 || importer.isPending}>
              {t('knowledgePage.importUrl')}
            </Button>
          </div>
        </form>
        <Textarea value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={t('knowledgePage.pasteHint')} />
        <Button
          variant="outline"
          disabled={paste.trim().length < 8 || importer.isPending}
          onClick={() => void importer.mutateAsync({ paste: paste.trim(), collection }).then(done)}
        >
          {t('knowledgePage.importPaste')}
        </Button>
        <div>
          <Label htmlFor="kb-file">{t('knowledgePage.importFile')}</Label>
          <Input
            id="kb-file"
            className="mt-1"
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void importer.mutateAsync({ fileName: file.name, collection }).then(done)
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ItemDialog({ item, onClose, canEdit }: { item: KnowledgeItem; onClose: () => void; canEdit: boolean }) {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const patch = usePatchKnowledge()
  const verify = useVerifyKnowledge()
  const [answer, setAnswer] = useState(item?.answer ?? '')
  const [pinLang, setPinLang] = useState('pcm')
  const [pinText, setPinText] = useState('')
  const [expiry, setExpiry] = useState(item?.expiresAt?.slice(0, 10) ?? '')

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogTitle>{item.title}</DialogTitle>
        <StatusChip domain="knowledge" value={item.status} />
        <p className="text-xs text-fg-muted">
          {t(`knowledgePage.source.${item.source}`)} · {item.language}
          {item.createdBy.name ? ` · ${item.createdBy.name}` : ''}
          {item.expiresAt ? ` · ${t('knowledgePage.expires')} ${formatDateTime(item.expiresAt, ctx, { dateStyle: 'medium' })}` : ''}
        </p>
        <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} disabled={!canEdit} />
        {Object.entries(item.pinned).map(([lang, text]) => (
          <p key={lang} className="text-sm">
            {t('knowledgePage.pinned')} ({lang}
            {item.autoTranslated ? ` · ${t('knowledgePage.auto')}` : ''}): {text}
          </p>
        ))}
        {canEdit && (
          <div className="grid gap-2 sm:grid-cols-[5rem_1fr]">
            <Input value={pinLang} onChange={(event) => setPinLang(event.target.value)} aria-label={t('knowledgePage.pinLang')} />
            <Input value={pinText} onChange={(event) => setPinText(event.target.value)} placeholder={t('knowledgePage.pinText')} />
          </div>
        )}
        {canEdit && item.collection === 'promotions' && (
          <div>
            <Label>{t('knowledgePage.expires')}</Label>
            <Input className="mt-1" type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
          {canEdit && item.status !== 'verified' && (
            <Button variant="outline" onClick={() => void verify.mutateAsync(item.id).then(onClose)}>
              {t('knowledgePage.verify')}
            </Button>
          )}
          {canEdit && (
            <Button
              onClick={() =>
                void patch
                  .mutateAsync({
                    id: item.id,
                    answer,
                    pinned: pinText.trim() ? { ...item.pinned, [pinLang.trim() || 'en']: pinText.trim() } : item.pinned,
                    expiresAt: expiry ? new Date(`${expiry}T00:00:00.000Z`).toISOString() : item.expiresAt,
                  })
                  .then(() => {
                    toast.success(t('knowledgePage.saved'))
                    onClose()
                  })
              }
            >
              {t('knowledgePage.saveItem')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
