import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { Button, CodeInput, ErrorState, FieldError, FieldHint } from '@deskhand/ui'
import { signupQuery, useAbandonSignup, useResendCode, useVerifyCode } from '../api/auth'
import { now } from '../lib/clock'
import { AuthHeading, AuthLayout } from '../features/auth/AuthLayout'
import { DemoMailbox } from '../features/auth/DemoMailbox'
import { useAuthErrors } from '../features/auth/errors'
import { SignupProgress } from '../features/auth/signup/SignupProgress'
import { AuthSkeleton } from './signup'

function useSecondsUntil(iso: string | null) {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!iso) return 0
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now().getTime()) / 1000))
}

/** Sign-up step 2 (PRD 27.1): six-digit code, 10 minutes, 5 attempts, resend after 60 seconds. */
function VerifyPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const query = useQuery(signupQuery)
  const verify = useVerifyCode()
  const resend = useResendCode()
  const abandon = useAbandonSignup()
  const errors = useAuthErrors(verify.error ?? resend.error)
  const [code, setCode] = useState('')
  const wait = useSecondsUntil(query.data?.resendAvailableAt ?? null)

  if (query.isPending) {
    return (
      <AuthLayout>
        <AuthSkeleton />
      </AuthLayout>
    )
  }
  if (query.isError) {
    return (
      <AuthLayout>
        <ErrorState onRetry={() => void query.refetch()} />
      </AuthLayout>
    )
  }
  const signup = query.data
  if (!signup || signup.step !== 'verify') return <Navigate to="/signup" replace />

  const submit = (value: string) =>
    verify.mutate(value, {
      onSuccess: () => void navigate({ to: '/signup', search: { step: 'about_you' } }),
      onError: () => setCode(''),
    })
  const locked = signup.attemptsLeft <= 0

  return (
    <AuthLayout>
      <SignupProgress current="verify" />
      <AuthHeading title={t('verify.title')} description={t('verify.body', { email: signup.email })} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (code.length === 6) submit(code)
        }}
      >
        <CodeInput
          value={code}
          onChange={setCode}
          onComplete={submit}
          label={t('verify.codeLabel')}
          invalid={Boolean(errors.field('code'))}
          disabled={verify.isPending || locked}
        />
        {errors.field('code') ? (
          <FieldError>
            {errors.field('code')}
            {errors.field('code') && !locked && signup.attemptsLeft < 5 && <> {t('verify.attemptsLeft', { count: signup.attemptsLeft })}</>}
          </FieldError>
        ) : (
          <FieldHint>{t('verify.expiry')}</FieldHint>
        )}
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={code.length !== 6 || verify.isPending || locked}>
          {t('verify.cta')}
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Button variant="link" disabled={wait > 0 || resend.isPending} onClick={() => resend.mutate(undefined, { onSuccess: () => setCode('') })}>
          {wait > 0 ? t('verify.resendIn', { seconds: wait }) : t('verify.resend')}
        </Button>
        <Button variant="link" className="text-fg-muted" disabled={abandon.isPending} onClick={() => abandon.mutate()}>
          {t('verify.changeEmail')}
        </Button>
      </div>
      <DemoMailbox email={signup.email} kinds={['verify_code']} />
    </AuthLayout>
  )
}

export const Route = createFileRoute('/verify')({ component: VerifyPage })
