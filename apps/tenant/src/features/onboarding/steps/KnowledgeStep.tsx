import { BookOpenCheck, Check, CircleAlert, Hand, Lightbulb } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getIndustryPack } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { InterviewTopicSchema, type InterviewTopic, type Knowledge, type OnboardingView } from '@deskhand/schemas'
import { AIBadge, Button, Card, cn, Label, Textarea } from '@deskhand/ui'
import { useSaveStep } from '../../../api/onboarding'
import { useDebounced } from '../../../lib/use-debounced'
import { cleanFaqs, cleanServices, FaqEditor, ServicesEditor } from '../editors'
import { Section, StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

function KnowsRow({ ok, children }: { ok: boolean; children: string }) {
  return (
    <li className="flex items-start gap-2 text-[13px]">
      {ok ? <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden /> : <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-attention" aria-hidden />}
      <span className={cn(!ok && 'text-fg-muted')}>{children}</span>
    </li>
  )
}

/** "What the AI knows" (PRD 6.1 step 4), computed by the server from what is saved so far. */
export function KnowledgePreview({ view }: { view: OnboardingView }) {
  const { t } = useTranslation('onboarding')
  const k = view.knowledge
  const gate = view.gates.find((g) => g.id === 'knowledge')
  return (
    <Card className="sticky top-24 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BookOpenCheck className="size-4 text-ai" aria-hidden />
        {t('knowledge.preview.title')}
        <AIBadge className="ms-auto" />
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        <KnowsRow ok={k.servicesTotal > 0 && k.servicesReady === k.servicesTotal}>
          {t('knowledge.preview.services', { ready: k.servicesReady, total: k.servicesTotal })}
        </KnowsRow>
        <KnowsRow ok={k.faqsReady >= 3}>{t('knowledge.preview.faqs', { count: k.faqsReady })}</KnowsRow>
        <KnowsRow ok={k.hoursSet}>{k.hoursSet ? t('knowledge.preview.hours') : t('knowledge.preview.noHours')}</KnowsRow>
        <KnowsRow ok={k.locationSet}>{k.locationSet ? t('knowledge.preview.location') : t('knowledge.preview.noLocation')}</KnowsRow>
        <KnowsRow ok={k.answered.length >= 3}>{t('knowledge.preview.answers', { count: k.answered.length })}</KnowsRow>
      </ul>
      {gate?.status === 'done' ? (
        <p className="mt-4 rounded-md bg-success/10 p-2 text-[13px] text-success">{t('knowledge.preview.ready')}</p>
      ) : (
        <p className="mt-4 text-[13px] text-fg-muted">{t('knowledge.preview.unknown')}</p>
      )}
    </Card>
  )
}

/** Step 4 (PRD 6.1): a short guided interview. Saves as you type, so leaving never loses answers. */
export function KnowledgeStep({ view, session }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('knowledge')
  const autosave = useSaveStep()
  const { profile } = view.state
  const locale = session.locations[0]?.locale ?? 'en'
  const pack = getIndustryPack(profile.industry)
  const [draft, setDraft] = useState<Knowledge>(view.state.knowledge)
  const payload = () => ({ services: cleanServices(draft.services), faqs: cleanFaqs(draft.faqs), answers: draft.answers })
  const debounced = useDebounced(draft, 900)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    autosave.mutate({ step: 'knowledge', data: { services: cleanServices(debounced.services), faqs: cleanFaqs(debounced.faqs), answers: debounced.answers } })
    // Only the debounced draft should trigger a save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const setAnswer = (topic: InterviewTopic, value: string) => setDraft((d) => ({ ...d, answers: { ...d.answers, [topic]: value } }))
  const gate = view.gates.find((g) => g.id === 'knowledge')

  return (
    <StepFrame
      view={view}
      step="knowledge"
      title={t('steps.knowledge.title')}
      description={t('steps.knowledge.body')}
      onSave={() => actions.save(payload())}
      aside={<KnowledgePreview view={view} />}
      primary={{ label: t('frame.continue'), pending: actions.pending, onClick: () => actions.complete(payload()) }}
      secondary={
        <Button variant="ghost" disabled={actions.pending} onClick={() => actions.skip({ ...payload(), manual: true })}>
          <Hand />
          {t('knowledge.manual')}
        </Button>
      }
    >
      {gate?.status === 'blocking' && (
        <p className="mb-6 rounded-md border border-border bg-surface-2 p-3 text-[13px] text-fg-muted">{t('knowledge.continueAnyway')}</p>
      )}
      <Section title={t('knowledge.servicesTitle')} description={t('knowledge.servicesBody')}>
        <ServicesEditor
          services={draft.services}
          onChange={(services) => setDraft((d) => ({ ...d, services }))}
          currency={profile.currency}
          market={session.account.market}
          locale={locale}
          industry={profile.industry}
        />
      </Section>

      <Section title={t('knowledge.interviewTitle')} description={t('knowledge.interviewBody')}>
        <div className="flex flex-col gap-5">
          {InterviewTopicSchema.options.map((topic) => {
            const suggestion = pack.answers[topic]
            const value = draft.answers[topic] ?? ''
            return (
              <div key={topic} className="flex flex-col gap-1.5">
                <Label htmlFor={`kn-${topic}`}>{t(`interview.${topic}.question`)}</Label>
                <Textarea id={`kn-${topic}`} rows={2} value={value} placeholder={t(`interview.${topic}.placeholder`)} onChange={(e) => setAnswer(topic, e.target.value)} />
                {suggestion && !value.trim() && (
                  <button
                    type="button"
                    onClick={() => setAnswer(topic, suggestion)}
                    className="flex items-start gap-2 self-start rounded-md border border-dashed border-border px-2.5 py-1.5 text-start text-[13px] text-fg-muted hover:border-brand hover:text-fg"
                  >
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-attention" aria-hidden />
                    <span>{t('knowledge.useSuggestion', { text: suggestion })}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title={t('knowledge.faqsTitle')} description={t('knowledge.faqsBody')}>
        <FaqEditor faqs={draft.faqs} onChange={(faqs) => setDraft((d) => ({ ...d, faqs }))} />
      </Section>
    </StepFrame>
  )
}
