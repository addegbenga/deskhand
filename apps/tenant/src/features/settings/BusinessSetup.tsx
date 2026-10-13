import { Link } from '@tanstack/react-router'
import { getMarketPack } from '@deskhand/config'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import {
  GoalSchema,
  IndustrySchema,
  InterviewTopicSchema,
  ToneSchema,
  type BusinessProfile,
  type FaqItem,
  type Goal,
  type ServiceItem,
} from '@deskhand/schemas'
import { useSaveStep, useOnboarding } from '../../api/onboarding'
import { useBusiness, usePatchBusiness } from '../../api/settings'
import { useSession } from '../../api/queries'
import {
  Button,
  Checkbox,
  ErrorState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from '@deskhand/ui'
import { HoursEditor } from '../onboarding/steps/ProfileStep'
import { cleanFaqs, cleanServices, FaqEditor, ServicesEditor } from '../onboarding/editors'

export function BusinessSetup() {
  const { t } = useTranslation(['settings', 'onboarding', 'common'])
  const session = useSession()
  const onboarding = useOnboarding()
  const business = useBusiness()
  const patchBusiness = usePatchBusiness()
  const saveStep = useSaveStep()
  const market = getMarketPack(session.account.market)
  const state = onboarding.data?.state

  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [answers, setAnswers] = useState<Partial<Record<(typeof InterviewTopicSchema.options)[number], string>>>({})

  useEffect(() => {
    if (!state) return
    setProfile(state.profile)
    setGoals(state.goals)
    setServices(state.knowledge.services)
    setFaqs(state.knowledge.faqs)
    setAnswers(state.knowledge.answers)
  }, [state])

  if (onboarding.isPending || business.isPending) return <Skeleton className="h-40" />
  if (onboarding.isError || !state || !profile) return <ErrorState onRetry={() => void onboarding.refetch()} />
  if (business.isError || !business.data) return <ErrorState onRetry={() => void business.refetch()} />

  const set = <K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) => setProfile((current) => (current ? { ...current, [key]: value } : current))
  const legal = business.data
  const needsInput = [...services.filter((item) => !item.verified || item.price === null), ...faqs.filter((item) => !item.verified)]

  const persistProfile = () =>
    void saveStep.mutateAsync({ step: 'profile', data: profile }).then(() => toast.success(t('saved')))
  const persistGoals = () =>
    void saveStep.mutateAsync({ step: 'goals', data: { goals } }).then(() => toast.success(t('saved')))
  const persistKnowledge = () =>
    void saveStep
      .mutateAsync({ step: 'knowledge', data: { services: cleanServices(services), faqs: cleanFaqs(faqs), answers } })
      .then(() => toast.success(t('saved')))

  return (
    <div className="max-w-3xl space-y-10">
      <p className="text-sm text-fg-muted">{t('business.hubHint')}</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('business.pack')}</h2>
        <p className="text-sm">
          {t('onboarding:profile.pack.title', { industry: t(`onboarding:industries.${profile.industry}`) })}
        </p>
        <p className="text-sm text-fg-muted">{t('business.packHint')}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/ai/knowledge">{t('business.jumpKnowledge')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/services">{t('business.jumpServices')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/connections">{t('business.jumpChannels')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/ai/employees">{t('business.jumpEmployee')}</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/app/compliance/$page" params={{ page: 'overview' }}>{t('business.jumpCompliance')}</Link>
          </Button>
        </div>
      </section>

      {needsInput.length > 0 && (
        <section className="rounded-lg border border-attention/30 bg-attention/10 p-4">
          <h2 className="text-sm font-semibold">{t('business.needsInput')}</h2>
          <p className="mt-1 text-sm text-fg-muted">{t('business.needsInputBody', { count: needsInput.length })}</p>
        </section>
      )}

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">{t('onboarding:profile.details')}</h2>
        <div>
          <Label>{t('onboarding:profile.name')}</Label>
          <Input className="mt-1" value={profile.name} onChange={(event) => set('name', event.target.value)} />
        </div>
        <div>
          <Label>{t('onboarding:profile.industry')}</Label>
          <Select value={profile.industry} onValueChange={(value) => set('industry', value as BusinessProfile['industry'])}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IndustrySchema.options.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`onboarding:industries.${item}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('onboarding:profile.description')}</Label>
          <Textarea className="mt-1" value={profile.description} onChange={(event) => set('description', event.target.value)} />
        </div>
        <div>
          <Label>{t('onboarding:profile.address')}</Label>
          <Input className="mt-1" value={profile.address} onChange={(event) => set('address', event.target.value)} />
        </div>
        <div>
          <Label>{t('onboarding:profile.city')}</Label>
          <Input className="mt-1" value={profile.city} onChange={(event) => set('city', event.target.value)} />
        </div>
        <div>
          <Label>{t('onboarding:profile.phone')}</Label>
          <Input className="mt-1" value={profile.phone} onChange={(event) => set('phone', event.target.value)} />
        </div>
        <div>
          <Label>{t('onboarding:profile.tone')}</Label>
          <Select value={profile.tone} onValueChange={(value) => set('tone', value as BusinessProfile['tone'])}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ToneSchema.options.map((item) => (
                <SelectItem key={item} value={item}>
                  {t(`onboarding:tones.${item}.name`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>{t('onboarding:profile.languages')}</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {market.conversationLanguages.map((item) => (
              <label key={item.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={profile.languages.includes(item.code)}
                  onCheckedChange={(checked) =>
                    set(
                      'languages',
                      checked ? [...profile.languages, item.code] : profile.languages.filter((code) => code !== item.code),
                    )
                  }
                />
                {item.code}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>{t('onboarding:profile.hours')}</Label>
          <div className="mt-2">
            <HoursEditor hours={profile.hours} onChange={(hours) => set('hours', hours)} locale={session.locations[0]?.locale ?? market.locale} weekStartsOn={market.weekStartsOn} />
          </div>
        </div>
        <Button onClick={persistProfile} disabled={saveStep.isPending || profile.name.trim().length < 2}>
          {t('save')}
        </Button>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-semibold">{t('business.legal')}</h2>
        <Input defaultValue={legal.legalName} onBlur={(event) => void patchBusiness.mutateAsync({ legalName: event.target.value }).then(() => toast.success(t('saved')))} aria-label={t('business.legalName')} />
        <Input defaultValue={legal.registration} onBlur={(event) => void patchBusiness.mutateAsync({ registration: event.target.value }).then(() => toast.success(t('saved')))} aria-label={t('business.registration')} />
        <Input defaultValue={legal.website} onBlur={(event) => void patchBusiness.mutateAsync({ website: event.target.value }).then(() => toast.success(t('saved')))} aria-label={t('business.website')} />
        <Input defaultValue={legal.privacyEmail} onBlur={(event) => void patchBusiness.mutateAsync({ privacyEmail: event.target.value }).then(() => toast.success(t('saved')))} aria-label={t('business.privacy')} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('onboarding:steps.goals.short')}</h2>
        {GoalSchema.options.map((goal) => (
          <label key={goal} className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={goals.includes(goal)}
              onCheckedChange={(checked) => setGoals((current) => (checked ? [...current, goal] : current.filter((item) => item !== goal)))}
            />
            <span>
              <span className="font-medium">{t(`onboarding:goals.${goal}.title`)}</span>
              <span className="mt-0.5 block text-fg-muted">{t(`onboarding:goals.${goal}.body`)}</span>
            </span>
          </label>
        ))}
        <Button onClick={persistGoals} disabled={saveStep.isPending}>
          {t('save')}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('onboarding:services.title')}</h2>
        <p className="text-sm text-fg-muted">{t('onboarding:services.body')}</p>
        <ServicesEditor
          services={services}
          onChange={setServices}
          currency={profile.currency}
          market={session.account.market}
          locale={session.locations[0]?.locale ?? market.locale}
          industry={profile.industry}
        />
        <Button onClick={persistKnowledge} disabled={saveStep.isPending}>
          {t('save')}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('business.faqs')}</h2>
        <FaqEditor faqs={faqs} onChange={setFaqs} />
        <Button onClick={persistKnowledge} disabled={saveStep.isPending}>
          {t('save')}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t('business.policies')}</h2>
        {InterviewTopicSchema.options.map((topic) => (
          <div key={topic}>
            <Label>{t(`onboarding:interview.${topic}.question`)}</Label>
            <Textarea className="mt-1" value={answers[topic] ?? ''} onChange={(event) => setAnswers((current) => ({ ...current, [topic]: event.target.value }))} />
          </div>
        ))}
        <Button onClick={persistKnowledge} disabled={saveStep.isPending}>
          {t('save')}
        </Button>
      </section>
    </div>
  )
}
