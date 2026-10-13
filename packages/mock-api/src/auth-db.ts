import Dexie, { type Table } from 'dexie'
import type { OutboxMessage, Signup } from '@deskhand/schemas'
import type { ScenarioId } from './scenarios'

export type SignupRecord = Signup & {
  passwordHash: string | null
  marketingOptIn: boolean
  termsAcceptedAt: string
  code: string | null
  attribution: Record<string, string>
}

/** Password sign-ins created by sign-up, invitations or a reset. Seeded people accept any password. */
export type CredentialRecord = { email: string; passwordHash: string; scenario: ScenarioId; userId: string }

export type ResetRecord = { token: string; email: string; expiresAt: string; used: boolean }

export type AttemptRecord = { email: string; failures: number; lockedUntil: string | null }

/**
 * Identity lives outside the per-scenario databases: a sign-up exists before its workspace,
 * and the same person may belong to several businesses.
 */
class AuthDb extends Dexie {
  meta!: Table<{ key: string; value: string | null }, string>
  signups!: Table<SignupRecord, string>
  credentials!: Table<CredentialRecord, string>
  outbox!: Table<OutboxMessage, string>
  resets!: Table<ResetRecord, string>
  attempts!: Table<AttemptRecord, string>

  constructor() {
    super('deskhand-mock-auth')
    this.version(1).stores({
      meta: 'key',
      signups: 'id, email',
      credentials: 'email, scenario',
      outbox: 'id, to, createdAt',
      resets: 'token, email',
      attempts: 'email',
    })
  }
}

let authDb: AuthDb | null = null
export function getAuthDb() {
  authDb ??= new AuthDb()
  return authDb
}

export async function hashPassword(password: string): Promise<string> {
  const bytes = new TextEncoder().encode(`deskhand-mock:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomToken(length = 24) {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}
