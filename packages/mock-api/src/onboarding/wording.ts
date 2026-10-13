import { PRIVACY_LAW } from '@deskhand/config'
import type { MarketCode } from '@deskhand/schemas'

/**
 * Generated compliance wording (PRD 6.1 step 8). It is tenant content in the business's
 * conversation language, editable by the owner, so it is produced here rather than in translations.
 */
export function disclosureText(business: string, employee: string) {
  return `Hi, I'm ${employee}, ${business}'s AI assistant. I can answer questions and book appointments. Ask for a person at any time and someone from the team will take over.`
}

export function consentText(business: string, market: MarketCode) {
  return `By messaging ${business}, you agree that we store this conversation to reply to you and manage your bookings, and that our team may review it. An AI assistant may reply on our behalf. We only send offers if you opt in, and you can reply STOP at any time. Your data is handled under the ${PRIVACY_LAW[market]}.`
}

export function privacyLaw(market: MarketCode) {
  return PRIVACY_LAW[market]
}
