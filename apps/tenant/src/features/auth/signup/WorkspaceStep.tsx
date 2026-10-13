import { useNavigate } from '@tanstack/react-router'
import { Check, Globe2, Link2, ShieldCheck } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { APP_DOMAIN, getMarketPack } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import type { Signup } from '@deskhand/schemas'
import { Button, Card, FieldError, FieldHint, Input, Label } from '@deskhand/ui'
import { useCompleteSignup, useSlugCheck } from '../../../api/auth'
import { useDebounced } from '../../../lib/use-debounced'
import { AuthHeading } from '../AuthLayout'
import { countryName } from '../countries'
import { useAuthErrors } from '../errors'
import { SignupProgress } from './SignupProgress'

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <span className="mt-0.5 text-fg-muted [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-fg-muted">{label}</p>
        <div className="mt-0.5 text-sm font-medium">{children}</div>
      </div>
    </div>
  )
}

/** Sign-up step 6 (PRD 27.1): confirm the booking link, then create the account, location and region. */
export function WorkspaceStep({ signup, onBack }: { signup: Signup; onBack: () => void }) {
  const { t, i18n } = useTranslation('auth')
  const navigate = useNavigate()
  const complete = useCompleteSignup()
  const errors = useAuthErrors(complete.error)
  const [slug, setSlug] = useState(signup.suggestedSlug ?? '')
  const debounced = useDebounced(slug, 300)
  const check = useSlugCheck(debounced)
  const pack = getMarketPack(signup.market ?? 'NG')
  const valid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3
  const taken = check.data?.slug === slug && !check.data.available && valid

  return (
    <>
      <SignupProgress current="done" />
      <AuthHeading title={t('signup.workspace.title')} description={t('signup.workspace.body')} />
      <Card className="divide-y divide-border px-4">
        <Row icon={<Check />} label={t('fields.businessName')}>
          {signup.business?.businessName}
        </Row>
        <Row icon={<Globe2 />} label={t('signup.workspace.market')}>
          {t('signup.workspace.marketValue', { country: countryName(signup.country, i18n.language) })}
        </Row>
        <Row icon={<ShieldCheck />} label={t('signup.workspace.region')}>
          {t(`signup.workspace.regions.${pack.defaultRegion}`)}
        </Row>
      </Card>

      <div className="mt-6 flex flex-col gap-1.5">
        <Label htmlFor="ws-slug" className="flex items-center gap-2">
          <Link2 className="size-4 text-fg-muted" aria-hidden />
          {t('signup.workspace.link')}
        </Label>
        <div dir="ltr" className="flex items-center overflow-hidden rounded-md border border-border bg-surface focus-within:border-brand focus-within:ring-2 focus-within:ring-ring/30">
          <span className="ps-3 text-sm text-fg-muted">{`${APP_DOMAIN}/b/`}</span>
          <Input
            id="ws-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            className="border-0 ps-0.5 focus-visible:ring-0"
            aria-invalid={!valid || taken || Boolean(errors.field('slug')) || undefined}
          />
        </div>
        {!valid ? (
          <FieldError>{t('errors.slug_invalid')}</FieldError>
        ) : taken || errors.field('slug') ? (
          <FieldError>
            {t('errors.slug_taken')}
            {check.data?.suggestion && (
              <>
                {' '}
                <button type="button" className="font-medium underline underline-offset-2" onClick={() => setSlug(check.data!.suggestion!)}>
                  {t('signup.workspace.useSuggestion', { slug: check.data.suggestion })}
                </button>
              </>
            )}
          </FieldError>
        ) : (
          <FieldHint>{t('signup.workspace.linkHint')}</FieldHint>
        )}
      </div>

      {errors.general() && <FieldError className="mt-3">{errors.general()}</FieldError>}
      <div className="mt-8 flex gap-3">
        <Button variant="outline" size="lg" onClick={onBack}>
          {t('actions.back')}
        </Button>
        <Button
          size="lg"
          className="flex-1"
          disabled={!valid || taken || complete.isPending}
          onClick={() => complete.mutate(slug, { onSuccess: (result) => void navigate({ href: result.next, replace: true }) })}
        >
          {complete.isPending ? t('signup.workspace.creating') : t('signup.workspace.cta')}
        </Button>
      </div>
    </>
  )
}
