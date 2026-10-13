import { Link } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { type FormField, type FormFieldType } from '@deskhand/schemas'
import {
  Badge,
  Button,
  cn,
  CopyField,
  ErrorState,
  FormPreview,
  Input,
  Label,
  QrPoster,
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
import { useForm, usePatchForm } from '../../api/grow'

const FIELD_TYPES = [
  'short_text',
  'long_text',
  'phone',
  'email',
  'number',
  'date',
  'dropdown',
  'multi_select',
  'checkbox',
  'yes_no',
  'rating',
  'nps',
  'csat',
  'consent',
] as const satisfies readonly FormFieldType[]

type Tab = 'builder' | 'settings' | 'share'

function origin() {
  return window.location.origin
}

function parseShowIf(value: string | null) {
  if (!value) return { field: '', expected: '' }
  const [field, ...rest] = value.split('=')
  return { field: field ?? '', expected: rest.join('=') }
}

export function FormBuilderPage({ formId }: { formId: string }) {
  const { t } = useTranslation('grow')
  const form = useForm(formId)
  const patch = usePatchForm(formId)
  const [tab, setTab] = useState<Tab>('builder')
  const [values, setValues] = useState<Record<string, string>>({})
  const [previewWide, setPreviewWide] = useState(false)
  const data = form.data

  const hosted = `${origin()}/f/${formId}`
  const embedSrc = `${origin()}/embed/form/${formId}`
  const scriptSrc = `${origin()}/embed/v1.js`
  const inlineScript = `<script src="${scriptSrc}" data-form="${formId}" data-mode="inline" async></script>`
  const popupScript = `<script src="${scriptSrc}" data-form="${formId}" data-mode="popup" data-label="Enquire" async></script>`
  const iframeSnippet = `<iframe src="${embedSrc}" title="${data?.name ?? 'Form'}" style="width:100%;min-height:560px;border:0"></iframe>`
  const waHref = `https://wa.me/?text=${encodeURIComponent(hosted + '?src=wa')}`

  if (form.isPending && !data) return <Skeleton className="h-40" />
  if (form.isError || !data) return <ErrorState onRetry={() => void form.refetch()} />

  const saveFields = (fields: FormField[]) => {
    void patch.mutateAsync({ fields })
  }

  const updateField = (id: string, next: Partial<FormField>) => {
    saveFields(data.fields.map((field) => (field.id === id ? { ...field, ...next } : field)))
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'builder', label: t('marketing.builderTab') },
    { id: 'settings', label: t('marketing.settingsTab') },
    { id: 'share', label: t('marketing.shareTab') },
  ]

  return (
    <div>
      <Link className="mb-3 inline-block text-sm text-brand" to="/app/marketing/forms" activeOptions={{ exact: true }}>
        {t('marketing.backForms')}
      </Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{data.name}</h2>
        <Badge tone={data.status === 'live' ? 'success' : 'neutral'}>{data.status === 'live' ? t('marketing.live') : t('marketing.draftStatus')}</Badge>
        <Link className="ms-auto text-sm text-brand" to="/app/marketing/forms/$formId/responses" params={{ formId }}>
          {t('marketing.responses')}
        </Link>
      </div>
      <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-border">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              '-mb-px inline-flex h-10 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium',
              tab === item.id ? 'border-brand text-fg' : 'border-transparent text-fg hover:bg-surface-2',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'builder' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label>{t('marketing.formName')}</Label>
            <Input
              className="mb-4 mt-1"
              defaultValue={data.name}
              onBlur={(event) => {
                const name = event.target.value.trim()
                if (name && name !== data.name) void patch.mutateAsync({ name })
              }}
            />
            <p className="mb-2 text-sm font-medium">{t('marketing.addField')}</p>
            <div className="mb-4 flex flex-wrap gap-2">
              {FIELD_TYPES.map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    saveFields([
                      ...data.fields,
                      {
                        id: `${type}_${Date.now()}`,
                        type,
                        label: t(`marketing.palette.${type}`),
                        required: type === 'consent',
                        options: type === 'dropdown' || type === 'multi_select' ? ['Option 1', 'Option 2'] : [],
                        showIf: null,
                        placeholder: '',
                        help: '',
                      },
                    ])
                  }
                >
                  {t(`marketing.palette.${type}`)}
                </Button>
              ))}
            </div>
            <ul className="space-y-3">
              {data.fields.map((field, index) => (
                <FieldEditor
                  key={field.id}
                  field={field}
                  fields={data.fields}
                  index={index}
                  onChange={(next) => updateField(field.id, next)}
                  onMove={(dir) => {
                    const next = [...data.fields]
                    const swap = index + dir
                    if (swap < 0 || swap >= next.length) return
                    ;[next[index], next[swap]] = [next[swap]!, next[index]!]
                    saveFields(next)
                  }}
                  onRemove={() => saveFields(data.fields.filter((item) => item.id !== field.id))}
                />
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.status !== 'live' ? (
                <Button onClick={() => void patch.mutateAsync({ status: 'live' }).then(() => toast.success(t('marketing.publishedForm')))}>
                  {t('marketing.live')}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => void patch.mutateAsync({ status: 'draft' }).then(() => toast.success(t('marketing.unpublished')))}
                >
                  {t('marketing.unpublish')}
                </Button>
              )}
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-medium">{t('marketing.preview')}</p>
              <div className="flex gap-1">
                <Button size="sm" variant={previewWide ? 'outline' : 'secondary'} onClick={() => setPreviewWide(false)}>
                  {t('marketing.previewPhone')}
                </Button>
                <Button size="sm" variant={previewWide ? 'secondary' : 'outline'} onClick={() => setPreviewWide(true)}>
                  {t('marketing.previewDesktop')}
                </Button>
              </div>
            </div>
            <div className={cn('rounded-md border border-border bg-surface p-4', previewWide ? 'max-w-none' : 'max-w-sm')}>
              <FormPreview fields={data.fields} values={values} onChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))} />
            </div>
          </div>
        </div>
      )}

      {tab === 'settings' && <FormSettings formId={formId} />}
      {tab === 'share' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">{t('marketing.scriptHint')}</p>
            <p className="text-sm text-fg-muted">{t('marketing.scriptConsent')}</p>
            <div>
              <Label>{t('marketing.hostedLink')}</Label>
              <CopyField className="mt-1" label={t('marketing.hostedLink')} value={hosted} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" asChild>
                  <a href={hosted} target="_blank" rel="noreferrer">
                    {t('marketing.openHosted')}
                  </a>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={embedSrc} target="_blank" rel="noreferrer">
                    {t('marketing.openEmbed')}
                  </a>
                </Button>
              </div>
            </div>
            <div>
              <Label>{t('marketing.scriptInline')}</Label>
              <CopyField className="mt-1" label={t('marketing.scriptInline')} value={inlineScript} multiline />
            </div>
            <div>
              <Label>{t('marketing.scriptPopup')}</Label>
              <CopyField className="mt-1" label={t('marketing.scriptPopup')} value={popupScript} multiline />
            </div>
            <div>
              <Label>{t('marketing.iframe')}</Label>
              <CopyField className="mt-1" label={t('marketing.iframe')} value={iframeSnippet} multiline />
            </div>
            <div>
              <Label>{t('marketing.whatsappShare')}</Label>
              <CopyField className="mt-1" label={t('marketing.whatsappShare')} value={waHref} />
            </div>
            <p className="text-xs text-fg-muted">{t('marketing.sourceHint')}</p>
          </div>
          <div>
            <p className="mb-2 font-medium">{t('marketing.qr')}</p>
            <QrPoster href={hosted} title={data.name} subtitle={t('marketing.hosted')} />
          </div>
        </div>
      )}
    </div>
  )
}

function FormSettings({ formId }: { formId: string }) {
  const { t } = useTranslation('grow')
  const form = useForm(formId)
  const patch = usePatchForm(formId)
  const data = form.data
  const [thankYou, setThankYou] = useState('')
  const [redirectUrl, setRedirectUrl] = useState('')
  const [origins, setOrigins] = useState('')

  useEffect(() => {
    if (!data) return
    setThankYou(data.thankYou)
    setRedirectUrl(data.redirectUrl ?? '')
    setOrigins(data.allowedOrigins.join('\n'))
  }, [data])

  if (!data) return <Skeleton className="h-32" />

  return (
    <form
      className="max-w-lg space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        void patch
          .mutateAsync({
            thankYou,
            redirectUrl: redirectUrl.trim() || null,
            allowedOrigins: origins
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean),
          })
          .then(() => toast.success(t('marketing.savedSettings')))
      }}
    >
      <div>
        <Label htmlFor="success">{t('marketing.success')}</Label>
        <Select
          value={data.successAction}
          onValueChange={(value) => void patch.mutateAsync({ successAction: value as typeof data.successAction })}
        >
          <SelectTrigger id="success" className="mt-1" aria-label={t('marketing.success')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message">{t('marketing.successMessage')}</SelectItem>
            <SelectItem value="redirect">{t('marketing.successRedirect')}</SelectItem>
            <SelectItem value="booking">{t('marketing.successBooking')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="thankYou">{t('marketing.thankYou')}</Label>
        <Textarea id="thankYou" className="mt-1" value={thankYou} onChange={(event) => setThankYou(event.target.value)} />
      </div>
      {data.successAction === 'redirect' && (
        <div>
          <Label htmlFor="redirect">{t('marketing.redirectUrl')}</Label>
          <Input id="redirect" className="mt-1" value={redirectUrl} onChange={(event) => setRedirectUrl(event.target.value)} />
        </div>
      )}
      <div>
        <Label htmlFor="origins">{t('marketing.origins')}</Label>
        <p className="mt-1 text-xs text-fg-muted">{t('marketing.originsHint')}</p>
        <Textarea id="origins" className="mt-1" value={origins} onChange={(event) => setOrigins(event.target.value)} rows={4} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={data.notifyStaff} onCheckedChange={(checked) => void patch.mutateAsync({ notifyStaff: checked })} />
        {t('marketing.notifyStaff')}
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={data.spamProtection} onCheckedChange={(checked) => void patch.mutateAsync({ spamProtection: checked })} />
        {t('marketing.spam')}
      </label>
      <Button type="submit">{t('marketing.saveSettings')}</Button>
    </form>
  )
}

function FieldEditor({
  field,
  fields,
  index,
  onChange,
  onMove,
  onRemove,
}: {
  field: FormField
  fields: FormField[]
  index: number
  onChange: (next: Partial<FormField>) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
}) {
  const { t } = useTranslation('grow')
  const showIf = parseShowIf(field.showIf)
  const others = useMemo(() => fields.filter((item) => item.id !== field.id), [fields, field.id])
  const needsOptions = field.type === 'dropdown' || field.type === 'multi_select'
  const [label, setLabel] = useState(field.label)
  const [placeholder, setPlaceholder] = useState(field.placeholder)
  const [help, setHelp] = useState(field.help)
  const [optionsText, setOptionsText] = useState(field.options.join('\n'))
  const [equals, setEquals] = useState(showIf.expected)

  useEffect(() => {
    setLabel(field.label)
    setPlaceholder(field.placeholder)
    setHelp(field.help)
    setOptionsText(field.options.join('\n'))
    setEquals(parseShowIf(field.showIf).expected)
  }, [field])

  const commit = () => {
    const next: Partial<FormField> = {}
    const trimmed = label.trim()
    if (trimmed && trimmed !== field.label) next.label = trimmed
    if (placeholder !== field.placeholder) next.placeholder = placeholder
    if (help !== field.help) next.help = help
    if (needsOptions) {
      const options = optionsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      if (options.join('\n') !== field.options.join('\n')) next.options = options
    }
    if (showIf.field && equals.trim() && equals.trim() !== showIf.expected) next.showIf = `${showIf.field}=${equals.trim()}`
    if (Object.keys(next).length) onChange(next)
  }

  return (
    <li className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-fg-muted">{t(`marketing.palette.${field.type}`)}</p>
          <Label htmlFor={`label-${field.id}`}>{t('marketing.fieldLabel')}</Label>
          <Input
            id={`label-${field.id}`}
            className="mt-1"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={commit}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <Button size="sm" variant="ghost" aria-label={t('marketing.moveUp')} disabled={index === 0} onClick={() => onMove(-1)}>
            <ChevronUp className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label={t('marketing.moveDown')} disabled={index === fields.length - 1} onClick={() => onMove(1)}>
            <ChevronDown className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" aria-label={t('marketing.removeField')} onClick={onRemove}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {field.type !== 'consent' && field.type !== 'checkbox' && field.type !== 'yes_no' && (
        <div>
          <Label htmlFor={`ph-${field.id}`}>{t('marketing.placeholder')}</Label>
          <Input
            id={`ph-${field.id}`}
            className="mt-1"
            value={placeholder}
            onChange={(event) => setPlaceholder(event.target.value)}
            onBlur={commit}
          />
        </div>
      )}
      <div>
        <Label htmlFor={`help-${field.id}`}>{t('marketing.help')}</Label>
        <Input
          id={`help-${field.id}`}
          className="mt-1"
          value={help}
          onChange={(event) => setHelp(event.target.value)}
          onBlur={commit}
        />
      </div>
      {needsOptions && (
        <div>
          <Label htmlFor={`opt-${field.id}`}>{t('marketing.options')}</Label>
          <Textarea
            id={`opt-${field.id}`}
            className="mt-1"
            value={optionsText}
            onChange={(event) => setOptionsText(event.target.value)}
            onBlur={commit}
          />
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={field.required} onCheckedChange={(required) => onChange({ required })} />
        {t('marketing.required')}
      </label>
      {others.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label>{t('marketing.showIfField')}</Label>
            <Select
              value={showIf.field || 'always'}
              onValueChange={(value) => onChange({ showIf: value === 'always' ? null : `${value}=${showIf.expected || 'Yes'}` })}
            >
              <SelectTrigger className="mt-1" aria-label={t('marketing.showIfField')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="always">{t('marketing.always')}</SelectItem>
                {others.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showIf.field ? (
            <div>
              <Label htmlFor={`eq-${field.id}`}>{t('marketing.showIfValue')}</Label>
              <Input
                id={`eq-${field.id}`}
                className="mt-1"
                value={equals}
                onChange={(event) => setEquals(event.target.value)}
                onBlur={commit}
              />
            </div>
          ) : null}
        </div>
      )}
      <Button size="sm" variant="outline" onClick={commit}>
        {t('marketing.saveField')}
      </Button>
    </li>
  )
}
