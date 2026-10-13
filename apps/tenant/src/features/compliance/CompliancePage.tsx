import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { COMPLIANCE_PAGE_IDS, MarketCodeSchema, can, type CompliancePageId, type MarketCode } from '@deskhand/schemas'
import { useSession } from '../../api/queries'
import {
  useAcceptLegal,
  useAcceptProhibited,
  useAccessReview,
  useAddSuppression,
  useAiGov,
  useComplianceAudit,
  useComplianceOverview,
  useConsent,
  useDataGov,
  useDisclosure,
  useDsarPreview,
  useDsarQueue,
  useLegalCenter,
  useLogDsar,
  usePatchDataGov,
  usePatchDisclosure,
  usePatchDsar,
  usePatchRecording,
  useRecording,
  useReconsent,
  useReportIncident,
  useSupportDecision,
  useVerifyDisclosure,
} from '../../api/governance'
import {
  Banner,
  Button,
  Card,
  ChecklistRow,
  EmptyState,
  ErrorState,
  Input,
  Label,
  LedgerRow,
  NoPermissionState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  SlaTimer,
  Switch,
  Textarea,
  toast,
} from '@deskhand/ui'
import { ClipboardList } from 'lucide-react'

const MARKETS = MarketCodeSchema.options.filter((code): code is MarketCode => code === 'NG' || code === 'UK' || code === 'US')

export function CompliancePage({ page, marketPreview }: { page: CompliancePageId; marketPreview?: string }) {
  const session = useSession()
  const { t } = useTranslation('common')
  if (!COMPLIANCE_PAGE_IDS.includes(page)) return null
  if (!['owner', 'admin', 'manager'].includes(session.membership.role)) {
    return <NoPermissionState roleLabel={t('roles.manager')} />
  }
  if (page === 'overview') return <OverviewPane marketPreview={marketPreview} />
  if (page === 'disclosure') return <DisclosurePane />
  if (page === 'consent') return <ConsentPane />
  if (page === 'recording') return <RecordingPane />
  if (page === 'data') return <DataPane />
  if (page === 'requests') return <RequestsPane marketPreview={marketPreview} />
  if (page === 'ai') return <AiPane />
  if (page === 'audit') return <AuditPane />
  if (page === 'access') return <AccessPane />
  return <LegalPane />
}

function OverviewPane({ marketPreview }: { marketPreview?: string }) {
  const { t } = useTranslation('governance')
  const navigate = useNavigate()
  const query = useComplianceOverview(marketPreview)
  if (query.isPending) return <Skeleton className="h-40" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const data = query.data
  return (
    <div className="space-y-6">
      {data.blocking.length > 0 && <Banner severity="danger" title={t('blockingBanner')} />}
      <p className="text-sm text-fg-muted">{t('readiness', { score: data.readiness })}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-fg-muted">{t('previewMarket')}</span>
          <Select
            value={(marketPreview as MarketCode) || data.market}
            onValueChange={(value) =>
              void navigate({ to: '/app/compliance/$page', params: { page: 'overview' }, search: { market: value } })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MARKETS.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <p className="self-end text-sm text-fg-muted">{t('marketHint')}</p>
      </div>
      <Card className="space-y-2 p-4">
        <h2 className="font-medium">{t('law')}</h2>
        <p className="text-sm">{data.law}</p>
        <p className="text-sm text-fg-muted">{t(`regulators.${data.regulator}`)}</p>
        <p className="text-xs text-fg-muted">{t('whatThisMeans')}</p>
        <ul className="list-disc ps-5 text-sm">
          {data.productDoes.map((key) => (
            <li key={key}>{t(`does.${key}`)}</li>
          ))}
        </ul>
        <p className="pt-2 text-xs font-medium">{t('ownerDoes')}</p>
        <ul className="list-disc ps-5 text-sm">
          {data.ownerDoes.map((key) => (
            <li key={key}>{t(`does.${key}`)}</li>
          ))}
        </ul>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-fg-muted">{t('productDoes')}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{data.wordingPreview}</p>
      </Card>
      <ul>
        {data.items.map((item) => (
          <ChecklistRow
            key={item.id}
            status={item.status}
            statusLabel={t(`status.${item.status}`)}
            title={t(`items.${item.id}`)}
            reason={t(`reasons.${item.reasonKey}`)}
            escalate={item.escalate}
            escalateLabel={t('escalate')}
            action={
              <Button asChild size="sm" variant="outline">
                <Link to="/app/compliance/$page" params={{ page: item.fixHref.split('/').at(-1) ?? 'overview' }} search={{}}>
                  {t('fix')}
                </Link>
              </Button>
            }
          />
        ))}
      </ul>
    </div>
  )
}

function DisclosurePane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useDisclosure()
  const patch = usePatchDisclosure()
  const verify = useVerifyDisclosure()
  const [language, setLanguage] = useState('en')
  if (query.isPending) return <Skeleton className="h-40" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const current = query.data.byLanguage.find((row) => row.language === language) ?? query.data.byLanguage[0]
  return (
    <div className="grid max-w-2xl gap-4">
      <p className="text-sm text-fg-muted">{t('disclosure.cannotOff')}</p>
      <div>
        <Label>{t('disclosure.language')}</Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {query.data.byLanguage.map((row) => (
              <SelectItem key={row.language} value={row.language}>
                {row.language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Textarea
        defaultValue={current?.text}
        key={language}
        disabled={!manage}
        aria-label={t('disclosure.preview')}
        onBlur={(event) => {
          if (!manage) return
          void patch.mutateAsync({ language, text: event.target.value }).then(() => toast.success(t('saved')))
        }}
      />
      <Card className="p-4 text-sm">
        <p className="text-fg-muted">{t('disclosure.preview')}</p>
        <p className="mt-2 whitespace-pre-wrap">{current?.text}</p>
      </Card>
      <p className="text-sm text-fg-muted">{query.data.storedNotice}</p>
      <p className="text-sm">
        {t('disclosure.legalName')}: {query.data.legalName}
      </p>
      <Button
        disabled={!manage || verify.isPending}
        onClick={() =>
          void verify.mutateAsync({ channel: 'whatsapp', language }).then((result) => {
            toast.success(result.verified ? t('disclosure.verified') : t('disclosure.failed'))
          })
        }
      >
        {t('disclosure.verify')}
      </Button>
      {query.data.lastTest && (
        <p className="text-sm text-fg-muted">
          {t('disclosure.lastTest')}: {query.data.lastTest.channel} / {query.data.lastTest.language}
        </p>
      )}
    </div>
  )
}

function ConsentPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const [q, setQ] = useState('')
  const query = useConsent(q)
  const reconsent = useReconsent()
  const suppress = useAddSuppression()
  const [name, setName] = useState('')
  const [reason, setReason] = useState('')
  if (query.isPending) return <Skeleton className="h-40" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className="space-y-8">
      {query.data.quietHours && <p className="text-sm text-fg-muted">{t('consent.quiet', query.data.quietHours)}</p>}
      {query.data.smsConsentStrict && <p className="text-sm">{t('consent.smsStrict')}</p>}
      <section>
        <h2 className="font-medium">{t('consent.ledger')}</h2>
        <Input className="mt-2 max-w-sm" value={q} onChange={(event) => setQ(event.target.value)} aria-label={t('search')} />
        {query.data.ledger.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('empty.ledger')} description="" />
        ) : (
          <ul className="mt-3">
            {query.data.ledger.map((row) => (
              <LedgerRow
                key={row.id}
                name={row.contactName}
                proof={row.proof}
                meta={`${row.purpose} · ${row.channel} · ${row.status} · ${row.wordingVersion}`}
              />
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="font-medium">{t('consent.wordings')}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {query.data.wordings.map((row) => (
            <li key={row.id}>
              {row.version} · {row.purpose} · {row.surface}
              {row.current ? ` · ${t('consent.current')}` : ''}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">{t('consent.suppression')}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {query.data.suppression.map((row) => (
            <li key={row.id}>
              {row.contactName} · {row.channel} · {row.reason}
            </li>
          ))}
        </ul>
        {manage && (
          <div className="mt-3 flex max-w-lg flex-wrap gap-2">
            <Input value={name} onChange={(event) => setName(event.target.value)} aria-label={t('consent.name')} />
            <Input value={reason} onChange={(event) => setReason(event.target.value)} aria-label={t('consent.reason')} />
            <Button
              size="sm"
              onClick={() =>
                void suppress.mutateAsync({ contactName: name, channel: 'whatsapp', reason }).then(() => toast.success(t('saved')))
              }
            >
              {t('consent.addSuppression')}
            </Button>
          </div>
        )}
      </section>
      {manage && (
        <Button
          variant="outline"
          onClick={() => void reconsent.mutateAsync({ purpose: 'marketing' }).then(() => toast.success(t('consent.campaignStarted')))}
        >
          {t('consent.reconsent')}
        </Button>
      )}
    </div>
  )
}

function RecordingPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useRecording()
  const patch = usePatchRecording()
  if (query.isPending) return <Skeleton className="h-32" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const data = query.data
  return (
    <div className="grid max-w-xl gap-4">
      <Switch
        checked={data.enabled}
        disabled={!manage}
        onCheckedChange={(value) => void patch.mutateAsync({ enabled: value === true })}
        aria-label={t('recording.enabled')}
      />
      <Label>{t('recording.notice')}</Label>
      <Textarea
        defaultValue={data.notice}
        disabled={!manage}
        onBlur={(event) => void patch.mutateAsync({ notice: event.target.value }).then(() => toast.success(t('saved')))}
      />
      {data.allPartyConsent && <p className="text-sm">{t('recording.allParty')}</p>}
      {data.allPartyConsent && manage && (
        <Button variant="outline" onClick={() => void patch.mutateAsync({ allPartyAcknowledged: true })}>
          {t('recording.acknowledge')}
        </Button>
      )}
      <p className="text-sm text-fg-muted">{t('recording.staff')}</p>
      {manage && (
        <Button variant="outline" onClick={() => void patch.mutateAsync({ acceptStaffMonitoring: true })}>
          {t('recording.acceptStaff')}
        </Button>
      )}
      <p className="text-sm">{t('recording.retention', { days: data.retentionDays })}</p>
    </div>
  )
}

function DataPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useDataGov()
  const patch = usePatchDataGov()
  if (query.isPending) return <Skeleton className="h-32" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  const data = query.data
  return (
    <div className="grid max-w-xl gap-4 text-sm">
      <p>
        {t('data.region')}: {data.region}
      </p>
      {manage && (
        <Button variant="outline" onClick={() => void patch.mutateAsync({ requestRegionChange: true }).then(() => toast.success(t('data.requested')))}>
          {t('data.requestChange')}
        </Button>
      )}
      <Switch
        checked={data.legalHold}
        disabled={!manage}
        onCheckedChange={(value) => void patch.mutateAsync({ legalHold: value === true })}
        aria-label={t('data.legalHold')}
      />
      <h2 className="font-medium">{t('data.retention')}</h2>
      <ul>
        {Object.entries(data.retention).map(([key, days]) => (
          <li key={key}>
            {key}: {days}
          </li>
        ))}
      </ul>
      <h2 className="font-medium">{t('data.documents')}</h2>
      <ul>
        {data.documents.map((doc) => (
          <li key={doc.id}>{t(`data.doc.${doc.id}`)}</li>
        ))}
      </ul>
    </div>
  )
}

function RequestsPane({ marketPreview }: { marketPreview?: string }) {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const canLog = manage || session.membership.role === 'manager'
  const query = useDsarQueue(marketPreview)
  const log = useLogDsar()
  const patch = usePatchDsar()
  const [previewId, setPreviewId] = useState<string | null>(null)
  const preview = useDsarPreview(previewId)
  const [requester, setRequester] = useState('')
  if (query.isPending) return <Skeleton className="h-40" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className="space-y-4">
      {canLog && (
        <div className="flex max-w-lg gap-2">
          <Input value={requester} onChange={(event) => setRequester(event.target.value)} aria-label={t('requests.requester')} />
          <Button
            size="sm"
            onClick={() =>
              void log.mutateAsync({ type: 'access', requester }).then(() => {
                setRequester('')
                toast.success(t('saved'))
              })
            }
          >
            {t('requests.log')}
          </Button>
        </div>
      )}
      {query.data.items.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('empty.requests')} description="" />
      ) : (
        <ul className="divide-y divide-border">
          {query.data.items.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">
                  {row.requester} · {t(`requests.types.${row.type}`)}
                </p>
                <p className="text-sm text-fg-muted">{t(`requests.statuses.${row.status}`)}</p>
              </div>
              <SlaTimer
                remainingHours={row.remainingHours}
                overdue={row.overdue}
                escalate={row.escalate}
                labels={{
                  overdue: t('requests.overdue'),
                  left: t('requests.hoursLeft', { count: Math.max(0, Math.round(row.remainingHours)) }),
                  escalate: t('escalate'),
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPreviewId(row.id)}>
                  {t('requests.preview')}
                </Button>
                {manage && row.status !== 'completed' && (
                  <Button size="sm" onClick={() => void patch.mutateAsync({ id: row.id, body: { status: 'completed' } })}>
                    {t('requests.complete')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {preview.data && (
        <Card className="space-y-2 p-4 text-sm">
          <p className="font-medium">{t('requests.preview')}</p>
          <p>{t('requests.exportKinds')}</p>
          <ul>
            {preview.data.export.map((row) => (
              <li key={row.kind}>
                {row.kind}: {row.count}
              </li>
            ))}
          </ul>
          <p>{t('requests.removeKinds')}</p>
          <ul>
            {preview.data.remove.map((row) => (
              <li key={row.kind}>
                {row.kind}: {row.count}
              </li>
            ))}
          </ul>
          <p>{t('requests.keepKinds')}</p>
          <ul>
            {preview.data.keep.map((row) => (
              <li key={row.kind}>{t(`requests.keep.${row.reasonKey}`)}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function AiPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useAiGov()
  const accept = useAcceptProhibited()
  const report = useReportIncident()
  const [summary, setSummary] = useState('')
  if (query.isPending) return <Skeleton className="h-40" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="font-medium">{t('aiGov.matrix')}</h2>
        <ul className="mt-2 space-y-2">
          {query.data.matrix.map((row) => (
            <li key={row.employeeId}>
              {row.name} · {row.tools.map((tool) => `${tool.id}:${tool.autonomy}`).join(' ')}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">{t('aiGov.guardrails')}</h2>
        {query.data.guardrails.map((row) => (
          <p key={row.id} className="mt-1 text-fg-muted">
            {t(`aiGov.${row.layer}`)}: {row.text}
          </p>
        ))}
      </section>
      <section>
        <h2 className="font-medium">{t('aiGov.transparency')}</h2>
        <p className="mt-1 whitespace-pre-wrap">{query.data.transparency}</p>
      </section>
      {manage && !query.data.prohibitedUsesAcceptedAt && (
        <Button onClick={() => void accept.mutateAsync()}>{t('aiGov.acceptProhibited')}</Button>
      )}
      <section>
        <h2 className="font-medium">{t('aiGov.incidents')}</h2>
        <ul>
          {query.data.incidents.map((row) => (
            <li key={row.id}>
              {row.summary} · {row.status}
            </li>
          ))}
        </ul>
        {manage && (
          <div className="mt-2 flex gap-2">
            <Input value={summary} onChange={(event) => setSummary(event.target.value)} aria-label={t('aiGov.summary')} />
            <Button size="sm" onClick={() => void report.mutateAsync({ summary }).then(() => setSummary(''))}>
              {t('aiGov.report')}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

function AuditPane() {
  const { t } = useTranslation('governance')
  const [q, setQ] = useState('')
  const query = useComplianceAudit(q)
  return (
    <div className="space-y-3">
      <Input value={q} onChange={(event) => setQ(event.target.value)} aria-label={t('audit.search')} />
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      <ul className="space-y-1 text-sm">
        {query.data?.map((item) => (
          <li key={item.id}>
            {item.actor} · {item.action} · {item.target}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AccessPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useAccessReview()
  const decide = useSupportDecision()
  if (query.isPending) return <Skeleton className="h-32" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className="space-y-6 text-sm">
      <section>
        <h2 className="font-medium">{t('access.members')}</h2>
        <ul className="mt-2 space-y-1">
          {query.data.members.map((row) => (
            <li key={row.id}>
              {row.name} · {row.role} · {row.locations}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">{t('access.support')}</h2>
        <ul className="mt-2 space-y-2">
          {query.data.support.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2">
              <span>
                {row.actor} · {row.reason} · {row.status}
              </span>
              {manage && row.status === 'pending' && (
                <>
                  <Button size="sm" onClick={() => void decide.mutateAsync({ id: row.id, decision: 'approve' })}>
                    {t('access.approve')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide.mutateAsync({ id: row.id, decision: 'deny' })}>
                    {t('access.deny')}
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="font-medium">{t('access.breach')}</h2>
        {query.data.breachNoteKeys.map((key) => (
          <p key={key} className="mt-1 text-fg-muted">
            {t(`access.${key}`)}
          </p>
        ))}
      </section>
    </div>
  )
}

function LegalPane() {
  const { t } = useTranslation('governance')
  const session = useSession()
  const manage = can(session.membership.role, 'compliance.manage')
  const query = useLegalCenter()
  const accept = useAcceptLegal()
  if (query.isPending) return <Skeleton className="h-32" />
  if (query.isError || !query.data) return <ErrorState onRetry={() => void query.refetch()} />
  return (
    <div className="space-y-4 text-sm">
      {query.data.pendingChange && <Banner severity="attention" title={t('legal.pending')} />}
      <ul className="space-y-3">
        {query.data.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-3">
            <span>
              {t(`legal.docs.${doc.id}`)} · {doc.acceptedAt ? t('legal.accepted', { version: doc.version }) : doc.version}
            </span>
            {manage && !doc.acceptedAt && <Button size="sm" onClick={() => void accept.mutateAsync(doc.id)}>{t('legal.accept')}</Button>}
          </li>
        ))}
      </ul>
      <h2 className="font-medium">{t('legal.addenda')}</h2>
      <ul>
        {query.data.marketAddenda.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

