import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import {
  EmployeeToolIdSchema,
  KnowledgeCollectionIdSchema,
  TIER_AUTONOMY_CAP,
  type AutonomyLevel,
  type ChannelKind,
  type Employee,
  type EmployeeToolId,
} from '@deskhand/schemas'
import {
  AutonomyChip,
  Banner,
  Button,
  Checkbox,
  EvalResultsTable,
  Input,
  Label,
  LanguageTierBadge,
  SandboxChat,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  WhyPopover,
  WizardLayout,
  toast,
} from '@deskhand/ui'
import {
  useAddKnowledge,
  useCompliance,
  useCreateEmployee,
  useEvals,
  useKnowledge,
  usePatchEmployee,
  usePublishEmployee,
  useSandbox,
} from '../../api/ai'
import { useSession } from '../../api/queries'
import { useConnections, useTeam } from '../../api/settings'

const CHAT_STEPS = ['template', 'persona', 'channels', 'knowledge', 'skills', 'rules', 'test', 'review', 'live'] as const
const VOICE_STEPS = ['use', 'phone', 'persona', 'flow', 'knowledge', 'recording', 'outbound', 'test', 'live'] as const
const CHAT_CHANNELS: ChannelKind[] = ['whatsapp', 'webchat', 'email']
const ESCALATE = ['anger', 'legal', 'medical', 'refunds', 'human requested'] as const
const MONEY_TOOLS: EmployeeToolId[] = ['book', 'send_payment_link']
const TOOLS = EmployeeToolIdSchema.options
const TONES = ['formal', 'warm', 'friendly'] as const
const BUY_NUMBERS = [
  { id: 'los', e164: '+234 1 700 4401', city: 'Lagos', leadDays: 0 },
  { id: 'abj', e164: '+234 9 461 2200', city: 'Abuja', leadDays: 1 },
] as const
const VOICES = [
  { id: 'ng-warm-f', name: 'Amara', accent: 'Lagos English' },
  { id: 'ng-calm-f', name: 'Tola', accent: 'Nigerian English, slower' },
  { id: 'ng-bright-m', name: 'Kunle', accent: 'Pidgin-friendly' },
] as const

export function EmployeeWizard({ kind }: { kind: 'chat' | 'voice' }) {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const create = useCreateEmployee()
  const knowledge = useKnowledge()
  const connections = useConnections()
  const team = useTeam()
  const addFaq = useAddKnowledge()
  const [step, setStep] = useState(0)
  const [template, setTemplate] = useState(kind === 'voice' ? 'inbound' : 'receptionist')
  const [name, setName] = useState(kind === 'voice' ? 'Ada Voice' : 'Ada')
  const [tone, setTone] = useState<(typeof TONES)[number]>('warm')
  const [emoji, setEmoji] = useState(false)
  const [greeting, setGreeting] = useState('')
  const [channels, setChannels] = useState<ChannelKind[]>(['whatsapp', 'webchat', 'email'])
  const [hours, setHours] = useState<'business' | 'always'>('business')
  const [afterHours, setAfterHours] = useState<'message' | 'handoff' | 'voicemail'>('message')
  const [collectionIds, setCollectionIds] = useState<string[]>(['services', 'policies', 'faqs', 'locations'])
  const [neverSay, setNeverSay] = useState('')
  const [faqTitle, setFaqTitle] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')
  const [escalate, setEscalate] = useState<string[]>([...ESCALATE])
  const [tools, setTools] = useState<Employee['tools']>([])
  const [discount, setDiscount] = useState('')
  const [handoffUserId, setHandoffUserId] = useState(session.user.id)
  const [quietHours, setQuietHours] = useState(true)
  const [phoneSource, setPhoneSource] = useState<'buy' | 'forward' | 'port' | null>(null)
  const [buyId, setBuyId] = useState<(typeof BUY_NUMBERS)[number]['id']>('los')
  const [ownedNumber, setOwnedNumber] = useState('')
  const [idDoc, setIdDoc] = useState('')
  const [billDoc, setBillDoc] = useState('')
  const [addressDoc, setAddressDoc] = useState('')
  const [voiceId, setVoiceId] = useState('ng-warm-f')
  const [collectName, setCollectName] = useState(true)
  const [collectPhone, setCollectPhone] = useState(true)
  const [collectReason, setCollectReason] = useState(true)
  const [dtmf, setDtmf] = useState(true)
  const [transferNumber, setTransferNumber] = useState('')
  const [maxMinutes, setMaxMinutes] = useState('8')
  const [recordingEnabled, setRecordingEnabled] = useState(false)
  const [recordingNotice, setRecordingNotice] = useState('')
  const [retentionDays, setRetentionDays] = useState('30')
  const [pronunciation, setPronunciation] = useState('')
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [rollout, setRollout] = useState<'shadow' | 'suggest' | 'approve' | 'autopilot'>(kind === 'voice' ? 'shadow' : 'suggest')
  const patch = usePatchEmployee(employee?.id ?? '')
  const publish = usePublishEmployee(employee?.id ?? '')
  const sandbox = useSandbox(employee?.id ?? 'pending')
  const evals = useEvals(employee?.id)
  const compliance = useCompliance(employee?.id)
  const [chat, setChat] = useState('')
  const [messages, setMessages] = useState<{ id: string; role: 'user' | 'assistant'; text: string }[]>([])
  const ids = kind === 'chat' ? CHAT_STEPS : VOICE_STEPS
  const steps = ids.map((id, index) => ({
    id,
    label: t(`wizard.${kind}.${id}` as 'wizard.chat.template'),
    status: (index < step ? 'done' : index === step ? 'current' : 'todo') as 'done' | 'current' | 'todo',
  }))
  const market = session.account.market
  const location = session.locations[0]
  const packLangs = employee?.languages ?? [
    { code: 'en', tier: 'A' as const, autonomy: 'suggest' as const },
    { code: 'pcm', tier: 'B' as const, autonomy: 'suggest' as const },
    { code: 'yo', tier: 'C' as const, autonomy: 'suggest' as const },
  ]
  const blocked = packLangs.some((lang) => lang.tier === 'C') && rollout === 'autopilot'
  const outboundOff = market === 'NG' || market === 'UK' || market === 'EU'
  const cards = connections.data?.groups.flatMap((group) => group.cards) ?? []
  const currentId = ids[step]!
  const canGoLive = compliance.data?.canGoLive !== false
  const liveBlocked = Boolean(employee) && currentId === 'live' && (blocked || (rollout !== 'shadow' && !canGoLive))

  useEffect(() => {
    if (!employee) return
    setName(employee.name)
    setTone(employee.tone)
    setEmoji(employee.emoji)
    setGreeting(employee.greeting)
    setChannels(employee.channels)
    setHours(employee.hours)
    setAfterHours(employee.afterHours)
    setCollectionIds(employee.collectionIds)
    setNeverSay(employee.neverSay.join('\n'))
    setEscalate(employee.escalateTopics)
    setTools(employee.tools)
    setDiscount(employee.discountLimit == null ? '' : String(employee.discountLimit))
    setHandoffUserId(employee.handoffUserId ?? session.user.id)
    setQuietHours(employee.quietHours)
    setPhoneSource(employee.phoneSource)
    setOwnedNumber(employee.phoneNumber ?? '')
    setVoiceId(employee.voiceId ?? 'ng-warm-f')
    setTransferNumber(employee.transferNumber ?? '')
    setMaxMinutes(String(employee.maxCallMinutes))
    setRecordingEnabled(employee.recordingEnabled)
    setRecordingNotice(employee.recordingNotice)
    setPronunciation(employee.pronunciation)
  }, [employee, session.user.id])

  const saveStep = async () => {
    if (!employee) return
    if (currentId === 'persona') {
      setEmployee(
        await patch.mutateAsync({
          name: name.trim(),
          tone,
          emoji: kind === 'voice' ? false : emoji,
          greeting: greeting.trim() || employee.greeting,
          voiceId: kind === 'voice' ? voiceId : employee.voiceId,
          pronunciation: kind === 'voice' ? pronunciation : employee.pronunciation,
        }),
      )
    }
    if (currentId === 'phone') {
      const picked = BUY_NUMBERS.find((item) => item.id === buyId)
      const number = phoneSource === 'buy' ? (picked?.e164 ?? null) : ownedNumber.trim() || null
      const docsReady = Boolean(idDoc && billDoc && (phoneSource === 'forward' || addressDoc))
      const status =
        phoneSource === 'buy' && picked?.leadDays === 0
          ? 'active'
          : phoneSource === 'buy'
            ? 'provisioning'
            : phoneSource === 'port' && !docsReady
              ? 'docs_needed'
              : phoneSource === 'port'
                ? 'porting'
                : docsReady
                  ? 'provisioning'
                  : 'docs_needed'
      setEmployee(await patch.mutateAsync({ phoneSource, phoneNumber: number, phoneStatus: status }))
    }
    if (currentId === 'flow') {
      setEmployee(
        await patch.mutateAsync({
          transferNumber: transferNumber.trim() || null,
          maxCallMinutes: Math.max(1, Number(maxMinutes) || 8),
          afterHours: 'voicemail',
        }),
      )
    }
    if (currentId === 'recording') {
      const notice = recordingNotice.trim()
      setEmployee(await patch.mutateAsync({ recordingNotice: notice, recordingEnabled: recordingEnabled && Boolean(notice) }))
    }
    if (currentId === 'channels') {
      setEmployee(await patch.mutateAsync({ channels, hours, afterHours }))
    }
    if (currentId === 'knowledge') {
      setEmployee(
        await patch.mutateAsync({
          collectionIds,
          neverSay: neverSay
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          pronunciation: kind === 'voice' ? pronunciation : employee.pronunciation,
        }),
      )
    }
    if (currentId === 'skills' && tools.length) {
      setEmployee(await patch.mutateAsync({ tools }))
    }
    if (currentId === 'rules') {
      setEmployee(
        await patch.mutateAsync({
          escalateTopics: escalate,
          discountLimit: discount.trim() ? Number(discount) : null,
          handoffUserId,
          quietHours,
        }),
      )
    }
  }

  const goNext = async () => {
    if (step === 0 && !employee) {
      const created = await create.mutateAsync({ kind, template, name: name.trim() || (kind === 'voice' ? 'Ada Voice' : 'Ada') })
      setEmployee(created)
    } else if (employee && currentId !== 'test' && currentId !== 'review' && currentId !== 'live' && currentId !== 'template' && currentId !== 'use') {
      if (currentId === 'channels' && channels.length === 0) {
        toast.error(t('wizard.channelRequired'))
        return
      }
      if (currentId === 'phone') {
        if (!phoneSource) {
          toast.error(t('wizard.phoneRequired'))
          return
        }
        if (phoneSource !== 'buy' && ownedNumber.replace(/\D/g, '').length < 8) {
          toast.error(t('wizard.phoneNumberRequired'))
          return
        }
        if (phoneSource === 'port' && (!idDoc || !billDoc || !addressDoc)) {
          toast.error(t('wizard.portDocsRequired'))
          return
        }
        if (phoneSource === 'forward' && (!idDoc || !billDoc)) {
          toast.error(t('wizard.forwardDocsRequired'))
          return
        }
      }
      if (currentId === 'recording' && recordingEnabled && !recordingNotice.trim()) {
        toast.error(t('wizard.recordingNoticeRequired'))
        return
      }
      await saveStep()
    }
    if (step === ids.length - 1 && employee) {
      if (liveBlocked) return
      await publish.mutateAsync(rollout)
      toast.success(t('wizard.goLive'))
      await navigate({ to: '/app/ai/employees/$employeeId/$tab', params: { employeeId: employee.id, tab: 'overview' } })
      return
    }
    setStep((current) => Math.min(current + 1, ids.length - 1))
  }

  const sendSandbox = (message: string, scenario?: string) => {
    if (!employee || !message.trim()) return
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: message }])
    void sandbox.mutateAsync({ message, scenario }).then((reply) => {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: reply.text }])
    })
    setChat('')
  }

  const busy = create.isPending || patch.isPending || publish.isPending
  const hintKey = `wizard.hints.${kind}.${currentId}`

  return (
    <WizardLayout
      header={
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <Link to="/app/ai/employees" className="text-sm text-fg-muted">
            {kind === 'chat' ? t('wizard.chatTitle') : t('wizard.voiceTitle')}
          </Link>
        </div>
      }
      steps={steps}
      onSelectStep={(id) => setStep(ids.findIndex((item) => item === id))}
      current={step + 1}
      total={ids.length}
      title={t(`wizard.${kind}.${currentId}` as 'wizard.chat.template')}
      description={
        <>
          <p>{t('wizard.market', { country: market, timezone: location?.timezone ?? 'Africa/Lagos', currency: location?.currency ?? 'NGN' })}</p>
          <p className="mt-1">{t(hintKey, { defaultValue: '' })}</p>
        </>
      }
      footer={
        <>
          <Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep((current) => Math.max(0, current - 1))}>
            {t('wizard.back')}
          </Button>
          <Button className="ms-auto" onClick={() => void goNext()} disabled={busy || liveBlocked}>
            {currentId === 'live' ? t('wizard.goLive') : step === 0 ? t('wizard.create') : t('wizard.next')}
          </Button>
        </>
      }
    >
      {currentId === 'template' && (
        <div className="grid max-w-xl gap-2">
          {(['receptionist', 'sales', 'booking', 'support', 'custom'] as const).map((item) => (
            <button
              key={item}
              type="button"
              className={`rounded-md border p-3 text-start ${template === item ? 'border-brand bg-surface-2' : 'border-border hover:bg-surface-2'}`}
              onClick={() => setTemplate(item)}
            >
              <p className="font-medium">{t(`wizard.templates.${item}`)}</p>
              <p className="mt-1 text-sm text-fg-muted">{t(`wizard.templateHints.${item}`)}</p>
            </button>
          ))}
        </div>
      )}
      {currentId === 'use' && (
        <div className="grid max-w-xl gap-2">
          {(['inbound', 'after_hours', 'reminders', 'callback'] as const).map((item) => {
            const hidden = outboundOff && (item === 'reminders' || item === 'callback')
            if (hidden) return null
            return (
              <button
                key={item}
                type="button"
                className={`rounded-md border p-3 text-start ${template === item ? 'border-brand bg-surface-2' : 'border-border hover:bg-surface-2'}`}
                onClick={() => setTemplate(item)}
              >
                <p className="font-medium">{t(`wizard.voiceUse.${item}`)}</p>
                <p className="mt-1 text-sm text-fg-muted">{t(`wizard.voiceUseHints.${item}`)}</p>
              </button>
            )
          })}
          {outboundOff && <p className="text-sm text-fg-muted">{t('wizard.outboundHidden')}</p>}
        </div>
      )}
      {currentId === 'persona' && (
        <div className="max-w-md space-y-3">
          <p className="text-sm text-fg-muted">{t('persona.inherited', { country: market })}</p>
          <Label htmlFor="wiz-name">{t('persona.name')}</Label>
          <Input id="wiz-name" value={name} onChange={(event) => setName(event.target.value)} />
          <Label>{t('persona.tone')}</Label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((item) => (
              <Button key={item} size="sm" variant={tone === item ? 'secondary' : 'outline'} onClick={() => setTone(item)}>
                {t(`tones.${item}`)}
              </Button>
            ))}
          </div>
          {kind !== 'voice' && (
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={emoji} onCheckedChange={setEmoji} />
              {t('persona.emoji')}
            </label>
          )}
          {kind === 'voice' && (
            <div className="space-y-2">
              <Label>{t('wizard.voiceCatalog')}</Label>
              {VOICES.map((voice) => (
                <button
                  key={voice.id}
                  type="button"
                  className={`w-full rounded-md border p-3 text-start ${voiceId === voice.id ? 'border-brand bg-surface-2' : 'border-border hover:bg-surface-2'}`}
                  onClick={() => setVoiceId(voice.id)}
                >
                  <p className="font-medium">{voice.name}</p>
                  <p className="text-sm text-fg-muted">{voice.accent}</p>
                </button>
              ))}
              <Banner severity="attention">{t('wizard.cloneBlocked')}</Banner>
            </div>
          )}
          <Label htmlFor="wiz-greet">{t('persona.greeting')}</Label>
          <Textarea id="wiz-greet" value={greeting} onChange={(event) => setGreeting(event.target.value)} />
          <p className="text-sm">{t('persona.disclosure')}</p>
          <p className="rounded-md bg-surface-2 p-3 text-sm">{employee?.disclosure ?? t('wizard.disclosureAfterCreate')}</p>
          {kind === 'voice' && employee?.recordingNotice && (
            <p className="rounded-md bg-surface-2 p-3 text-sm">{t('wizard.spokenNotice')}: {employee.recordingNotice}</p>
          )}
          {packLangs.map((lang) => (
            <p key={lang.code} className="flex flex-wrap items-center gap-2 text-sm">
              {t(`common:languages.${lang.code}`, { defaultValue: lang.code })}
              <LanguageTierBadge tier={lang.tier} />
              <span className="text-fg-muted">{t('wizard.tierCap', { code: lang.code, tier: lang.tier, cap: TIER_AUTONOMY_CAP[lang.tier] })}</span>
            </p>
          ))}
        </div>
      )}
      {currentId === 'phone' && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-fg-muted">{t('wizard.phoneDocsNg')}</p>
          <div className="grid gap-2">
            {(['buy', 'forward', 'port'] as const).map((source) => (
              <button
                key={source}
                type="button"
                className={`rounded-md border p-3 text-start ${phoneSource === source ? 'border-brand bg-surface-2' : 'border-border hover:bg-surface-2'}`}
                onClick={() => setPhoneSource(source)}
              >
                <p className="font-medium">{t(`wizard.phone${source === 'buy' ? 'Buy' : source === 'forward' ? 'Forward' : 'Port'}`)}</p>
                <p className="mt-1 text-sm text-fg-muted">{t(`wizard.phoneHints.${source}`)}</p>
              </button>
            ))}
          </div>
          {phoneSource === 'buy' && (
            <ul className="space-y-2">
              {BUY_NUMBERS.map((item) => (
                <li key={item.id}>
                  <label className="flex items-start gap-2 rounded-md border border-border p-3 text-sm">
                    <input type="radio" name="buy-number" checked={buyId === item.id} onChange={() => setBuyId(item.id)} />
                    <span>
                      <span className="font-medium">{item.e164}</span>
                      <span className="block text-fg-muted">
                        {item.city} · {t('wizard.leadTime', { days: item.leadDays })}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {(phoneSource === 'forward' || phoneSource === 'port') && (
            <div className="space-y-3">
              <Label htmlFor="owned-number">{t('wizard.existingNumber')}</Label>
              <Input id="owned-number" value={ownedNumber} onChange={(event) => setOwnedNumber(event.target.value)} placeholder="+234 …" />
              <p className="text-sm text-fg-muted">{t(`wizard.phoneLead.${phoneSource}`)}</p>
              <div>
                <Label htmlFor="doc-id">{t('wizard.docId')}</Label>
                <Input id="doc-id" className="mt-1" type="file" accept="image/*,.pdf" onChange={(event) => setIdDoc(event.target.files?.[0]?.name ?? '')} />
                {idDoc && <p className="mt-1 text-xs text-fg-muted">{idDoc}</p>}
              </div>
              <div>
                <Label htmlFor="doc-bill">{t('wizard.docBill')}</Label>
                <Input id="doc-bill" className="mt-1" type="file" accept="image/*,.pdf" onChange={(event) => setBillDoc(event.target.files?.[0]?.name ?? '')} />
                {billDoc && <p className="mt-1 text-xs text-fg-muted">{billDoc}</p>}
              </div>
              {phoneSource === 'port' && (
                <div>
                  <Label htmlFor="doc-address">{t('wizard.docAddress')}</Label>
                  <Input id="doc-address" className="mt-1" type="file" accept="image/*,.pdf" onChange={(event) => setAddressDoc(event.target.files?.[0]?.name ?? '')} />
                  {addressDoc && <p className="mt-1 text-xs text-fg-muted">{addressDoc}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {currentId === 'flow' && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-fg-muted">{t('wizard.flowHint')}</p>
          <p className="text-sm font-medium">{t('wizard.collect')}</p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={collectName} onCheckedChange={(checked) => setCollectName(Boolean(checked))} />
            {t('wizard.collectName')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={collectPhone} onCheckedChange={(checked) => setCollectPhone(Boolean(checked))} />
            {t('wizard.collectPhone')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={collectReason} onCheckedChange={(checked) => setCollectReason(Boolean(checked))} />
            {t('wizard.collectReason')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={dtmf} onCheckedChange={setDtmf} />
            {t('wizard.dtmf')}
          </label>
          <Label htmlFor="transfer">{t('wizard.warmTransfer')}</Label>
          <Input id="transfer" value={transferNumber} onChange={(event) => setTransferNumber(event.target.value)} placeholder="+234 …" />
          <Label htmlFor="max-min">{t('wizard.maxMinutes')}</Label>
          <Input id="max-min" inputMode="numeric" value={maxMinutes} onChange={(event) => setMaxMinutes(event.target.value)} />
          <p className="text-sm text-fg-muted">{t('wizard.voicemailFallback')}</p>
        </div>
      )}
      {currentId === 'channels' && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm text-fg-muted">{t('wizard.whatsappWindow')}</p>
          <ul className="space-y-2">
            {CHAT_CHANNELS.map((channel) => {
              const card = cards.find((item) => item.kind === channel)
              const on = channels.includes(channel)
              const disconnected = card && card.status !== 'connected'
              return (
                <li key={channel} className="rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={on}
                      onCheckedChange={(checked) =>
                        setChannels((current) => (checked ? [...current, channel] : current.filter((item) => item !== channel)))
                      }
                    />
                    {t(`common:channels.${channel}`)}
                  </label>
                  {disconnected && (
                    <Banner className="mt-2" severity="attention">
                      {t('wizard.channelOff', { channel: t(`common:channels.${channel}`) })}{' '}
                      <Link to="/app/connections" className="underline">
                        {t('wizard.openConnections')}
                      </Link>
                    </Banner>
                  )}
                </li>
              )
            })}
          </ul>
          <Label>{t('channels.hours')}</Label>
          <Select value={hours} onValueChange={(value) => setHours(value as 'business' | 'always')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="business">{t('channels.business')}</SelectItem>
              <SelectItem value="always">{t('channels.always')}</SelectItem>
            </SelectContent>
          </Select>
          <Label>{t('channels.after')}</Label>
          <Select value={afterHours} onValueChange={(value) => setAfterHours(value as 'message' | 'handoff' | 'voicemail')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="message">{t('channels.message')}</SelectItem>
              <SelectItem value="handoff">{t('channels.handoff')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {currentId === 'knowledge' && (
        <div className="max-w-xl space-y-4">
          <ul className="space-y-2">
            {KnowledgeCollectionIdSchema.options.map((id) => {
              const col = knowledge.data?.collections.find((item) => item.id === id)
              return (
                <li key={id} className="rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Checkbox
                      checked={collectionIds.includes(id)}
                      onCheckedChange={(checked) =>
                        setCollectionIds((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))
                      }
                    />
                    {t(`collections.${id}`)}
                  </label>
                  {col && (
                    <p className="mt-1 text-sm text-fg-muted">
                      {t('knowledgePage.coverage', { percent: col.coverage })}
                      {col.missing.length ? ` · ${t('knowledgePage.missing')}: ${col.missing.join(', ')}` : ''}
                    </p>
                  )}
                  <Link className="mt-1 inline-block text-sm text-brand hover:underline" to="/app/ai/knowledge/$collection" params={{ collection: id }}>
                    {t('wizard.openCollection')}
                  </Link>
                </li>
              )
            })}
          </ul>
          <div className="space-y-2">
            <Label>{t('wizard.extraFaq')}</Label>
            <Input value={faqTitle} onChange={(event) => setFaqTitle(event.target.value)} aria-label={t('knowledgePage.itemTitle')} />
            <Textarea value={faqAnswer} onChange={(event) => setFaqAnswer(event.target.value)} aria-label={t('knowledgePage.itemAnswer')} />
            <Button
              size="sm"
              variant="outline"
              disabled={faqTitle.trim().length < 2 || faqAnswer.trim().length < 2 || addFaq.isPending}
              onClick={() =>
                void addFaq.mutateAsync({ collection: 'faqs', title: faqTitle.trim(), answer: faqAnswer.trim() }).then(() => {
                  setFaqTitle('')
                  setFaqAnswer('')
                  toast.success(t('knowledgePage.add'))
                })
              }
            >
              {t('wizard.addFaq')}
            </Button>
          </div>
          <Label htmlFor="never-say">{t('rules.neverSay')}</Label>
          <Textarea id="never-say" value={neverSay} onChange={(event) => setNeverSay(event.target.value)} placeholder={t('wizard.neverSayHint')} />
          {kind === 'voice' && (
            <div>
              <Label htmlFor="pronounce">{t('wizard.pronunciation')}</Label>
              <Textarea
                id="pronounce"
                className="mt-1"
                value={pronunciation}
                onChange={(event) => setPronunciation(event.target.value)}
                placeholder={t('wizard.pronunciationHint')}
              />
              <p className="mt-1 text-sm text-fg-muted">{t('wizard.speechShort')}</p>
            </div>
          )}
        </div>
      )}
      {currentId === 'skills' && (
        <div className="max-w-xl space-y-3">
          <p className="text-sm text-fg-muted">{t('wizard.moneyDefault')}</p>
          {(tools.length ? tools : TOOLS.map((id) => ({ id, enabled: true, autonomy: (MONEY_TOOLS.includes(id) ? 'approve' : 'suggest') as AutonomyLevel }))).map(
            (tool) => (
              <div key={tool.id} className="rounded-md border border-border p-3">
                <label className="flex items-center gap-2 font-medium">
                  <Switch
                    checked={tool.enabled}
                    onCheckedChange={(enabled) =>
                      setTools((current) => current.map((item) => (item.id === tool.id ? { ...item, enabled } : item)))
                    }
                  />
                  {t(`tools.${tool.id}`)}
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(['suggest', 'approve', 'autopilot'] as const).map((level) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={tool.autonomy === level ? 'secondary' : 'ghost'}
                      onClick={() =>
                        setTools((current) => current.map((item) => (item.id === tool.id ? { ...item, autonomy: level } : item)))
                      }
                    >
                      <AutonomyChip level={level} />
                    </Button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
      {currentId === 'rules' && (
        <div className="max-w-xl space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium">{t('rules.escalate')}</p>
            <ul className="space-y-2">
              {ESCALATE.map((topic) => (
                <li key={topic}>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={escalate.includes(topic)}
                      onCheckedChange={(checked) =>
                        setEscalate((current) => (checked ? [...current, topic] : current.filter((item) => item !== topic)))
                      }
                    />
                    {t(`wizard.escalate.${topic === 'human requested' ? 'human' : topic}`)}
                  </label>
                </li>
              ))}
            </ul>
          </div>
          <Label htmlFor="discount">{t('rules.discount')}</Label>
          <Input id="discount" inputMode="numeric" value={discount} onChange={(event) => setDiscount(event.target.value)} placeholder={t('wizard.noDiscount')} />
          <Label>{t('wizard.handoff')}</Label>
          <Select value={handoffUserId} onValueChange={setHandoffUserId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(team.data ?? [{ userId: session.user.id, name: session.user.name }]).map((member) => (
                <SelectItem key={member.userId} value={member.userId}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={quietHours} onCheckedChange={setQuietHours} />
            {t('rules.quiet')}
          </label>
        </div>
      )}
      {currentId === 'recording' && (
        <div className="max-w-xl space-y-3">
          <p className="text-sm text-fg-muted">{t('wizard.recordingHint')}</p>
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={recordingEnabled}
              onCheckedChange={(on) => {
                if (on && !recordingNotice.trim()) {
                  toast.error(t('wizard.recordingNoticeRequired'))
                  return
                }
                setRecordingEnabled(on)
              }}
            />
            {t('wizard.recordCalls')}
          </label>
          <Label htmlFor="rec-notice">{t('wizard.recordingNotice')}</Label>
          <Textarea id="rec-notice" value={recordingNotice} onChange={(event) => setRecordingNotice(event.target.value)} />
          <Label>{t('wizard.retention')}</Label>
          <Select value={retentionDays} onValueChange={setRetentionDays}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('wizard.retentionDays', { days: 7 })}</SelectItem>
              <SelectItem value="30">{t('wizard.retentionDays', { days: 30 })}</SelectItem>
              <SelectItem value="90">{t('wizard.retentionDays', { days: 90 })}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-fg-muted">{t('wizard.recordingRedact')}</p>
        </div>
      )}
      {currentId === 'outbound' && (
        <div className="max-w-xl space-y-3">
          <Banner>{t('wizard.outboundHidden')}</Banner>
          <p className="text-sm text-fg-muted">{t('wizard.outboundPreview')}</p>
          <ul className="list-disc space-y-1 ps-5 text-sm text-fg-muted">
            <li>{t('wizard.outboundConsent')}</li>
            <li>{t('wizard.outboundHours')}</li>
            <li>{t('wizard.outboundDnc')}</li>
            <li>{t('wizard.outboundOptOut')}</li>
          </ul>
        </div>
      )}
      {currentId === 'test' && employee && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm text-fg-muted">{kind === 'voice' ? t('wizard.voiceTestHint') : t('wizard.testHint')}</p>
            <SandboxChat
              messages={messages}
              value={chat}
              onChange={setChat}
              onSend={() => sendSandbox(chat)}
              placeholder={t('test.placeholder')}
              sendLabel={t('test.send')}
            />
            {sandbox.data && (
              <WhyPopover sources={sandbox.data.why.sources} rules={sandbox.data.why.rules} tools={sandbox.data.why.tools} />
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(['price', 'injection', 'general', 'handoff', 'closed_day'] as const).map((scenario) => (
                <Button key={scenario} size="sm" variant="outline" onClick={() => sendSandbox(t(`test.${scenario}`), scenario)}>
                  {t(`test.${scenario}`)}
                </Button>
              ))}
            </div>
            {kind === 'voice' && <p className="mt-2 text-xs text-fg-muted">{t('wizard.voiceLatency')}</p>}
          </div>
          <EvalResultsTable
            rows={(evals.data ?? []).map((row) => ({ id: row.id, language: row.language, suite: row.suite, passed: row.passed, score: row.score }))}
            languageLabel={t('persona.languages')}
            suiteLabel={t('test.scenarios')}
            resultLabel={t('compliance.pass')}
          />
        </div>
      )}
      {(currentId === 'review' || (kind === 'voice' && currentId === 'live')) && employee && (
        <div className="max-w-xl space-y-4">
          <p className="text-sm">
            {employee.name} · {t(`tones.${employee.tone}`)} · {employee.channels.map((channel) => t(`common:channels.${channel}`)).join(', ')}
          </p>
          {employee.kind === 'voice' && (
            <p className="text-sm text-fg-muted">
              {employee.phoneNumber ?? t('wizard.noNumber')} · {t(`wizard.phoneStatus.${employee.phoneStatus}`)}
              {employee.phoneSource ? ` · ${t(`wizard.phoneHints.${employee.phoneSource}`)}` : ''}
            </p>
          )}
          <p className="text-sm text-fg-muted">
            {employee.tools.filter((tool) => tool.enabled).map((tool) => `${t(`tools.${tool.id}`)} (${tool.autonomy})`).join(' · ')}
          </p>
          <p className="text-sm text-fg-muted">
            {t('rules.escalate')}: {employee.escalateTopics.join(', ') || '—'}
          </p>
          <ul className="space-y-2">
            {(compliance.data?.items ?? []).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
                <span>{t(`compliance.${item.id}`)}</span>
                <span className={item.ok ? 'text-success' : 'text-danger'}>{item.ok ? t('compliance.pass') : t('compliance.fail')}</span>
              </li>
            ))}
          </ul>
          {!canGoLive && <Banner severity="danger">{t('wizard.complianceBlock')}</Banner>}
        </div>
      )}
      {currentId === 'live' && (
        <div className="max-w-xl space-y-3">
          {blocked && <Banner severity="danger">{t('wizard.blockedAutopilot')}</Banner>}
          <Label>{t('wizard.rollout')}</Label>
          <p className="text-sm text-fg-muted">{kind === 'voice' ? t('wizard.voiceRolloutHint') : t('wizard.rolloutHint')}</p>
          <div className="flex flex-wrap gap-2">
            {(['shadow', 'suggest', 'approve', 'autopilot'] as const).map((item) => (
              <Button key={item} variant={rollout === item ? 'secondary' : 'outline'} onClick={() => setRollout(item)}>
                {t(`wizard.${item}`)}
              </Button>
            ))}
          </div>
        </div>
      )}
    </WizardLayout>
  )
}
