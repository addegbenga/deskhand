import { Building2, Store, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { HeardFromSchema, TeamSizeSchema, type AboutYou, type Signup } from '@deskhand/schemas'
import {
  Badge,
  Button,
  ChoiceCard,
  ChoiceCards,
  FieldError,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@deskhand/ui'
import { usePatchSignup } from '../../../api/auth'
import { AuthHeading } from '../AuthLayout'
import { useAuthErrors } from '../errors'
import { SignupProgress } from './SignupProgress'

/** Sign-up step 3 (PRD 27.1). Role picks the owner path; agency tools come later (P2). */
export function AboutYouStep({ signup, onDone }: { signup: Signup; onDone: () => void }) {
  const { t } = useTranslation('auth')
  const patch = usePatchSignup()
  const errors = useAuthErrors(patch.error)
  const initial = signup.aboutYou
  const [form, setForm] = useState<AboutYou>({
    name: initial?.name ?? signup.name ?? '',
    role: initial?.role ?? 'owner',
    teamSize: initial?.teamSize ?? 'just_me',
    heardFrom: initial?.heardFrom ?? 'friend',
  })
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof AboutYou>(key: K, value: AboutYou[K]) => setForm((f) => ({ ...f, [key]: value }))
  const nameOk = form.name.trim().length >= 2

  return (
    <>
      <SignupProgress current="about_you" />
      <AuthHeading title={t('signup.about.title')} description={t('signup.about.body')} />
      <form
        className="flex flex-col gap-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          setTouched(true)
          if (nameOk) patch.mutate({ aboutYou: { ...form, name: form.name.trim() } }, { onSuccess: onDone })
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ay-name">{t('fields.name')}</Label>
          <Input id="ay-name" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} aria-invalid={(touched && !nameOk) || undefined} />
          {touched && !nameOk && <FieldError>{t('errors.required')}</FieldError>}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t('signup.about.role')}</legend>
          <ChoiceCards value={form.role} onValueChange={(value) => set('role', value as AboutYou['role'])}>
            <ChoiceCard value="owner" icon={<Store />} title={t('signup.about.roles.owner')} description={t('signup.about.roles.ownerHint')} />
            <ChoiceCard value="manager" icon={<UserRound />} title={t('signup.about.roles.manager')} description={t('signup.about.roles.managerHint')} />
            <ChoiceCard
              value="agency"
              icon={<Building2 />}
              title={t('signup.about.roles.agency')}
              description={t('signup.about.roles.agencyHint')}
              badge={<Badge tone="info">{t('signup.about.later')}</Badge>}
            />
          </ChoiceCards>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ay-team">{t('signup.about.teamSize')}</Label>
            <Select value={form.teamSize} onValueChange={(v) => set('teamSize', v as AboutYou['teamSize'])}>
              <SelectTrigger id="ay-team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TeamSizeSchema.options.map((size) => (
                  <SelectItem key={size} value={size}>
                    {t(`signup.about.teamSizes.${size}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ay-heard">{t('signup.about.heardFrom')}</Label>
            <Select value={form.heardFrom} onValueChange={(v) => set('heardFrom', v as AboutYou['heardFrom'])}>
              <SelectTrigger id="ay-heard">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HeardFromSchema.options.map((source) => (
                  <SelectItem key={source} value={source}>
                    {t(`signup.about.heard.${source}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {errors.general() && <FieldError>{errors.general()}</FieldError>}
        <Button type="submit" size="lg" className="w-full" disabled={patch.isPending}>
          {t('actions.continue')}
        </Button>
      </form>
    </>
  )
}
