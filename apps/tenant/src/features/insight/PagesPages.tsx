import { Link, useNavigate } from '@tanstack/react-router'
import { FileText } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import {
  useCreatePage,
  usePage,
  usePageVersions,
  usePages,
  usePatchPage,
  usePublishPage,
  useRestorePage,
  useUnpublishPage,
} from '../../api/insight'
import { useSession } from '../../api/queries'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  EmptyState,
  ErrorState,
  FunnelView,
  Input,
  Label,
  NoPermissionState,
  PageCanvas,
  PageContainer,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from '@deskhand/ui'

export function PagesListPage() {
  const { t } = useTranslation(['insight', 'common'])
  const session = useSession()
  const list = usePages()
  const create = useCreatePage()
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [template, setTemplate] = useState<'salon' | 'blank'>('salon')

  if (!canSeeArea(session.membership.role, 'marketing')) {
    return (
      <PageContainer>
        <PageHeader title={t('pages.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={t('pages.title')} />
      <div className="mb-6 max-w-xl space-y-3">
        <Label>{t('pages.prompt')}</Label>
        <Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
        <Select value={template} onValueChange={(value) => setTemplate(value as 'salon' | 'blank')}>
          <SelectTrigger aria-label={t('pages.template')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="salon">{t('pages.salon')}</SelectItem>
            <SelectItem value="blank">{t('pages.blank')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() =>
            void create.mutateAsync({ prompt, template }).then(
              (page) => navigate({ to: '/app/pages/$pageId', params: { pageId: page.id } }),
              (error) => toast.error(isApiError(error) ? t('pages.banned') : t('common:actions.retry')),
            )
          }
        >
          {t('pages.fromPrompt')}
        </Button>
      </div>
      {list.isPending && <Skeleton className="h-32" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState icon={FileText} title={t('pages.empty.title')} description={t('pages.empty.body')} />
      )}
      <ul className="space-y-2">
        {list.data?.map((page) => (
          <li key={page.id}>
            <Link className="block rounded-lg border border-border p-4" to="/app/pages/$pageId" params={{ pageId: page.id }}>
              <span className="font-medium">{page.title}</span>
              <Badge className="ms-2" tone={page.status === 'published' ? 'success' : 'neutral'}>
                {page.status}
              </Badge>
              <p className="mt-1 text-sm text-fg-muted">
                {t('pages.meta', {
                  slug: page.slug,
                  visitsLabel: t('pages.visits'),
                  visits: page.visits,
                  conversionsLabel: t('pages.conversions'),
                  conversions: page.conversions,
                })}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </PageContainer>
  )
}

export function PageEditorPage({ pageId }: { pageId: string }) {
  const { t } = useTranslation(['insight', 'common'])
  const session = useSession()
  const page = usePage(pageId)
  const patch = usePatchPage(pageId)
  const publish = usePublishPage(pageId)
  const unpublish = useUnpublishPage()
  const versions = usePageVersions(pageId)
  const restore = useRestorePage(pageId)
  const [mobile, setMobile] = useState(true)
  const [open, setOpen] = useState(false)
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [indexable, setIndexable] = useState(true)
  const data = page.data

  if (!canSeeArea(session.membership.role, 'marketing')) {
    return (
      <PageContainer>
        <PageHeader title={t('pages.title')} />
        <NoPermissionState roleLabel={t('common:roles.manager')} />
      </PageContainer>
    )
  }
  if (page.isPending || !data) {
    return (
      <PageContainer>
        <Skeleton className="h-40" />
      </PageContainer>
    )
  }
  if (page.isError) return <ErrorState onRetry={() => void page.refetch()} />

  const saveBlock = (id: string, heading: string, body: string) => {
    void patch.mutateAsync({
      blocks: data.blocks.map((block) => (block.id === id ? { ...block, heading, body } : block)),
    }).then(() => toast.success(t('pages.saved')), (error) => toast.error(isApiError(error) ? t('pages.banned') : t('common:actions.retry')))
  }

  return (
    <PageContainer>
      <PageHeader
        title={data.title}
        description={data.status === 'published' ? t('pages.liveAt', { url: `http://localhost:5170/p/${data.slug}` }) : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setMobile((value) => !value)}>
              {mobile ? t('pages.desktop') : t('pages.preview')}
            </Button>
            {data.status === 'published' ? (
              <Button variant="outline" onClick={() => void unpublish.mutateAsync(data.id)}>
                {t('pages.unpublish')}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setSeoTitle(data.seoTitle)
                  setSeoDescription(data.seoDescription)
                  setIndexable(data.indexable)
                  setOpen(true)
                }}
              >
                {t('pages.publish')}
              </Button>
            )}
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Input defaultValue={data.title} onBlur={(event) => void patch.mutateAsync({ title: event.target.value })} />
          {data.blocks.map((block) => (
            <div key={block.id} className="rounded-md border border-border p-3">
              <p className="text-xs uppercase text-fg-muted">{block.type}</p>
              <Input className="mt-2" defaultValue={block.heading} onBlur={(event) => saveBlock(block.id, event.target.value, block.body)} />
              <Textarea className="mt-2" defaultValue={block.body} onBlur={(event) => saveBlock(block.id, block.heading, event.target.value)} />
            </div>
          ))}
          <div>
            <p className="mb-2 font-medium">{t('pages.versions')}</p>
            <ul className="space-y-2 text-sm">
              {versions.data?.map((version) => (
                <li key={version.id} className="flex items-center justify-between gap-2">
                  <span>{t('pages.version', { number: version.number, summary: version.summary })}</span>
                  <Button size="sm" variant="outline" onClick={() => void restore.mutateAsync(version.id)}>
                    {t('pages.restore')}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div>
          <div className={mobile ? 'mx-auto max-w-sm' : ''}>
            <PageCanvas blocks={data.blocks} />
          </div>
          <div className="mt-6">
            <p className="mb-2 font-medium">{t('pages.funnel')}</p>
            <FunnelView steps={data.funnel} dropOffLabel={(from, to, rate) => t('pages.dropOff', { from, to, rate })} />
          </div>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{t('pages.publish')}</DialogTitle>
          <div className="flex flex-col gap-3">
            <Label>{t('pages.seoTitle')}</Label>
            <Input value={seoTitle} onChange={(event) => setSeoTitle(event.target.value)} />
            <Label>{t('pages.seoDescription')}</Label>
            <Textarea value={seoDescription} onChange={(event) => setSeoDescription(event.target.value)} />
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={indexable} onCheckedChange={setIndexable} />
              {t('pages.indexable')}
            </label>
            <Button
              onClick={() =>
                void publish.mutateAsync({ seoTitle, seoDescription, indexable, domain: data.domain }).then(() => setOpen(false))
              }
            >
              {t('pages.publish')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
