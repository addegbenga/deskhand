import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import {
  KnowledgeCollectionIdSchema,
  TIER_AUTONOMY_CAP,
  canSeeArea,
  type AutonomyLevel,
  type EmployeeToolId,
} from '@deskhand/schemas'
import {
  AutonomyChip,
  Banner,
  Button,
  EvalResultsTable,
  Input,
  KillSwitchButton,
  Label,
  LanguageTierBadge,
  NoPermissionState,
  PageContainer,
  PageHeader,
  SandboxChat,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusChip,
  Switch,
  Textarea,
  WhyPopover,
  toast,
  usePermission,
} from '@deskhand/ui'
import {
  useCompliance,
  useEmployee,
  useEmployeeVersions,
  useEvals,
  useKillEmployee,
  useKnowledge,
  usePatchEmployee,
  useRaiseAutonomy,
  useResumeEmployee,
  useRollback,
  useSandbox,
} from '../../api/ai'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'

const TABS = ['overview', 'persona', 'knowledge', 'channels', 'skills', 'rules', 'test', 'versions', 'activity', 'compliance'] as const

export function EmployeeDetailPage({ employeeId, tab }: { employeeId: string; tab: string }) {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const access = usePermission('ai.manage')
  const current = TABS.includes(tab as (typeof TABS)[number]) ? tab : 'overview'
  const employee = useEmployee(employeeId)
  const kill = useKillEmployee()
  const resume = useResumeEmployee()

  if (!canSeeArea(session.membership.role, 'ai')) {
    return (
      <PageContainer>
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  const data = employee.data
  return (
    <PageContainer>
      <PageHeader
        title={data?.name ?? t('list.title')}
        description={data ? <StatusChip domain="employee" value={data.status} /> : undefined}
        action={
          data && access.allowed ? (
            data.killSwitched || data.status === 'paused' ? (
              <Button
                onClick={() =>
                  void resume.mutateAsync(data.id).then(() => {
                    toast.success(t('kill.resumed'))
                    void employee.refetch()
                  })
                }
              >
                {t('kill.resume')}
              </Button>
            ) : (
              <KillSwitchButton
                onClick={() =>
                  void kill.mutateAsync(data.id).then(() => {
                    toast.success(t('kill.paused'))
                    void employee.refetch()
                  })
                }
              />
            )
          ) : undefined
        }
        tabs={
          <nav className="flex gap-1 overflow-x-auto border-b border-border">
            {TABS.map((item) => (
              <Link
                key={item}
                to="/app/ai/employees/$employeeId/$tab"
                params={{ employeeId, tab: item }}
                className="h-10 shrink-0 border-b-2 border-transparent px-3 text-sm text-fg-muted data-[status=active]:border-brand data-[status=active]:text-fg"
              >
                {t(`tabs.${item}`)}
              </Link>
            ))}
          </nav>
        }
      />
      {employee.isPending && <Skeleton className="h-48" />}
      {data && (data.killSwitched || data.status === 'paused') && (
        <Banner severity="attention" className="mb-4">
          {t('overview.pausedBanner')}
        </Banner>
      )}
      {data && current === 'overview' && <Overview employeeId={employeeId} />}
      {data && current === 'persona' && <PersonaForm id={employeeId} />}
      {data && current === 'knowledge' && <EmployeeKnowledge employeeId={employeeId} />}
      {data && current === 'channels' && <ChannelsForm id={employeeId} />}
      {data && current === 'skills' && <SkillsForm id={employeeId} />}
      {data && current === 'rules' && <RulesForm id={employeeId} />}
      {data && current === 'test' && <TestTab id={employeeId} />}
      {data && current === 'versions' && <VersionsTab id={employeeId} />}
      {data && current === 'activity' && <p className="text-sm text-fg-muted">{t('list.handled', { count: data.conversationsThisMonth })}</p>}
      {data && current === 'compliance' && <ComplianceTab id={employeeId} />}
    </PageContainer>
  )
}

function EmployeeKnowledge({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation('ai')
  const access = usePermission('ai.manage')
  const employee = useEmployee(employeeId)
  const patch = usePatchEmployee(employeeId)
  const list = useKnowledge()
  const ids = employee.data?.collectionIds ?? []
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">{t('knowledgePage.employeeHint')}</p>
      <Button asChild size="sm" variant="outline">
        <Link to="/app/ai/knowledge/overview">{t('knowledgePage.title')}</Link>
      </Button>
      {(list.isPending || employee.isPending) && <Skeleton className="h-24" />}
      <ul className="grid gap-2 md:grid-cols-2">
        {KnowledgeCollectionIdSchema.options.map((id) => {
          const col = list.data?.collections.find((item) => item.id === id)
          const on = ids.includes(id)
          return (
            <li key={id} className="flex items-start gap-3 rounded-md border border-border p-3">
              <Switch
                checked={on}
                disabled={!access.allowed || patch.isPending}
                onCheckedChange={(checked) => {
                  const next = checked ? [...ids, id] : ids.filter((item) => item !== id)
                  void patch.mutateAsync({ collectionIds: next }).then(() => void employee.refetch())
                }}
                aria-label={t('knowledgePage.using')}
              />
              <Link to="/app/ai/knowledge/$collection" params={{ collection: id }} className="min-w-0 flex-1 text-sm hover:underline">
                <p className="font-medium">{t(`collections.${id}`)}</p>
                {col && <p className="text-fg-muted">{t('knowledgePage.coverage', { percent: col.coverage })}</p>}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Overview({ employeeId }: { employeeId: string }) {
  const { t } = useTranslation('ai')
  const session = useSession()
  const ctx = useLocaleContext(session)
  const employee = useEmployee(employeeId)
  const data = employee.data
  if (!data) return null
  return (
    <div className="space-y-4">
      <p className="text-sm">
        {t('list.handled', { count: data.conversationsThisMonth })} · {t('list.handoff', { rate: Math.round(data.handoffRate * 100) })} ·{' '}
        {t('list.cost', { amount: formatMoney(data.costThisMonth, data.currency, ctx.locale) })}
      </p>
      <h2 className="font-semibold">{t('overview.warnings')}</h2>
      {data.warnings.length === 0 && <p className="text-sm text-fg-muted">{t('overview.none')}</p>}
      <ul className="space-y-2">
        {data.warnings.map((warning) => (
          <li key={warning}>
            <Banner severity={warning.includes('autopilot') ? 'danger' : 'attention'}>{t(`warnings.${warning}`, { defaultValue: warning })}</Banner>
          </li>
        ))}
      </ul>
    </div>
  )
}

function PersonaForm({ id }: { id: string }) {
  const { t } = useTranslation(['ai', 'common'])
  const employee = useEmployee(id)
  const patch = usePatchEmployee(id)
  const data = employee.data
  const [name, setName] = useState(data?.name ?? '')
  const [greeting, setGreeting] = useState(data?.greeting ?? '')
  if (!data) return null
  return (
    <form
      className="max-w-xl space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        void patch.mutateAsync({ name, greeting }).then(() => {
          toast.success(t('persona.save'))
          void employee.refetch()
        })
      }}
    >
      <p className="text-sm text-fg-muted">{t('persona.inherited', { country: t('common:languages.en') })}</p>
      <Label htmlFor="emp-name">{t('persona.name')}</Label>
      <Input id="emp-name" value={name || data.name} onChange={(e) => setName(e.target.value)} />
      <Label htmlFor="emp-greet">{t('persona.greeting')}</Label>
      <Textarea id="emp-greet" value={greeting || data.greeting} onChange={(e) => setGreeting(e.target.value)} />
      <p className="text-sm">{t('persona.disclosure')}</p>
      <p className="rounded-md bg-surface-2 p-3 text-sm">{data.disclosure}</p>
      <div className="flex flex-col gap-2">
        {data.languages.map((lang) => (
          <div key={lang.code} className="flex flex-wrap items-center gap-2">
            <span>{t(`common:languages.${lang.code}`, { defaultValue: lang.code })}</span>
            <LanguageTierBadge tier={lang.tier} />
            <AutonomyChip level={lang.autonomy} />
            <span className="text-xs text-fg-muted">{t('wizard.tierCap', { code: lang.code, tier: lang.tier, cap: TIER_AUTONOMY_CAP[lang.tier] })}</span>
          </div>
        ))}
      </div>
      <Button type="submit">{t('persona.save')}</Button>
    </form>
  )
}

function ChannelsForm({ id }: { id: string }) {
  const { t } = useTranslation(['ai', 'common'])
  const employee = useEmployee(id)
  const patch = usePatchEmployee(id)
  const data = employee.data
  if (!data) return null
  return (
    <div className="max-w-xl space-y-3">
      <Label>{t('channels.hours')}</Label>
      <Select value={data.hours} onValueChange={(hours) => void patch.mutateAsync({ hours }).then(() => void employee.refetch())}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="business">{t('channels.business')}</SelectItem>
          <SelectItem value="always">{t('channels.always')}</SelectItem>
        </SelectContent>
      </Select>
      <ul className="text-sm">
        {data.channels.map((channel) => (
          <li key={channel}>{t(`common:channels.${channel}`)}</li>
        ))}
      </ul>
    </div>
  )
}

function SkillsForm({ id }: { id: string }) {
  const { t } = useTranslation('ai')
  const employee = useEmployee(id)
  const raise = useRaiseAutonomy(id)
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<{ toolId: EmployeeToolId; autonomy: AutonomyLevel } | null>(null)
  const data = employee.data
  if (!data) return null
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-fg-muted">{t('skills.raise')}</p>
      {data.tools.map((tool) => (
        <div key={tool.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
          <span className="flex-1 font-medium">{t(`tools.${tool.id}`)}</span>
          <AutonomyChip level={tool.autonomy} />
          {(['suggest', 'approve', 'autopilot'] as const).map((level) => (
            <Button
              key={level}
              size="sm"
              variant={tool.autonomy === level ? 'secondary' : 'ghost'}
              onClick={() => setPending({ toolId: tool.id, autonomy: level })}
            >
              {level}
            </Button>
          ))}
        </div>
      ))}
      {pending && (
        <div className="space-y-2">
          <Label htmlFor="raise-reason">{t('skills.reason')}</Label>
          <Textarea id="raise-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            onClick={() =>
              void raise.mutateAsync({ ...pending, reason }).then(() => {
                toast.success(t('skills.apply'))
                setPending(null)
                setReason('')
                void employee.refetch()
              })
            }
          >
            {t('skills.apply')}
          </Button>
        </div>
      )}
    </div>
  )
}

function RulesForm({ id }: { id: string }) {
  const { t } = useTranslation('ai')
  const employee = useEmployee(id)
  const patch = usePatchEmployee(id)
  const data = employee.data
  if (!data) return null
  return (
    <div className="max-w-xl space-y-3">
      <p className="text-sm">{t('rules.neverSay')}: {data.neverSay.join(', ')}</p>
      <p className="text-sm">{t('rules.escalate')}: {data.escalateTopics.join(', ')}</p>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={data.quietHours} onCheckedChange={(quietHours) => void patch.mutateAsync({ quietHours }).then(() => void employee.refetch())} />
        {t('rules.quiet')}
      </label>
    </div>
  )
}

function TestTab({ id }: { id: string }) {
  const { t } = useTranslation('ai')
  const sandbox = useSandbox(id)
  const evals = useEvals(id)
  const [value, setValue] = useState('')
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string }[]>([])
  const send = (message: string, scenario?: string) => {
    setMessages((cur) => [...cur, { id: crypto.randomUUID(), role: 'user', text: message }])
    void sandbox.mutateAsync({ message, scenario }).then((reply) => {
      setMessages((cur) => [...cur, { id: crypto.randomUUID(), role: 'assistant', text: reply.text }])
    })
    setValue('')
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-2 font-semibold">{t('test.title')}</h2>
        <SandboxChat
          messages={messages}
          value={value}
          onChange={setValue}
          onSend={() => value.trim() && send(value)}
          placeholder={t('test.placeholder')}
          sendLabel={t('test.send')}
        />
        {sandbox.data && (
          <WhyPopover sources={sandbox.data.why.sources} rules={sandbox.data.why.rules} tools={sandbox.data.why.tools} />
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {(['price', 'injection', 'general', 'handoff', 'closed_day'] as const).map((scenario) => (
            <Button key={scenario} size="sm" variant="outline" onClick={() => send(t(`test.${scenario}`), scenario)}>
              {t(`test.${scenario}`)}
            </Button>
          ))}
        </div>
      </div>
      <EvalResultsTable
        rows={(evals.data ?? []).map((row) => ({ id: row.id, language: row.language, suite: row.suite, passed: row.passed, score: row.score }))}
        languageLabel={t('persona.languages')}
        suiteLabel={t('test.scenarios')}
        resultLabel={t('compliance.pass')}
      />
    </div>
  )
}

function VersionsTab({ id }: { id: string }) {
  const { t } = useTranslation('ai')
  const versions = useEmployeeVersions(id)
  const rollback = useRollback(id)
  const employee = useEmployee(id)
  return (
    <ul className="space-y-2">
      {versions.data?.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t('versions.current', { number: item.number })}</p>
            <p className="text-sm text-fg-muted">{item.summary}</p>
            {item.reason && <p className="text-xs text-fg-muted">{t('versions.reason', { reason: item.reason })}</p>}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void rollback.mutateAsync(item.number).then(() => void employee.refetch())}
          >
            {t('versions.rollback')}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function ComplianceTab({ id }: { id: string }) {
  const { t } = useTranslation('ai')
  const report = useCompliance(id)
  if (report.isPending) return <Skeleton className="h-40" />
  return (
    <ul className="space-y-2">
      {report.data?.items.map((item) => (
        <li key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
          <span>{t(`compliance.${item.id}`)}</span>
          <span className={item.ok ? 'text-success' : 'text-danger'}>{item.ok ? t('compliance.pass') : t('compliance.fail')}</span>
        </li>
      ))}
    </ul>
  )
}
