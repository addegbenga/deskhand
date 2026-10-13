import { Plus, Trash2 } from 'lucide-react'
import { getIndustryPack, samplePrice } from '@deskhand/config'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import type { FaqItem, Industry, MarketCode, ServiceItem } from '@deskhand/schemas'
import { Badge, Button, Checkbox, CurrencyInput, IconButton, Input, Label, Textarea } from '@deskhand/ui'

export function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

export function SourceBadge({ source }: { source: ServiceItem['source'] }) {
  const { t } = useTranslation('onboarding')
  return <Badge tone={source === 'owner' ? 'neutral' : source === 'import' ? 'info' : 'brand'}>{t(`sources.${source}`)}</Badge>
}

/**
 * Services with duration and price. A service only counts once the owner confirms its price:
 * the AI never quotes a price nobody has checked (FR-IP.4).
 */
export function ServicesEditor({
  services,
  onChange,
  currency,
  market,
  locale,
  industry,
}: {
  services: ServiceItem[]
  onChange: (services: ServiceItem[]) => void
  currency: string
  market: MarketCode
  locale: string
  industry: Industry
}) {
  const { t } = useTranslation('onboarding')
  const samples = new Map(getIndustryPack(industry).services.map((s) => [s.name.toLowerCase(), s.sampleUsd]))
  const update = (id: string, patch: Partial<ServiceItem>) => onChange(services.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const unconfirmed = services.filter((s) => s.price !== null && !s.verified).length

  return (
    <div className="flex flex-col gap-3">
      {services.length === 0 && <p className="rounded-md border border-dashed border-border p-4 text-sm text-fg-muted">{t('services.empty')}</p>}
      {services.map((service) => {
        const sample = samples.get(service.name.toLowerCase())
        return (
          <div key={service.id} className="grid gap-3 rounded-lg border border-border bg-surface p-3 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto] sm:items-end">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${service.id}-name`} className="flex items-center gap-2">
                {t('services.name')}
                <SourceBadge source={service.source} />
              </Label>
              <Input id={`${service.id}-name`} value={service.name} onChange={(e) => update(service.id, { name: e.target.value, source: 'owner' })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${service.id}-duration`}>{t('services.duration')}</Label>
              <Input
                id={`${service.id}-duration`}
                type="number"
                inputMode="numeric"
                min={5}
                step={5}
                value={service.durationMin}
                onChange={(e) => update(service.id, { durationMin: Math.max(5, Number(e.target.value) || 5) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${service.id}-price`}>{t('services.price')}</Label>
              <CurrencyInput
                id={`${service.id}-price`}
                value={service.price}
                onChange={(price) => update(service.id, { price, verified: price === null ? false : service.verified })}
                currency={currency}
                locale={locale}
              />
            </div>
            <div className="flex items-center gap-1 sm:pb-1.5">
              <label className="flex items-center gap-2 text-[13px] whitespace-nowrap">
                <Checkbox
                  checked={service.verified}
                  disabled={service.price === null}
                  onCheckedChange={(v) => update(service.id, { verified: v === true })}
                />
                {t('services.confirmed')}
              </label>
              <IconButton label={t('services.remove', { name: service.name })} onClick={() => onChange(services.filter((s) => s.id !== service.id))}>
                <Trash2 />
              </IconButton>
            </div>
            {service.price === null && (
              <p className="text-[13px] text-attention sm:col-span-4">
                {sample
                  ? t('services.noPriceTypical', { price: formatMoney(samplePrice(sample, market), currency, locale) })
                  : t('services.noPrice')}
              </p>
            )}
          </div>
        )
      })}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange([...services, { id: localId('svc'), name: '', durationMin: 30, price: null, source: 'owner', verified: false }])}
        >
          <Plus />
          {t('services.add')}
        </Button>
        {unconfirmed > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(services.map((s) => (s.price !== null ? { ...s, verified: true } : s)))}>
            {t('services.confirmAll', { count: unconfirmed })}
          </Button>
        )}
      </div>
    </div>
  )
}

export function FaqEditor({ faqs, onChange }: { faqs: FaqItem[]; onChange: (faqs: FaqItem[]) => void }) {
  const { t } = useTranslation('onboarding')
  const update = (id: string, patch: Partial<FaqItem>) => onChange(faqs.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq) => (
        <div key={faq.id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center gap-2">
            <SourceBadge source={faq.source} />
            <label className="ms-auto flex items-center gap-2 text-[13px]">
              <Checkbox checked={faq.verified} disabled={!faq.answer.trim()} onCheckedChange={(v) => update(faq.id, { verified: v === true })} />
              {t('faqs.confirmed')}
            </label>
            <IconButton label={t('faqs.remove')} onClick={() => onChange(faqs.filter((f) => f.id !== faq.id))}>
              <Trash2 />
            </IconButton>
          </div>
          <Input
            aria-label={t('faqs.question')}
            placeholder={t('faqs.question')}
            value={faq.question}
            onChange={(e) => update(faq.id, { question: e.target.value, source: 'owner' })}
          />
          <Textarea
            aria-label={t('faqs.answer')}
            placeholder={t('faqs.answer')}
            rows={2}
            value={faq.answer}
            onChange={(e) => update(faq.id, { answer: e.target.value, verified: e.target.value.trim() ? faq.verified : false })}
          />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange([...faqs, { id: localId('faq'), question: '', answer: '', source: 'owner', verified: false }])}>
          <Plus />
          {t('faqs.add')}
        </Button>
        {faqs.some((f) => !f.verified && f.answer.trim()) && (
          <Button variant="ghost" size="sm" onClick={() => onChange(faqs.map((f) => (f.answer.trim() ? { ...f, verified: true } : f)))}>
            {t('faqs.confirmAll')}
          </Button>
        )}
      </div>
    </div>
  )
}

/** Drops half-typed rows before saving so autosave never sends something the server would reject. */
export function cleanServices(services: ServiceItem[]) {
  return services.filter((s) => s.name.trim()).map((s) => ({ ...s, name: s.name.trim() }))
}

export function cleanFaqs(faqs: FaqItem[]) {
  return faqs.filter((f) => f.question.trim()).map((f) => ({ ...f, question: f.question.trim() }))
}
