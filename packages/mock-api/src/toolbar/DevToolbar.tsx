import { Download, RotateCcw, Save, Upload, Wrench } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LANGUAGES, setLanguage, useTranslation, type Language } from '@deskhand/i18n'
import {
  ADMIN_PERSONAS,
  AccountStateSchema,
  AiModeSchema,
  ROLES,
  type AccountState,
  type AdminPersona,
  type AiMode,
  type Role,
} from '@deskhand/schemas'
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  toast,
  usePreferences,
  type Density,
  type Theme,
} from '@deskhand/ui'
import { DAY, HOUR } from '../clock'
import { useDevSettings, type NetworkMode } from '../dev-settings'
import { SCENARIO_IDS, SCENARIOS, type ScenarioId } from '../scenarios'
import { listSnapshots, loadSnapshot, resetScenario, saveSnapshot, storageEstimate } from '../store'
import { onChange } from '../sync'
import {
  approveWhatsAppTemplates,
  simulateInboundNow,
  simulatePaymentNow,
  simulateReviewNow,
  simulateTemplatesNow,
  exportScenario,
  importScenario,
  patchAccount,
  setClockOffset,
  setImpersonating,
  setNetwork,
  switchPersona,
  switchRole,
  switchScenario,
  useMockAccount,
} from './actions'

type Variant = 'tenant' | 'admin' | 'public'

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-3">
      <Label htmlFor={id} className="text-[13px] text-fg-muted">
        {label}
      </Label>
      {children}
    </div>
  )
}

function Choice<T extends string>({
  id,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)} disabled={disabled}>
      <SelectTrigger id={id} className="h-9">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const CLOCK_OPTIONS = [0, HOUR, DAY, 7 * DAY]

/** Floating dev toolbar (FE-DOC 8.3). Apps render it only in development or demo builds. */
export function DevToolbar({ variant }: { variant: Variant }) {
  const { t, i18n } = useTranslation('devtools')
  const [open, setOpen] = useState(false)
  const settings = useDevSettings()
  const theme = usePreferences((s) => s.theme)
  const density = usePreferences((s) => s.density)
  const setTheme = usePreferences((s) => s.setTheme)
  const setDensity = usePreferences((s) => s.setDensity)
  const account = useMockAccount()
  const [snapshots, setSnapshots] = useState<{ id: string; name: string }[]>([])
  const [snapshotName, setSnapshotName] = useState('')
  const [storage, setStorage] = useState<{ usedMb: number; quotaMb: number } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    void listSnapshots(settings.scenario).then((items) => setSnapshots(items.map(({ id, name }) => ({ id, name }))))
    void storageEstimate().then(setStorage)
  }, [open, settings.scenario])

  useEffect(
    () =>
      onChange((event) => {
        if (event.topics.includes('storage-full')) toast.error(t('storageFull'))
      }),
    [t],
  )

  const run = async (task: () => Promise<unknown>, done: string) => {
    try {
      await task()
      toast.success(done)
    } catch {
      toast.error(t('actionFailed'))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('open')}
        title={t('open')}
        className="fixed bottom-3 start-3 z-40 flex size-10 items-center justify-center rounded-full border border-border bg-surface text-fg-muted shadow-md transition-colors hover:text-fg max-md:bottom-20"
      >
        <Wrench className="size-4" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent side="start" className="w-[min(24rem,95vw)] gap-0 overflow-y-auto p-0">
          <DrawerHeader className="border-b border-border p-4">
            <DrawerTitle className="text-base">{t('title')}</DrawerTitle>
            <DrawerDescription>{t('description')}</DrawerDescription>
          </DrawerHeader>

          <section className="flex flex-col gap-3 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('sections.who')}</h3>
            {variant !== 'admin' && (
              <Field label={t('scenario')} id="dt-scenario">
                <Choice<ScenarioId>
                  id="dt-scenario"
                  value={settings.scenario}
                  onChange={(value) => void switchScenario(value)}
                  options={SCENARIO_IDS.map((id) => ({
                    value: id,
                    label: `${id}. ${SCENARIOS[id].business}`,
                    disabled: !SCENARIOS[id].available,
                  }))}
                />
              </Field>
            )}
            {variant === 'tenant' && (
              <Field label={t('role')} id="dt-role">
                <Choice<Role>
                  id="dt-role"
                  value={settings.role}
                  onChange={switchRole}
                  options={ROLES.map((role) => ({ value: role, label: t(`common:roles.${role}`) }))}
                />
              </Field>
            )}
            {variant === 'admin' && (
              <>
                <Field label={t('persona')} id="dt-persona">
                  <Choice<AdminPersona>
                    id="dt-persona"
                    value={settings.adminPersona}
                    onChange={switchPersona}
                    options={ADMIN_PERSONAS.map((p) => ({ value: p, label: t(`admin:personas.${p}`) }))}
                  />
                </Field>
                <Field label={t('impersonating')} id="dt-imp">
                  <Switch id="dt-imp" checked={settings.impersonating} onCheckedChange={setImpersonating} />
                </Field>
              </>
            )}
          </section>

          <Separator />

          <section className="flex flex-col gap-3 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('sections.display')}</h3>
            <Field label={t('language')} id="dt-lang">
              <Choice<Language>
                id="dt-lang"
                value={(i18n.language as Language) ?? 'en'}
                onChange={setLanguage}
                options={LANGUAGES.map((lang) => ({ value: lang, label: t(`languages.${lang}`) }))}
              />
            </Field>
            <Field label={t('theme')} id="dt-theme">
              <Choice<Theme>
                id="dt-theme"
                value={theme}
                onChange={setTheme}
                options={(['light', 'dark', 'system'] as const).map((v) => ({ value: v, label: t(`common:account.themes.${v}`) }))}
              />
            </Field>
            <Field label={t('density')} id="dt-density">
              <Choice<Density>
                id="dt-density"
                value={density}
                onChange={setDensity}
                options={(['comfortable', 'compact'] as const).map((v) => ({ value: v, label: t(`common:account.densities.${v}`) }))}
              />
            </Field>
          </section>

          <Separator />

          <section className="flex flex-col gap-3 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('sections.conditions')}</h3>
            <Field label={t('network')} id="dt-network">
              <Choice<NetworkMode>
                id="dt-network"
                value={settings.network}
                onChange={setNetwork}
                options={(['fast', 'slow', 'offline', 'failing'] as const).map((v) => ({ value: v, label: t(`networks.${v}`) }))}
              />
            </Field>
            {variant === 'tenant' && account && (
              <>
                <Field label={t('accountState')} id="dt-state">
                  <Choice<AccountState>
                    id="dt-state"
                    value={account.state}
                    onChange={(state) => void patchAccount({ state })}
                    options={AccountStateSchema.options.map((v) => ({ value: v, label: t(`common:status.account.${v}`) }))}
                  />
                </Field>
                <Field label={t('aiMode')} id="dt-ai">
                  <Choice<AiMode>
                    id="dt-ai"
                    value={account.aiMode}
                    onChange={(aiMode) => void patchAccount({ aiMode })}
                    options={AiModeSchema.options.map((v) => ({ value: v, label: t(`common:ai.status.${v}`) }))}
                  />
                </Field>
              </>
            )}
            <Field label={t('clock')} id="dt-clock">
              <Choice<string>
                id="dt-clock"
                value={String(settings.clockOffsetMs)}
                onChange={(value) => setClockOffset(Number(value))}
                options={CLOCK_OPTIONS.map((ms) => ({ value: String(ms), label: t(`clocks.${ms / HOUR}`) }))}
              />
            </Field>
          </section>

          {variant !== 'admin' && (
            <>
              <Separator />
              <section className="flex flex-col gap-3 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{t('sections.data')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void run(() => resetScenario(), t('resetDone'))}
                  >
                    <RotateCcw />
                    {t('reset')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void run(approveWhatsAppTemplates, t('approveTemplatesDone'))}
                  >
                    {t('approveTemplates')}
                  </Button>
                  {variant === 'tenant' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="col-span-2"
                      onClick={() => void run(simulateInboundNow, t('inboundDone'))}
                    >
                      {t('inbound')}
                    </Button>
                  )}
                  {variant === 'tenant' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => void run(simulateReviewNow, t('reviewDone'))}>
                        {t('review')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void run(simulatePaymentNow, t('paymentDone'))}>
                        {t('payment')}
                      </Button>
                      <Button variant="outline" size="sm" className="col-span-2" onClick={() => void run(simulateTemplatesNow, t('templateReviewDone'))}>
                        {t('templateReview')}
                      </Button>
                    </>
                  )}
                  <Button variant="outline" size="sm" onClick={() => void run(exportScenario, t('exportDone'))}>
                    <Download />
                    {t('export')}
                  </Button>
                  <Button variant="outline" size="sm" className="col-span-2" onClick={() => fileInput.current?.click()}>
                    <Upload />
                    {t('import')}
                  </Button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void run(() => importScenario(file), t('importDone'))
                      event.target.value = ''
                    }}
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    value={snapshotName}
                    onChange={(event) => setSnapshotName(event.target.value)}
                    placeholder={t('snapshotName')}
                    aria-label={t('snapshotName')}
                    className="h-8"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!snapshotName.trim()}
                    onClick={() =>
                      void run(async () => {
                        await saveSnapshot(snapshotName.trim())
                        setSnapshotName('')
                        const items = await listSnapshots(settings.scenario)
                        setSnapshots(items.map(({ id, name }) => ({ id, name })))
                      }, t('snapshotSaved'))
                    }
                  >
                    <Save />
                    {t('save')}
                  </Button>
                </div>
                {snapshots.length > 0 && (
                  <Select onValueChange={(id) => void run(() => loadSnapshot(id), t('snapshotLoaded'))}>
                    <SelectTrigger className="h-9" aria-label={t('loadSnapshot')}>
                      <SelectValue placeholder={t('loadSnapshot')} />
                    </SelectTrigger>
                    <SelectContent>
                      {snapshots.map((snapshot) => (
                        <SelectItem key={snapshot.id} value={snapshot.id}>
                          {snapshot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {storage && (
                  <p className="tabular text-xs text-fg-muted">
                    {t('storage', { used: storage.usedMb.toFixed(1), quota: Math.round(storage.quotaMb) })}
                  </p>
                )}
              </section>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  )
}
