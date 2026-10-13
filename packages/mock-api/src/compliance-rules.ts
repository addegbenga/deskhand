import type { ChecklistItem, MarketPack } from '@deskhand/schemas'
import { HOUR, now } from './clock'
import type { ComplianceStateRecord, DsarRecord } from './db'

export const ESCALATE_HOURS = 48

export function dueAt(receivedAt: string, dsrDays: number) {
  return new Date(new Date(receivedAt).getTime() + dsrDays * 24 * HOUR).toISOString()
}

export function slaFor(record: { receivedAt: string; status: DsarRecord['status'] }, dsrDays: number) {
  const due = new Date(dueAt(record.receivedAt, dsrDays)).getTime()
  const remainingHours = (due - now().getTime()) / HOUR
  const open = record.status !== 'completed'
  const overdue = open && remainingHours < 0
  const escalate = open && remainingHours <= ESCALATE_HOURS
  return { remainingHours, overdue, escalate, dueAt: dueAt(record.receivedAt, dsrDays) }
}

function item(
  id: string,
  area: ChecklistItem['area'],
  status: ChecklistItem['status'],
  reasonKey: string,
  fixHref: string,
  escalate = false,
): ChecklistItem {
  return { id, area, status, reasonKey, fixHref, escalate }
}

/** Checklist from pack flags + account state (FR-CC.1). New market flags add items without UI changes. */
export function computeChecklist(pack: MarketPack, state: ComplianceStateRecord, dsars: DsarRecord[]): ChecklistItem[] {
  const profile = pack.complianceProfile
  const items: ChecklistItem[] = []

  if (profile.aiDisclosureRequired) {
    items.push(
      item(
        'disclosure',
        'disclosure',
        state.disclosureVerified ? 'done' : 'blocking',
        state.disclosureVerified ? 'ok' : 'missing',
        '/app/compliance/disclosure',
      ),
    )
  }

  items.push(
    item(
      'consent_wording',
      'consent',
      state.consentWording.trim() ? 'done' : 'attention',
      state.consentWording.trim() ? 'ok' : 'missing',
      '/app/compliance/consent',
    ),
  )

  if (profile.marketingOptInRequired) {
    items.push(
      item(
        'marketing_opt_in',
        'consent',
        state.marketingWordingReady ? 'done' : 'attention',
        state.marketingWordingReady ? 'ok' : 'missing',
        '/app/compliance/consent',
      ),
    )
  }

  if (profile.smsConsentStrict) {
    items.push(
      item(
        'sms_consent',
        'consent',
        state.smsConsentConfigured ? 'done' : 'attention',
        state.smsConsentConfigured ? 'ok' : 'missing',
        '/app/compliance/consent',
      ),
    )
  }

  if (profile.quietHours) {
    items.push(item('quiet_hours', 'consent', 'done', 'ok', '/app/compliance/consent'))
  }

  if (profile.allPartyConsent) {
    items.push(
      item(
        'all_party',
        'recording',
        state.allPartyAcknowledged ? 'done' : 'attention',
        state.allPartyAcknowledged ? 'ok' : 'missing',
        '/app/compliance/recording',
      ),
    )
  }

  items.push(
    item(
      'recording_notice',
      'recording',
      !state.recordingEnabled || state.recordingNotice.trim() ? 'done' : 'attention',
      'ok',
      '/app/compliance/recording',
    ),
  )

  items.push(item('data_region', 'data', 'done', 'ok', '/app/compliance/data'))

  const slas = dsars.map((row) => slaFor(row, profile.dsrDays))
  if (slas.some((row) => row.overdue)) {
    items.push(item('dsr_overdue', 'requests', 'attention', 'overdue', '/app/compliance/requests', true))
  } else if (slas.some((row) => row.escalate)) {
    items.push(item('dsr_deadline', 'requests', 'attention', 'soon', '/app/compliance/requests', true))
  } else {
    items.push(item('dsr_queue', 'requests', 'done', 'ok', '/app/compliance/requests'))
  }

  items.push(
    item(
      'prohibited_uses',
      'ai',
      state.prohibitedUsesAcceptedAt ? 'done' : 'attention',
      state.prohibitedUsesAcceptedAt ? 'ok' : 'missing',
      '/app/compliance/ai',
    ),
  )

  if (profile.ownerMustRegister) {
    items.push(
      item(
        'regulator_register',
        'legal',
        state.regulatorRegistered ? 'done' : 'attention',
        state.regulatorRegistered ? 'ok' : 'missing',
        '/app/compliance/legal',
      ),
    )
  }

  items.push(item('legal_docs', 'legal', 'done', 'ok', '/app/compliance/legal'))

  return items
}

export function blockingIds(items: ChecklistItem[]) {
  return items.filter((row) => row.status === 'blocking').map((row) => row.id)
}

export function ownerDoesKeys(pack: MarketPack) {
  const keys: string[] = ['marketing_truth']
  if (pack.complianceProfile.ownerMustRegister) keys.push('register')
  if (pack.complianceProfile.marketingOptInRequired) keys.push('opt_in')
  if (pack.complianceProfile.allPartyConsent) keys.push('recording_consent')
  return keys
}

export function productDoesKeys() {
  return ['disclosure', 'consent_capture', 'dsr_queue', 'audit']
}
