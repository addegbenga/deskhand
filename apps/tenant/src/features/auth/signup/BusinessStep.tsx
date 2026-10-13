import { TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getMarketPack } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { IndustrySchema, type AboutBusiness, type Signup } from '@deskhand/schemas'
import {
  Button,
  Combobox,
  FieldError,
  FieldHint,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@deskhand/ui'
import { useBusinessCheck, usePatchSignup } from '../../../api/auth'
import { useDebounced } from '../../../lib/use-debounced'
import { AuthHeading } from '../AuthLayout'
import { useAuthErrors } from '../errors'
import { SignupProgress } from './SignupProgress'

const EXTRA_CURRENCIES = ['USD', 'EUR', 'GBP']

function timezones(preferred: string) {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [preferred]
  return all.includes(preferred) ? all : [preferred, ...all]
}

/** Sign-up step 4 (PRD 27.1). Country already chose the market pack, so time zone and currency come prefilled. */
export function BusinessStep({ signup, onDone, onBack }: { signup: Signup; onDone: () => void; onBack: () => void }) {
  const { t } = useTranslation('auth')
  const { t: tOnboarding } = useTranslation('onboarding')
  const patch = usePatchSignup()
  const errors = useAuthErrors(patch.error)
  const pack = getMarketPack(signup.market ?? 'NG')
  const initial = signup.business
  const [form, setForm] = useState<AboutBusiness>({
    businessName: initial?.businessName ?? '',
    industry: initial?.industry ?? 'salon',
    link: initial?.link ?? '',
    city: initial?.city ?? '',
    timezone: initial?.timezone ?? pack.defaultTimezone,
    currency: initial?.currency ?? pack.currency,
  })
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof AboutBusiness>(key: K, value: AboutBusiness[K]) => setForm((f) => ({ ...f, [key]: value }))
  const link = useDebounced(form.link, 400)
  const duplicate = useBusinessCheck(link).data?.match
  const zones = useMemo(() => timezones(pack.defaultTimezone), [pack.defaultTimezone])
  const currencies = [...new Set([pack.currency, ...EXTRA_CURRENCIES])]
  const industries = IndustrySchema.options.map((value) => ({ value, label: tOnboarding(`industries.${value}`) }))
  const valid = form.businessName.trim().length >= 2 && form.city.trim().length >= 2

  return (
    <>
      <SignupProgress current="business" />
      <AuthHeading title={t('signup.business.title')} description={t('signup.business.body')} />
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (valid) patch.mutate({ business: { ...form, businessName: form.businessName.trim(), city: form.city.trim() } }, { onSuccess: onDone })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bz-name">{t('fields.businessName')}</Label>
          <Input
            id="bz-name"
            autoComplete="organization"
            value={form.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            aria-invalid={(touched && form.businessName.trim().length < 2) || undefined}
          />
          {touched && form.businessName.trim().length < 2 && <FieldError>{t('errors.required')}</FieldError>}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bz-industry">{t('fields.industry')}</Label>
          <Combobox
            id="bz-industry"
            options={industries}
            value={form.industry}
            onChange={(value) => set('industry', value as AboutBusiness['industry'])}
            placeholder={t('fields.industry')}
            searchPlaceholder={t('signup.business.searchIndustry')}
            emptyText={t('signup.business.noIndustry')}
          />
          <FieldHint>{t('signup.business.industryHint')}</FieldHint>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bz-link">{t('fields.link')}</Label>
          <Input id="bz-link" dir="ltr" inputMode="url" placeholder={t('signup.business.linkPlaceholder')} value={form.link} onChange={(e) => set('link', e.target.value)} />
          <FieldHint>{t('signup.business.linkHint')}</FieldHint>
          {duplicate && (
            <div role="status" className="mt-1 flex gap-2 rounded-md border border-attention/40 bg-attention/5 p-3 text-[13px]">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-attention" aria-hidden />
              <span>{t('signup.business.duplicate', { business: duplicate })}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bz-city">{t('fields.city')}</Label>
          <Input id="bz-city" autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} aria-invalid={(touched && form.city.trim().length < 2) || undefined} />
          {touched && form.city.trim().length < 2 && <FieldError>{t('errors.required')}</FieldError>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bz-tz">{t('fields.timezone')}</Label>
            <Combobox
              id="bz-tz"
              options={zones.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))}
              value={form.timezone}
              onChange={(value) => set('timezone', value)}
              placeholder={t('fields.timezone')}
              searchPlaceholder={t('signup.business.searchTimezone')}
              emptyText={t('signup.business.noTimezone')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bz-currency">{t('fields.currency')}</Label>
            <Select value={form.currency} onValueChange={(value) => set('currency', value)}>
              <SelectTrigger id="bz-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <div className="flex gap-3">
          <Button variant="outline" size="lg" onClick={onBack}>
            {t('actions.back')}
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={patch.isPending}>
            {t('actions.continue')}
          </Button>
        </div>
      </form>
    </>
  )
}
