import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2, MailCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { BRAND_NAME } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { Button, FieldError, Input, Label, PasswordInput, Separator } from '@deskhand/ui'
import { useConsumeMagicLink, useLogin, useMagicLink } from '../api/auth'
import { useSignIn } from '../api/queries'
import { AuthHeading, AuthLayout } from '../features/auth/AuthLayout'
import { DemoMailbox } from '../features/auth/DemoMailbox'
import { useAuthErrors } from '../features/auth/errors'
import { GoogleDialog, GoogleMark } from '../features/auth/GoogleDialog'

const SHOW_DEMO = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true'
const DEMO_EMAIL = 'amaka.obi@amakabraids.com'

function MagicLinkConsumer({ token }: { token: string }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const consume = useConsumeMagicLink()
  const errors = useAuthErrors(consume.error)
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    consume.mutate(token, { onSuccess: (result) => void navigate({ href: result.next, replace: true }) })
  }, [consume, navigate, token])

  if (consume.isError) {
    return (
      <>
        <AuthHeading title={t('login.magic.expiredTitle')} description={errors.field('token') ?? errors.general()} />
        <Button asChild size="lg" className="w-full">
          <Link to="/login" search={{}}>
            {t('login.magic.back')}
          </Link>
        </Button>
      </>
    )
  }
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-10 text-sm text-fg-muted">
      <Loader2 className="size-6 animate-spin text-brand" aria-hidden />
      {t('login.magic.signingIn')}
    </div>
  )
}

function MagicLinkForm({ initialEmail, onCancel }: { initialEmail: string; onCancel: () => void }) {
  const { t } = useTranslation('auth')
  const send = useMagicLink()
  const errors = useAuthErrors(send.error)
  const [email, setEmail] = useState(initialEmail)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (sentTo) {
    return (
      <>
        <span className="flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <MailCheck className="size-5" aria-hidden />
        </span>
        <AuthHeading title={t('login.magic.sentTitle')} description={t('login.magic.sentBody', { email: sentTo })} />
        <Button variant="outline" className="w-full" onClick={onCancel}>
          {t('login.magic.back')}
        </Button>
        <DemoMailbox email={sentTo} kinds={['magic_link']} />
      </>
    )
  }
  return (
    <>
      <AuthHeading title={t('login.magic.title')} description={t('login.magic.body')} />
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          const value = email.trim()
          if (value) send.mutate(value, { onSuccess: () => setSentTo(value) })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ml-email">{t('fields.email')}</Label>
          <Input id="ml-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={!email.trim() || send.isPending}>
          {t('login.magic.cta')}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          {t('login.magic.back')}
        </Button>
      </form>
    </>
  )
}

/** Login (PRD 27.2): password, Google, or a one-time email link. Five wrong tries lock the account for 15 minutes. */
function LoginPage() {
  const { t } = useTranslation('auth')
  const search = Route.useSearch()
  const navigate = useNavigate()
  const login = useLogin()
  const demo = useSignIn()
  const errors = useAuthErrors(login.error)
  const [email, setEmail] = useState(search.email ?? '')
  const [password, setPassword] = useState('')
  const [google, setGoogle] = useState(false)
  const [magic, setMagic] = useState(false)
  const done = (result: { next: string }) => void navigate({ href: result.next, replace: true })

  if (search.magic) {
    return (
      <AuthLayout>
        <MagicLinkConsumer token={search.magic} />
      </AuthLayout>
    )
  }
  if (magic) {
    return (
      <AuthLayout>
        <MagicLinkForm initialEmail={email} onCancel={() => setMagic(false)} />
      </AuthLayout>
    )
  }

  const emailError = errors.field('email')
  return (
    <AuthLayout>
      <AuthHeading title={t('login.title', { brand: BRAND_NAME })} description={t('login.body')} />
      {search.reset && (
        <p role="status" className="mb-5 rounded-md border border-success/40 bg-success/5 p-3 text-[13px]">
          {t('login.resetDone')}
        </p>
      )}

      <Button variant="outline" className="w-full" onClick={() => setGoogle(true)}>
        <GoogleMark />
        {t('google.cta')}
      </Button>
      <GoogleDialog
        open={google}
        onOpenChange={setGoogle}
        defaultEmail={email}
        pending={login.isPending}
        error={errors.field('email') ?? errors.general()}
        onContinue={(account) => login.mutate({ method: 'google', email: account.email }, { onSuccess: done })}
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
          if (email.trim() && password) login.mutate({ method: 'password', email: email.trim(), password }, { onSuccess: done })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="li-email">{t('fields.email')}</Label>
          <Input
            id="li-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(emailError) || undefined}
            aria-describedby="li-email-error"
          />
          {emailError && (
            <FieldError id="li-email-error">
              {emailError}
              {errors.code('email') === 'no_account' && (
                <>
                  {' '}
                  <Link to="/signup" search={{}} className="font-medium underline underline-offset-2">
                    {t('login.createInstead')}
                  </Link>
                </>
              )}
            </FieldError>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="li-password">{t('fields.password')}</Label>
            <Link to="/forgot" search={{}} className="text-[13px] font-medium text-brand hover:underline">
              {t('login.forgot')}
            </Link>
          </div>
          <PasswordInput
            id="li-password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errors.field('password')) || undefined}
          />
          {errors.field('password') && <FieldError>{errors.field('password')}</FieldError>}
        </div>
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={!email.trim() || !password || login.isPending}>
          {login.isPending ? t('login.signingIn') : t('login.cta')}
        </Button>
        <Button variant="ghost" onClick={() => setMagic(true)}>
          {t('login.magic.open')}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-fg-muted">
        {t('login.noAccount')}{' '}
        <Link to="/signup" search={{}} className="font-medium text-brand hover:underline">
          {t('login.signUp')}
        </Link>
      </p>

      {SHOW_DEMO && (
        <div className="mt-8 rounded-lg border border-dashed border-attention/50 bg-attention/5 p-4 text-[13px]">
          <p className="flex items-center gap-2 font-medium">
            <Sparkles className="size-4 text-attention" aria-hidden />
            {t('login.demo.title')}
          </p>
          <p className="mt-1 text-fg-muted">{t('login.demo.body', { email: DEMO_EMAIL })}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEmail(DEMO_EMAIL)
                setPassword('demo-password')
              }}
            >
              {t('login.demo.fill')}
            </Button>
            <Button size="sm" variant="outline" disabled={demo.isPending} onClick={() => demo.mutate(undefined, { onSuccess: () => void navigate({ to: '/app/home' }) })}>
              {t('login.demo.toolbar')}
            </Button>
          </div>
        </div>
      )}
    </AuthLayout>
  )
}

export const Route = createFileRoute('/login')({
  validateSearch: z.object({
    email: z.string().optional(),
    magic: z.string().optional(),
    reset: z.literal('done').optional(),
  }),
  component: LoginPage,
})
