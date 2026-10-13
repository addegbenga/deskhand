import { Globe, PackageCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getIndustryPack, getMarketPack } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { IndustrySchema, ToneSchema, type BusinessProfile, type DayHours, type ImportResult } from '@deskhand/schemas'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ChoiceCard,
  ChoiceCards,
  Combobox,
  FieldError,
  FieldHint,
  Input,
  Label,
  Switch,
  Textarea,
  TimePicker,
} from '@deskhand/ui'
import { isApiError } from '../../../api/client'
import { useImportLink } from '../../../api/onboarding'
import { Section, StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

type Imported = Pick<ImportResult['found'], 'services' | 'faqs'>

function dayName(day: number, locale: string) {
  // 2023-01-01 was a Sunday, matching day 0.
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2023, 0, 1 + day)))
}

export function HoursEditor({ hours, onChange, locale, weekStartsOn }: { hours: DayHours[]; onChange: (hours: DayHours[]) => void; locale: string; weekStartsOn: number }) {
  const { t } = useTranslation('onboarding')
  const ordered = [...hours].sort((a, b) => ((a.day - weekStartsOn + 7) % 7) - ((b.day - weekStartsOn + 7) % 7))
  const update = (day: number, patch: Partial<DayHours>) => onChange(hours.map((h) => (h.day === day ? { ...h, ...patch } : h)))
  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
      {ordered.map((h) => {
        const name = dayName(h.day, locale)
        return (
          <div key={h.day} className="flex flex-wrap items-center gap-3 px-3 py-2">
            <label className="flex w-36 items-center gap-3 text-sm">
              <Switch checked={h.open} onCheckedChange={(open) => update(h.day, { open })} aria-label={t('profile.openOn', { day: name })} />
              {name}
            </label>
            {h.open ? (
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <TimePicker value={h.from} onChange={(from) => update(h.day, { from })} locale={locale} placeholder={t('profile.opens')} />
                </div>
                <span className="text-fg-muted" aria-hidden>
                  –
                </span>
                <div className="w-32">
                  <TimePicker value={h.to} onChange={(to) => update(h.day, { to })} locale={locale} placeholder={t('profile.closes')} />
                </div>
              </div>
            ) : (
              <span className="text-sm text-fg-muted">{t('profile.closed')}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Step 2 (PRD 6.1): a link fills most of this in; the industry picks the starter pack. */
export function ProfileStep({ view, session }: StepProps) {
  const { t, i18n } = useTranslation('onboarding')
  const actions = useStepActions('profile')
  const importer = useImportLink()
  const market = getMarketPack(session.account.market)
  const locale = session.locations[0]?.locale ?? market.locale
  const [profile, setProfile] = useState<BusinessProfile>(view.state.profile)
  const [link, setLink] = useState(view.state.profile.link)
  const [found, setFound] = useState<ImportResult | null>(null)
  const [imported, setImported] = useState<Imported | null>(null)
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => setProfile((p) => ({ ...p, [key]: value }))
  const industries = useMemo(() => IndustrySchema.options.map((value) => ({ value, label: t(`industries.${value}`) })), [t])
  const languageName = useMemo(() => new Intl.DisplayNames([i18n.language], { type: 'language' }), [i18n.language])
  const pack = getIndustryPack(profile.industry)
  const nameOk = profile.name.trim().length >= 2
  const cityOk = profile.city.trim().length >= 2
  const valid = nameOk && cityOk && profile.languages.length > 0
  const payload = () => ({ ...profile, link: link.trim(), imported: imported ?? undefined })
  const importCode = isApiError(importer.error) ? importer.error.fieldErrors?.url?.[0] : undefined
  const importError = !importer.error ? null : importCode === 'unreachable' || importCode === 'invalid_link' ? importCode : 'generic'

  const applyFound = (result: ImportResult) => {
    const f = result.found
    setProfile((p) => ({
      ...p,
      name: f.name ?? p.name,
      description: f.description ?? p.description,
      descriptionSource: f.description ? 'import' : p.descriptionSource,
      address: f.address ?? p.address,
      city: f.city ?? p.city,
      phone: f.phone ?? p.phone,
      hours: f.hours ?? p.hours,
      tone: f.tone ?? p.tone,
      industry: result.suggestedIndustry,
    }))
    setImported({ services: f.services, faqs: f.faqs })
    setFound(null)
  }

  return (
    <StepFrame
      view={view}
      step="profile"
      title={t('steps.profile.title')}
      description={t('steps.profile.body')}
      onSave={() => (valid ? actions.save(payload()) : Promise.resolve())}
      primary={{
        label: t('frame.continue'),
        pending: actions.pending,
        onClick: () => {
          setTouched(true)
          if (valid) actions.complete(payload())
        },
      }}
      aside={
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="size-4 text-brand" aria-hidden />
            {t('profile.pack.title', { industry: t(`industries.${profile.industry}`) })}
          </p>
          <p className="mt-2 text-[13px] text-fg-muted">{t('profile.pack.body', { services: pack.services.length, faqs: pack.faqs.length })}</p>
          <ul className="mt-3 flex flex-col gap-1 text-[13px]">
            {pack.services.slice(0, 5).map((s) => (
              <li key={s.name} className="truncate">
                {s.name}
              </li>
            ))}
          </ul>
          {imported && (
            <p className="mt-3 border-t border-border pt-3 text-[13px] text-fg-muted">
              {t('profile.pack.imported', { services: imported.services.length, faqs: imported.faqs.length })}
            </p>
          )}
        </Card>
      }
    >
      <Section title={t('profile.import.title')} description={t('profile.import.body')}>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (link.trim().length >= 3) importer.mutate(link.trim(), { onSuccess: setFound })
          }}
        >
          <div className="relative flex-1">
            <Globe className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" aria-hidden />
            <Input
              dir="ltr"
              aria-label={t('profile.import.label')}
              placeholder={t('profile.import.placeholder')}
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="ps-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={link.trim().length < 3 || importer.isPending}>
            <Sparkles />
            {importer.isPending ? t('profile.import.reading') : t('profile.import.cta')}
          </Button>
        </form>
        {importError && (
          <p role="alert" className="mt-3 flex gap-2 text-[13px] text-attention">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t(`profile.import.errors.${importError}`)}
          </p>
        )}
        {found && (
          <Card className="mt-4 border-brand/40 p-4">
            <p className="text-sm font-semibold">{t(`profile.import.found.${found.source}`)}</p>
            <ul className="mt-2 grid gap-1 text-[13px] text-fg-muted sm:grid-cols-2">
              {found.found.name && <li>{t('profile.import.foundName', { name: found.found.name })}</li>}
              <li>{t('profile.import.foundIndustry', { industry: t(`industries.${found.suggestedIndustry}`) })}</li>
              <li>{t('profile.import.foundServices', { count: found.found.services.length })}</li>
              <li>{t('profile.import.foundFaqs', { count: found.found.faqs.length })}</li>
              {found.found.hours && <li>{t('profile.import.foundHours')}</li>}
              {found.found.address && <li>{t('profile.import.foundAddress')}</li>}
            </ul>
            <p className="mt-2 text-[13px] text-fg-muted">{t('profile.import.confirmLater')}</p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => applyFound(found)}>
                {t('profile.import.use')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFound(null)}>
                {t('profile.import.ignore')}
              </Button>
            </div>
          </Card>
        )}
      </Section>

      <Section title={t('profile.details')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-name">{t('profile.name')}</Label>
            <Input id="pf-name" value={profile.name} onChange={(e) => set('name', e.target.value)} aria-invalid={(touched && !nameOk) || undefined} />
            {touched && !nameOk && <FieldError>{t('errors.required')}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-industry">{t('profile.industry')}</Label>
            <Combobox
              id="pf-industry"
              options={industries}
              value={profile.industry}
              onChange={(value) => set('industry', value as BusinessProfile['industry'])}
              placeholder={t('profile.industry')}
              searchPlaceholder={t('profile.searchIndustry')}
              emptyText={t('profile.noIndustry')}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="pf-description" className="flex items-center gap-2">
              {t('profile.description')}
              {profile.descriptionSource === 'import' && <Badge tone="info">{t('sources.import')}</Badge>}
            </Label>
            <Textarea
              id="pf-description"
              rows={3}
              value={profile.description}
              placeholder={t('profile.descriptionPlaceholder')}
              onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value, descriptionSource: 'owner' }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-address">{t('profile.address')}</Label>
            <Input id="pf-address" autoComplete="street-address" value={profile.address} onChange={(e) => set('address', e.target.value)} />
            <FieldHint>{t('profile.addressHint')}</FieldHint>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-city">{t('profile.city')}</Label>
            <Input id="pf-city" value={profile.city} onChange={(e) => set('city', e.target.value)} aria-invalid={(touched && !cityOk) || undefined} />
            {touched && !cityOk && <FieldError>{t('errors.required')}</FieldError>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pf-phone">{t('profile.phone')}</Label>
            <Input id="pf-phone" dir="ltr" type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title={t('profile.hours')} description={t('profile.hoursBody')}>
        <HoursEditor hours={profile.hours} onChange={(hours) => set('hours', hours)} locale={locale} weekStartsOn={market.weekStartsOn} />
      </Section>

      <Section title={t('profile.languages')} description={t('profile.languagesBody')}>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {market.conversationLanguages.map(({ code, tier }) => (
            <label key={code} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={profile.languages.includes(code)}
                onCheckedChange={(v) => set('languages', v === true ? [...profile.languages, code] : profile.languages.filter((l) => l !== code))}
              />
              {languageName.of(code) ?? code}
              {tier !== 'A' && <Badge tone="neutral">{t(`profile.tier.${tier}`)}</Badge>}
            </label>
          ))}
        </div>
        {touched && profile.languages.length === 0 && <FieldError className="mt-2">{t('errors.language')}</FieldError>}
      </Section>

      <Section title={t('profile.tone')} description={t('profile.toneBody')}>
        <ChoiceCards value={profile.tone} onValueChange={(v) => set('tone', v as BusinessProfile['tone'])} className="sm:grid-cols-3">
          {ToneSchema.options.map((tone) => (
            <ChoiceCard key={tone} value={tone} title={t(`tones.${tone}.name`)} description={t(`tones.${tone}.example`)} />
          ))}
        </ChoiceCards>
      </Section>
    </StepFrame>
  )
}
