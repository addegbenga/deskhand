import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { CircleSlash, Clock, MapPin, UserCheck } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { LANGUAGES, useTranslation, type Language } from '@deskhand/i18n'
import type { InvitationPreview } from '@deskhand/schemas'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Combobox,
  ErrorState,
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
import { useAcceptInvitation, useInvitation } from '../api/auth'
import { isApiError } from '../api/client'
import { AuthHeading, AuthLayout } from '../features/auth/AuthLayout'
import { useAuthErrors } from '../features/auth/errors'
import { GoogleDialog, GoogleMark } from '../features/auth/GoogleDialog'
import { AuthSkeleton } from './signup'

function Dead({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  const { t } = useTranslation('auth')
  return (
    <div className="text-center">
      <span className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-muted [&_svg]:size-5">{icon}</span>
      <AuthHeading title={title} description={body} />
      <Button asChild variant="outline">
        <Link to="/login" search={{}}>
          {t('invite.goToLogin')}
        </Link>
      </Button>
    </div>
  )
}

function AcceptForm({ invitation, token }: { invitation: InvitationPreview; token: string }) {
  const { t, i18n } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const navigate = useNavigate()
  const accept = useAcceptInvitation(token)
  const errors = useAuthErrors(accept.error)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [language, setLanguage] = useState<Language>((LANGUAGES as readonly string[]).includes(i18n.language) ? (i18n.language as Language) : 'en')
  const [timezone, setTimezone] = useState(invitation.timezone)
  const [google, setGoogle] = useState(false)
  const [googleError, setGoogleError] = useState<string | undefined>()
  const [touched, setTouched] = useState(false)
  const zones = useMemo(() => {
    const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
    return (all.includes(invitation.timezone) ? all : [invitation.timezone, ...all]).map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))
  }, [invitation.timezone])
  const done = (result: { next: string }) => void navigate({ href: result.next, replace: true })
  const nameOk = name.trim().length >= 2
  const strong = passwordScore(password) >= 2

  const preferences = (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="iv-lang">{t('fields.language')}</Label>
        <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
          <SelectTrigger id="iv-lang">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((code) => (
              <SelectItem key={code} value={code}>
                {tCommon(`languages.${code}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="iv-tz">{t('fields.timezone')}</Label>
        <Combobox
          id="iv-tz"
          options={zones}
          value={timezone}
          onChange={setTimezone}
          placeholder={t('fields.timezone')}
          searchPlaceholder={t('signup.business.searchTimezone')}
          emptyText={t('signup.business.noTimezone')}
        />
      </div>
    </div>
  )

  if (invitation.existingUser) {
    return (
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (password) accept.mutate({ method: 'existing', password, language, timezone }, { onSuccess: done })
        }}
      >
        <p className="text-sm text-fg-muted">{t('invite.existing', { email: invitation.email })}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="iv-password">{t('fields.password')}</Label>
            <Link to="/forgot" search={{}} className="text-[13px] font-medium text-brand hover:underline">
              {t('login.forgot')}
            </Link>
          </div>
          <PasswordInput id="iv-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={Boolean(errors.field('password')) || undefined} />
          {errors.field('password') && <FieldError>{errors.field('password')}</FieldError>}
        </div>
        {preferences}
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={!password || accept.isPending}>
          {t('invite.joinCta', { business: invitation.businessName })}
        </Button>
      </form>
    )
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          setGoogleError(undefined)
          setGoogle(true)
        }}
      >
        <GoogleMark />
        {t('google.cta')}
      </Button>
      <GoogleDialog
        open={google}
        onOpenChange={setGoogle}
        defaultEmail={invitation.email}
        pending={accept.isPending}
        error={googleError ?? errors.general()}
        onContinue={(account) => {
          if (account.email.toLowerCase() !== invitation.email.toLowerCase()) {
            setGoogleError(t('invite.wrongGoogle', { email: invitation.email }))
            return
          }
          accept.mutate({ method: 'google', name: account.name || undefined, language, timezone }, { onSuccess: done })
        }}
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
          setTouched(true)
          if (nameOk && strong) accept.mutate({ method: 'password', name: name.trim(), password, language, timezone }, { onSuccess: done })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iv-email">{t('fields.email')}</Label>
          <Input id="iv-email" value={invitation.email} readOnly disabled />
          <FieldHint>{t('invite.emailLocked')}</FieldHint>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iv-name">{t('fields.name')}</Label>
          <Input id="iv-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={(touched && !nameOk) || undefined} />
          {((touched && !nameOk) || errors.field('name')) && <FieldError>{errors.field('name') ?? t('errors.required')}</FieldError>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="iv-new-password">{t('fields.password')}</Label>
          <PasswordInput
            id="iv-new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={(touched && !strong) || undefined}
            aria-describedby="iv-strength"
          />
          <PasswordStrength id="iv-strength" password={password} />
          {((touched && !strong) || errors.field('password')) && <FieldError>{errors.field('password') ?? t('errors.weak_password')}</FieldError>}
        </div>
        {preferences}
        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" disabled={accept.isPending}>
          {t('invite.joinCta', { business: invitation.businessName })}
        </Button>
      </form>
    </>
  )
}

/** Accept an invitation (PRD 12.4): the invite fixes the email, role and locations; the person only sets themselves up. */
function InvitePage() {
  const { token } = Route.useParams()
  const { t, i18n } = useTranslation('auth')
  const { t: tCommon } = useTranslation('common')
  const query = useInvitation(token)

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
        {isApiError(query.error, 'not_found') ? (
          <Dead icon={<CircleSlash />} title={t('invite.notFoundTitle')} body={t('invite.notFoundBody')} />
        ) : (
          <ErrorState onRetry={() => void query.refetch()} />
        )}
      </AuthLayout>
    )
  }

  const invitation = query.data
  if (invitation.status !== 'pending') {
    const icons = { expired: <Clock />, revoked: <CircleSlash />, accepted: <UserCheck /> }
    return (
      <AuthLayout>
        <Dead
          icon={icons[invitation.status]}
          title={t(`invite.${invitation.status}Title`)}
          body={t(`invite.${invitation.status}Body`, { business: invitation.businessName, inviter: invitation.inviterName })}
        />
      </AuthLayout>
    )
  }

  const expires = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(invitation.expiresAt))
  return (
    <AuthLayout>
      <AuthHeading
        title={t('invite.title', { business: invitation.businessName })}
        description={t('invite.body', { inviter: invitation.inviterName, role: tCommon(`roles.${invitation.role}`) })}
      />
      <Card className="mb-6 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={invitation.inviterName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{invitation.inviterName}</p>
            <p className="text-[13px] text-fg-muted">{t('invite.expires', { date: expires })}</p>
          </div>
          <Badge tone="brand">{tCommon(`roles.${invitation.role}`)}</Badge>
        </div>
        {invitation.note && <blockquote className="mt-3 border-s-2 border-border ps-3 text-sm text-fg-muted italic">{invitation.note}</blockquote>}
        {invitation.locationNames.length > 0 && (
          <p className="mt-3 flex items-center gap-2 text-[13px] text-fg-muted">
            <MapPin className="size-3.5" aria-hidden />
            {t('invite.locations', { locations: invitation.locationNames.join(', ') })}
          </p>
        )}
        <p className="mt-3 text-[13px] text-fg-muted">{t(`invite.roleCan.${invitation.role}`)}</p>
      </Card>
      <AcceptForm invitation={invitation} token={token} />
    </AuthLayout>
  )
}

export const Route = createFileRoute('/invite/$token')({ component: InvitePage })
