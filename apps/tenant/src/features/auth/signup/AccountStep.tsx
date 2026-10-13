import { Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { BRAND_NAME, detectCountry } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import type { SignupStart } from '@deskhand/schemas'
import {
  Button,
  Checkbox,
  FieldError,
  FieldHint,
  Input,
  Label,
  PasswordInput,
  PasswordStrength,
  passwordScore,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@deskhand/ui'
import { useStartSignup } from '../../../api/auth'
import { AuthHeading } from '../AuthLayout'
import { countryOptions } from '../countries'
import { useAuthErrors } from '../errors'
import { GoogleDialog, GoogleMark } from '../GoogleDialog'
import { LegalDialog } from '../LegalDialog'
import { SignupProgress } from './SignupProgress'

function attribution(): SignupStart['attribution'] {
  const params = new URLSearchParams(window.location.search)
  return {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
    referralCode: params.get('ref') ?? undefined,
    referrer: document.referrer || undefined,
  }
}

/** Sign-up step 1 (PRD 27.1): email or Google, country, terms, business-use confirmation, unticked marketing opt-in. */
export function AccountStep() {
  const { t, i18n } = useTranslation('auth')
  const start = useStartSignup()
  const errors = useAuthErrors(start.error)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [country, setCountry] = useState(detectCountry)
  const [terms, setTerms] = useState(false)
  const [adult, setAdult] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [google, setGoogle] = useState(false)
  const [touched, setTouched] = useState(false)
  const countries = useMemo(() => countryOptions(i18n.language), [i18n.language])
  const consentsGiven = terms && adult
  const emailTaken = errors.code('email') === 'email_taken'

  const submit = (method: 'email' | 'google', account?: { email: string; name: string }) => {
    setTouched(true)
    if (!consentsGiven) return
    if (method === 'email' && (!email || passwordScore(password) < 2)) return
    start.mutate({
      method,
      email: account?.email ?? email,
      name: account?.name || undefined,
      password: method === 'email' ? password : undefined,
      country,
      acceptTerms: true,
      confirmAdultBusiness: true,
      marketingOptIn: marketing,
      attribution: attribution(),
    })
  }

  return (
    <>
      <SignupProgress current="account" />
      <AuthHeading title={t('signup.account.title', { brand: BRAND_NAME })} description={t('signup.account.body')} />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setTouched(true)
          if (consentsGiven) setGoogle(true)
        }}
      >
        <GoogleMark />
        {t('google.cta')}
      </Button>
      <GoogleDialog
        open={google}
        onOpenChange={setGoogle}
        defaultEmail={email}
        pending={start.isPending}
        error={errors.field('email') ?? errors.general()}
        onContinue={(account) => submit('google', account)}
      />

      <div className="my-6 flex items-center gap-3 text-xs text-fg-muted">
        <Separator className="flex-1" />
        {t('signup.account.or')}
        <Separator className="flex-1" />
      </div>

      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit('email')
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-email">{t('fields.workEmail')}</Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(errors.field('email')) || (touched && !email) || undefined}
            aria-describedby="su-email-error"
          />
          {(errors.field('email') || (touched && !email)) && (
            <FieldError id="su-email-error">
              {errors.field('email') ?? t('errors.required')}
              {emailTaken && (
                <>
                  {' '}
                  <Link to="/login" search={{ email }} className="font-medium underline underline-offset-2">
                    {t('signup.account.signInInstead')}
                  </Link>
                </>
              )}
            </FieldError>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-password">{t('fields.password')}</Label>
          <PasswordInput
            id="su-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.field('password')) || (touched && passwordScore(password) < 2) || undefined}
            aria-describedby="su-password-strength"
          />
          <PasswordStrength id="su-password-strength" password={password} />
          {(errors.field('password') || (touched && passwordScore(password) < 2)) && (
            <FieldError>{errors.field('password') ?? t('errors.weak_password')}</FieldError>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-country">{t('fields.country')}</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger id="su-country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {countries.map((option) => (
                <SelectItem key={option.code} value={option.code}>
                  {option.market ? option.name : t('signup.account.waitlistCountry', { country: option.name })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldHint>{t('signup.account.countryHint')}</FieldHint>
        </div>

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-start gap-3 text-[13px]">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} aria-invalid={(touched && !terms) || undefined} className="mt-0.5" />
            <span>
              {t('signup.account.termsPrefix')} <LegalDialog doc="terms" label={t('signup.account.terms')} /> {t('signup.account.and')}{' '}
              <LegalDialog doc="privacy" label={t('signup.account.privacy')} />
            </span>
          </label>
          <label className="flex items-start gap-3 text-[13px]">
            <Checkbox checked={adult} onCheckedChange={(v) => setAdult(v === true)} aria-invalid={(touched && !adult) || undefined} className="mt-0.5" />
            <span>{t('signup.account.adult')}</span>
          </label>
          <label className="flex items-start gap-3 text-[13px] text-fg-muted">
            <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
            <span>{t('signup.account.marketing', { brand: BRAND_NAME })}</span>
          </label>
          {touched && !consentsGiven && <FieldError>{t('errors.consents')}</FieldError>}
        </div>

        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={start.isPending}>
          {start.isPending ? t('signup.account.creating') : t('signup.account.cta')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {t('signup.account.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-brand hover:underline">
          {t('signup.account.signIn')}
        </Link>
      </p>
    </>
  )
}
