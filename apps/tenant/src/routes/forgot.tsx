import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { KeyRound, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { useTranslation } from '@deskhand/i18n'
import { Button, FieldError, Input, Label, PasswordInput, PasswordStrength, passwordScore } from '@deskhand/ui'
import { useForgotPassword, useResetPassword, useResetToken } from '../api/auth'
import { AuthHeading, AuthLayout } from '../features/auth/AuthLayout'
import { DemoMailbox } from '../features/auth/DemoMailbox'
import { useAuthErrors } from '../features/auth/errors'
import { AuthSkeleton } from './signup'

function RequestForm() {
  const { t } = useTranslation('auth')
  const request = useForgotPassword()
  const errors = useAuthErrors(request.error)
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo) {
    return (
      <>
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <AuthHeading title={t('forgot.sentTitle')} description={t('forgot.sentBody', { email: sentTo })} />
        <Button asChild variant="outline" className="w-full">
          <Link to="/login" search={{}}>
            {t('forgot.backToLogin')}
          </Link>
        </Button>
        <DemoMailbox email={sentTo} kinds={['reset_link']} />
      </>
    )
  }
  return (
    <>
      <AuthHeading title={t('forgot.title')} description={t('forgot.body')} />
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const value = email.trim()
          if (value) request.mutate(value, { onSuccess: () => setSentTo(value) })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fg-email">{t('fields.email')}</Label>
          <Input id="fg-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={!email.trim() || request.isPending}>
          {t('forgot.cta')}
        </Button>
        <Button asChild variant="ghost">
          <Link to="/login" search={{}}>
            {t('forgot.backToLogin')}
          </Link>
        </Button>
      </form>
    </>
  )
}

function ResetForm({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const check = useResetToken(token)
  const reset = useResetPassword()
  const checkErrors = useAuthErrors(check.error)
  const errors = useAuthErrors(reset.error)
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)
  const strong = passwordScore(password) >= 2

  if (check.isPending) return <AuthSkeleton />
  if (check.isError || errors.code('token')) {
    const expired = checkErrors.code('token') === 'link_expired' || errors.code('token') === 'link_expired'
    return (
      <>
        <AuthHeading title={expired ? t('forgot.expiredTitle') : t('forgot.invalidTitle')} description={t('forgot.expiredBody')} />
        <Button asChild size="lg" className="w-full">
          <Link to="/forgot" search={{}}>
            {t('forgot.newLink')}
          </Link>
        </Button>
      </>
    )
  }
  return (
    <>
      <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand/10 text-brand">
        <KeyRound className="size-5" aria-hidden />
      </span>
      <AuthHeading title={t('forgot.resetTitle')} description={t('forgot.resetBody', { email: check.data.email })} />
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (strong) reset.mutate({ token, password }, { onSuccess: () => void navigate({ to: '/login', search: { email: check.data.email, reset: 'done' }, replace: true }) })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="rs-password">{t('fields.newPassword')}</Label>
          <PasswordInput
            id="rs-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={(touched && !strong) || Boolean(errors.field('password')) || undefined}
            aria-describedby="rs-strength"
          />
          <PasswordStrength id="rs-strength" password={password} />
          {((touched && !strong) || errors.field('password')) && <FieldError>{errors.field('password') ?? t('errors.weak_password')}</FieldError>}
        </div>
        <p className="text-[13px] text-fg-muted">{t('forgot.signsOut')}</p>
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={reset.isPending}>
          {t('forgot.resetCta')}
        </Button>
      </form>
    </>
  )
}

/** Password recovery (PRD 27.3): the same answer whether or not the email exists; links last one hour. */
function ForgotPage() {
  const { token } = Route.useSearch()
  return <AuthLayout>{token ? <ResetForm key={token} token={token} /> : <RequestForm />}</AuthLayout>
}

export const Route = createFileRoute('/forgot')({
  validateSearch: z.object({ token: z.string().optional() }),
  component: ForgotPage,
})
