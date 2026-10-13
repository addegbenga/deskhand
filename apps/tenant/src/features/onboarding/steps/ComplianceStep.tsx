import { Lock } from 'lucide-react'
import { useState } from 'react'
import { LEGAL_VERSIONS } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import type { ComplianceSetup } from '@deskhand/schemas'
import { Checkbox, ChoiceCard, ChoiceCards, FieldError, FieldHint, Input, Label, Switch, Textarea } from '@deskhand/ui'
import { LegalDialog } from '../../auth/LegalDialog'
import { isManual, Section, StepFrame, useStepActions } from '../StepFrame'
import type { StepProps } from './types'

/** Step 8 (PRD 6.1, 29.16): legal name, AI disclosure, consent wording, privacy policy, terms and DPA. */
export function ComplianceStep({ view }: StepProps) {
  const { t } = useTranslation('onboarding')
  const actions = useStepActions('compliance')
  const manual = isManual(view)
  const initial = view.state.compliance
  const [form, setForm] = useState<ComplianceSetup>({
    ...initial,
    legalName: initial.legalName || view.state.profile.name,
    registeredAddress: initial.registeredAddress || view.state.profile.address,
    aiDisclosure: manual ? initial.aiDisclosure : true,
    disclosureText: initial.disclosureText || view.wording.disclosure,
    consentText: initial.consentText || view.wording.consent,
  })
  const [terms, setTerms] = useState(Boolean(initial.termsAcceptedAt))
  const [dpa, setDpa] = useState(Boolean(initial.dpaAcceptedAt))
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof ComplianceSetup>(key: K, value: ComplianceSetup[K]) => setForm((f) => ({ ...f, [key]: value }))
  const privacyKind = form.privacyPolicy?.kind ?? 'generated'
  const payload = () => ({
    legalName: form.legalName.trim(),
    registeredAddress: form.registeredAddress.trim(),
    aiDisclosure: form.aiDisclosure,
    disclosureText: form.disclosureText,
    consentText: form.consentText,
    consentConfirmed: form.consentConfirmed,
    privacyPolicy: form.privacyPolicy ?? { kind: 'generated' as const, url: `${view.bookingPageHref}/privacy` },
    acceptTerms: terms,
    acceptDpa: dpa,
  })
  const linkOk = privacyKind === 'generated' || /^https?:\/\/\S+\.\S+/.test(form.privacyPolicy?.url ?? '')
  const valid = form.legalName.trim().length >= 2 && form.consentConfirmed && terms && dpa && linkOk

  return (
    <StepFrame
      view={view}
      step="compliance"
      title={t('steps.compliance.title')}
      description={t('steps.compliance.body', { law: view.wording.privacyLaw })}
      onSave={() => actions.save(payload())}
      primary={{
        label: t('frame.continue'),
        pending: actions.pending,
        onClick: () => {
          setTouched(true)
          if (valid) actions.complete(payload())
        },
      }}
    >
      <Section title={t('compliance.business')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-legal">{t('compliance.legalName')}</Label>
            <Input id="cp-legal" value={form.legalName} onChange={(e) => set('legalName', e.target.value)} aria-invalid={(touched && form.legalName.trim().length < 2) || undefined} />
            <FieldHint>{t('compliance.legalNameHint')}</FieldHint>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cp-address">{t('compliance.registeredAddress')}</Label>
            <Input id="cp-address" value={form.registeredAddress} onChange={(e) => set('registeredAddress', e.target.value)} />
          </div>
        </div>
      </Section>

      <Section title={t('compliance.disclosure')} description={manual ? t('compliance.disclosureManual') : t('compliance.disclosureBody')}>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={form.aiDisclosure} disabled={!manual} onCheckedChange={(v) => set('aiDisclosure', v)} />
          {t('compliance.disclosureSwitch')}
          {!manual && (
            <span className="flex items-center gap-1 text-[13px] text-fg-muted">
              <Lock className="size-3.5" aria-hidden />
              {t('compliance.locked')}
            </span>
          )}
        </label>
        {form.aiDisclosure && (
          <div className="mt-4 flex flex-col gap-1.5">
            <Label htmlFor="cp-disclosure">{t('compliance.disclosureText')}</Label>
            <Textarea id="cp-disclosure" rows={2} value={form.disclosureText} onChange={(e) => set('disclosureText', e.target.value)} />
          </div>
        )}
      </Section>

      <Section title={t('compliance.consent')} description={t('compliance.consentBody')}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cp-consent">{t('compliance.consentText')}</Label>
          <Textarea id="cp-consent" rows={3} value={form.consentText} onChange={(e) => set('consentText', e.target.value)} />
        </div>
        <label className="mt-3 flex items-start gap-3 text-sm">
          <Checkbox checked={form.consentConfirmed} onCheckedChange={(v) => set('consentConfirmed', v === true)} className="mt-0.5" aria-invalid={(touched && !form.consentConfirmed) || undefined} />
          {t('compliance.consentConfirm')}
        </label>
      </Section>

      <Section title={t('compliance.privacy')} description={t('compliance.privacyBody', { law: view.wording.privacyLaw })}>
        <ChoiceCards
          value={privacyKind}
          onValueChange={(kind) =>
            set('privacyPolicy', kind === 'generated' ? { kind: 'generated', url: `${view.bookingPageHref}/privacy` } : { kind: 'link', url: form.privacyPolicy?.kind === 'link' ? form.privacyPolicy.url : '' })
          }
          className="sm:grid-cols-2"
        >
          <ChoiceCard value="generated" title={t('compliance.generate')} description={t('compliance.generateBody')} />
          <ChoiceCard value="link" title={t('compliance.ownLink')} description={t('compliance.ownLinkBody')} />
        </ChoiceCards>
        {privacyKind === 'link' && (
          <div className="mt-3 flex max-w-md flex-col gap-1.5">
            <Label htmlFor="cp-privacy">{t('compliance.privacyUrl')}</Label>
            <Input
              id="cp-privacy"
              dir="ltr"
              inputMode="url"
              placeholder={t('compliance.privacyPlaceholder')}
              value={form.privacyPolicy?.url ?? ''}
              onChange={(e) => set('privacyPolicy', { kind: 'link', url: e.target.value })}
              aria-invalid={(touched && !linkOk) || undefined}
            />
            {touched && !linkOk && <FieldError>{t('errors.url')}</FieldError>}
          </div>
        )}
        <p className="mt-4 text-[13px] text-fg-muted">{t('compliance.recording')}</p>
      </Section>

      <Section title={t('compliance.agreements')}>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-start gap-3">
            <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" aria-invalid={(touched && !terms) || undefined} />
            <span>
              {t('compliance.acceptPrefix')} <LegalDialog doc="terms" label={t('compliance.terms', { version: LEGAL_VERSIONS.terms })} />
            </span>
          </label>
          <label className="flex items-start gap-3">
            <Checkbox checked={dpa} onCheckedChange={(v) => setDpa(v === true)} className="mt-0.5" aria-invalid={(touched && !dpa) || undefined} />
            <span>
              {t('compliance.acceptPrefix')} <LegalDialog doc="dpa" label={t('compliance.dpa', { version: LEGAL_VERSIONS.dpa })} />
            </span>
          </label>
        </div>
        {touched && !valid && <FieldError className="mt-3">{t('compliance.incomplete')}</FieldError>}
      </Section>
    </StepFrame>
  )
}
