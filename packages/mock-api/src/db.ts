import Dexie, { type Table } from 'dexie'
import type {
  Account,
  AiActionRecord,
  AiMemoryItem,
  Approval,
  Appointment,
  BookingPageSettings,
  Contact,
  Employee,
  EmployeeVersion,
  EvalResult,
  KnowledgeItem,
  ContactNote,
  Conversation,
  Company,
  CustomFieldDef,
  ImportJob,
  Invitation,
  Location,
  Membership,
  Message,
  MessageTemplate,
  Notification,
  OnboardingState,
  Lead,
  Opportunity,
  PaymentRecord,
  PipelineStage,
  ReviewRecord,
  SavedReply,
  Service,
  SmartList,
  SlotHold,
  StaffProfile,
  SuggestionRecord,
  Task,
  TrainingQuestion,
  TranscriptSample,
  User,
  WaitlistEntry,
  Recipe,
  WorkflowRun,
  PlannerPost,
  Campaign,
  TrackLink,
  PaymentLink,
  FormDef,
  FormResponse,
  DailyMetric,
  SitePage,
  PageVersion,
} from '@deskhand/schemas'
import type { ScenarioId } from './scenarios'

export type ConnectionRecord = {
  id: string
  accountId: string
  kind: 'whatsapp' | 'webchat' | 'email' | 'sms' | 'messenger' | 'instagram' | 'google_calendar' | 'payments'
  health: 'healthy' | 'degraded' | 'broken'
  problem: string | null
}

export type JoinLinkRecord = {
  id: string
  accountId: string
  token: string
  role: 'admin' | 'manager' | 'staff' | 'readonly'
  expiresAt: string
  createdAt: string
}

export type JoinRequestRecord = {
  id: string
  accountId: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'staff' | 'readonly'
  status: 'pending' | 'approved' | 'denied'
  createdAt: string
}

export type InvoiceRecord = {
  id: string
  accountId: string
  number: string
  amount: number
  currency: string
  status: 'paid' | 'open' | 'void'
  issuedAt: string
}

export type DeviceSessionRecord = {
  id: string
  accountId: string
  device: string
  location: string
  current: boolean
  lastActiveAt: string
}

export type AuditEventRecord = {
  id: string
  accountId: string
  actor: string
  action: string
  target: string
  createdAt: string
}

export type ComplianceStateRecord = {
  id: string
  accountId: string
  disclosureVerified: boolean
  disclosureByLang: Record<string, string>
  storedNotice: string
  consentWording: string
  marketingWordingReady: boolean
  smsConsentConfigured: boolean
  recordingEnabled: boolean
  recordingNotice: string
  allPartyAcknowledged: boolean
  staffMonitoringAcceptedAt: string | null
  legalHold: boolean
  regionChangeRequested: boolean
  prohibitedUsesAcceptedAt: string | null
  regulatorRegistered: boolean
  lastDisclosureTest: { at: string; channel: 'whatsapp' | 'webchat' | 'email' | 'sms' | 'messenger' | 'instagram' | 'voice'; language: string; appeared: boolean } | null
  retention: {
    messages: number
    recordings: number
    contacts: number
    bookings: number
    reviews: number
    audit: number
    backups: number
  }
}

export type ConsentLedgerRecord = {
  id: string
  accountId: string
  contactId: string
  contactName: string
  purpose: string
  channel: 'whatsapp' | 'webchat' | 'email' | 'sms' | 'messenger' | 'instagram' | 'voice'
  status: 'granted' | 'withdrawn' | 'missing'
  source: string
  wordingVersion: string
  recordedAt: string
  proof: string
}

export type ConsentWordingRecord = {
  id: string
  accountId: string
  version: string
  purpose: string
  surface: string
  text: string
  createdAt: string
  current: boolean
}

export type SuppressionRecord = {
  id: string
  accountId: string
  contactId: string | null
  contactName: string
  channel: ConsentLedgerRecord['channel']
  source: string
  reason: string
  createdAt: string
}

export type DsarRecord = {
  id: string
  accountId: string
  type: 'access' | 'correct' | 'delete' | 'restrict' | 'object' | 'human_review'
  requester: string
  contactId: string | null
  receivedAt: string
  status: 'received' | 'verified' | 'in_progress' | 'completed'
  assignee: string | null
}

export type LegalAcceptanceRecord = {
  id: string
  accountId: string
  documentId: string
  version: string
  acceptedAt: string | null
  acceptedBy: string | null
}

export type SupportAccessRecord = {
  id: string
  accountId: string
  actor: string
  reason: string
  status: 'pending' | 'active' | 'ended'
  expiresAt: string | null
  createdAt: string
}

export type AiIncidentRecord = {
  id: string
  accountId: string
  summary: string
  status: string
  createdAt: string
}

export type ConnectionEventRecord = {
  id: string
  accountId: string
  kind: ConnectionRecord['kind'] | 'gbp' | 'outlook' | 'google_contacts'
  action: 'connected' | 'failed' | 'disconnected' | 'health_changed' | 'tested' | 'fixed'
  actorName: string
  detail: string
  createdAt: string
  createdBy: { kind: 'person'; id?: string; name?: string }
}

export type MergeUndoRecord = {
  id: string
  accountId: string
  winnerId: string
  loser: Contact
  conversationsMoved: string[]
  createdAt: string
  undoUntil: string
}

export type MetaRecord = { key: string; value: unknown }

export const SEED_VERSION = 23
export const TABLES = [
  'accounts',
  'locations',
  'users',
  'memberships',
  'contacts',
  'conversations',
  'approvals',
  'notifications',
  'connections',
  'invitations',
  'onboarding',
  'messages',
  'templates',
  'savedReplies',
  'appointments',
  'tasks',
  'reviews',
  'payments',
  'aiActions',
  'suggestions',
  'notes',
  'memories',
  'customFields',
  'importJobs',
  'mergeUndos',
  'pipelineStages',
  'opportunities',
  'leads',
  'services',
  'staffProfiles',
  'slotHolds',
  'bookingPages',
  'waitlist',
  'employees',
  'employeeVersions',
  'knowledgeItems',
  'trainingInbox',
  'evalResults',
  'transcriptSamples',
  'recipes',
  'workflowRuns',
  'plannerPosts',
  'campaigns',
  'trackLinks',
  'paymentLinks',
  'forms',
  'formResponses',
  'dailyMetrics',
  'sitePages',
  'pageVersions',
  'invoices',
  'joinLinks',
  'joinRequests',
  'deviceSessions',
  'auditEvents',
  'connectionEvents',
  'complianceState',
  'consentLedger',
  'consentWordings',
  'suppressionList',
  'dsarRequests',
  'legalAcceptances',
  'supportAccess',
  'aiIncidents',
  'smartLists',
  'companies',
] as const
export type TableName = (typeof TABLES)[number]

/** One IndexedDB database per scenario (FE-DOC 8.6). Add a new version() block for every schema change. */
export class MockDb extends Dexie {
  meta!: Table<MetaRecord, string>
  accounts!: Table<Account, string>
  locations!: Table<Location, string>
  users!: Table<User, string>
  memberships!: Table<Membership, string>
  contacts!: Table<Contact, string>
  conversations!: Table<Conversation, string>
  approvals!: Table<Approval, string>
  notifications!: Table<Notification, string>
  connections!: Table<ConnectionRecord, string>
  invitations!: Table<Invitation, string>
  onboarding!: Table<OnboardingState, string>
  messages!: Table<Message, string>
  templates!: Table<MessageTemplate, string>
  savedReplies!: Table<SavedReply, string>
  appointments!: Table<Appointment, string>
  tasks!: Table<Task, string>
  reviews!: Table<ReviewRecord, string>
  payments!: Table<PaymentRecord, string>
  aiActions!: Table<AiActionRecord, string>
  suggestions!: Table<SuggestionRecord, string>
  notes!: Table<ContactNote, string>
  memories!: Table<AiMemoryItem, string>
  customFields!: Table<CustomFieldDef, string>
  importJobs!: Table<ImportJob, string>
  mergeUndos!: Table<MergeUndoRecord, string>
  pipelineStages!: Table<PipelineStage, string>
  opportunities!: Table<Opportunity, string>
  leads!: Table<Lead, string>
  services!: Table<Service, string>
  staffProfiles!: Table<StaffProfile, string>
  slotHolds!: Table<SlotHold, string>
  bookingPages!: Table<BookingPageSettings, string>
  waitlist!: Table<WaitlistEntry, string>
  employees!: Table<Employee, string>
  employeeVersions!: Table<EmployeeVersion, string>
  knowledgeItems!: Table<KnowledgeItem, string>
  trainingInbox!: Table<TrainingQuestion, string>
  evalResults!: Table<EvalResult, string>
  transcriptSamples!: Table<TranscriptSample, string>
  recipes!: Table<Recipe, string>
  workflowRuns!: Table<WorkflowRun, string>
  plannerPosts!: Table<PlannerPost, string>
  campaigns!: Table<Campaign, string>
  trackLinks!: Table<TrackLink, string>
  paymentLinks!: Table<PaymentLink, string>
  forms!: Table<FormDef, string>
  formResponses!: Table<FormResponse, string>
  dailyMetrics!: Table<DailyMetric, string>
  sitePages!: Table<SitePage, string>
  pageVersions!: Table<PageVersion, string>
  invoices!: Table<InvoiceRecord, string>
  joinLinks!: Table<JoinLinkRecord, string>
  joinRequests!: Table<JoinRequestRecord, string>
  deviceSessions!: Table<DeviceSessionRecord, string>
  auditEvents!: Table<AuditEventRecord, string>
  connectionEvents!: Table<ConnectionEventRecord, string>
  complianceState!: Table<ComplianceStateRecord, string>
  consentLedger!: Table<ConsentLedgerRecord, string>
  consentWordings!: Table<ConsentWordingRecord, string>
  suppressionList!: Table<SuppressionRecord, string>
  dsarRequests!: Table<DsarRecord, string>
  legalAcceptances!: Table<LegalAcceptanceRecord, string>
  supportAccess!: Table<SupportAccessRecord, string>
  aiIncidents!: Table<AiIncidentRecord, string>
  smartLists!: Table<SmartList, string>
  companies!: Table<Company, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      meta: 'key',
      accounts: 'id, slug',
      locations: 'id, accountId',
      users: 'id, email',
      memberships: 'id, accountId, userId, role',
      contacts: 'id, accountId, locationId, assignedUserId, createdAt',
      conversations: 'id, accountId, locationId, status, assignedUserId, lastMessageAt',
      approvals: 'id, accountId, locationId, status',
      notifications: 'id, accountId, read, createdAt',
      connections: 'id, accountId, kind',
    })
    this.version(2).stores({
      invitations: 'id, accountId, &token, email',
      onboarding: 'accountId',
    })
    this.version(3).stores({
      messages: 'id, accountId, conversationId, createdAt',
      templates: 'id, accountId, status',
      savedReplies: 'id, accountId',
      appointments: 'id, accountId, locationId, startsAt',
      tasks: 'id, accountId, dueAt',
      reviews: 'id, accountId, status',
      payments: 'id, accountId, contactId',
      aiActions: 'id, accountId, createdAt',
      suggestions: 'id, accountId',
      notes: 'id, accountId, contactId, createdAt',
      memories: 'id, accountId, contactId',
      customFields: 'id, accountId',
      importJobs: 'id, accountId',
      mergeUndos: 'id, accountId',
    })
    this.version(4).stores({
      pipelineStages: 'id, accountId, order',
      opportunities: 'id, accountId, locationId, stageId, contactId',
      services: 'id, accountId, locationId',
      staffProfiles: 'id, accountId, userId, locationId',
      slotHolds: 'id, accountId, token, startsAt, expiresAt',
      bookingPages: 'id, accountId, locationId, slug',
      waitlist: 'id, accountId, startsAt',
    })
    this.version(5).stores({
      employees: 'id, accountId, locationId, status',
      employeeVersions: 'id, accountId, employeeId, number',
      knowledgeItems: 'id, accountId, collection, status',
      trainingInbox: 'id, accountId',
      evalResults: 'id, employeeId, language',
      transcriptSamples: 'id, accountId, employeeId',
    })
    this.version(6).stores({
      recipes: 'id, accountId, enabled',
      workflowRuns: 'id, accountId, recipeId',
      plannerPosts: 'id, accountId, status',
      campaigns: 'id, accountId, status',
      trackLinks: 'id, accountId',
      paymentLinks: 'id, accountId, status',
      forms: 'id, accountId',
      formResponses: 'id, accountId, formId',
    })
    this.version(7).stores({
      dailyMetrics: 'id, accountId, locationId, day',
      sitePages: 'id, accountId, slug, status',
      pageVersions: 'id, accountId, pageId, number',
    })
    this.version(8).stores({
      invoices: 'id, accountId',
      joinLinks: 'id, accountId, token',
      joinRequests: 'id, accountId, status',
      deviceSessions: 'id, accountId',
      auditEvents: 'id, accountId, createdAt',
      connectionEvents: 'id, accountId, kind',
    })
    this.version(9).stores({
      complianceState: 'id, accountId',
      consentLedger: 'id, accountId, contactId',
      consentWordings: 'id, accountId',
      suppressionList: 'id, accountId',
      dsarRequests: 'id, accountId, status',
      legalAcceptances: 'id, accountId',
      supportAccess: 'id, accountId, status',
      aiIncidents: 'id, accountId',
    })
    this.version(10).stores({
      leads: 'id, accountId, contactId, status',
    })
    this.version(11).stores({
      smartLists: 'id, accountId',
      companies: 'id, accountId, locationId',
    })
  }
}

const cache = new Map<ScenarioId, MockDb>()

export function dbName(scenario: ScenarioId) {
  return `deskhand-mock-${scenario}`
}

export function getDb(scenario: ScenarioId): MockDb {
  let db = cache.get(scenario)
  if (!db) {
    db = new MockDb(dbName(scenario))
    cache.set(scenario, db)
  }
  return db
}

export async function deleteDb(scenario: ScenarioId) {
  const db = cache.get(scenario)
  db?.close()
  cache.delete(scenario)
  await Dexie.delete(dbName(scenario))
}

/** Separate store for named snapshots so they survive scenario resets. */
class SnapshotDb extends Dexie {
  snapshots!: Table<{ id: string; scenario: ScenarioId; name: string; createdAt: string; data: Dump }, string>
  constructor() {
    super('deskhand-mock-snapshots')
    this.version(1).stores({ snapshots: 'id, scenario, createdAt' })
  }
}

export type Dump = { scenario: ScenarioId; seedVersion: number; tables: Record<TableName, unknown[]>; meta: MetaRecord[] }

let snapshotDb: SnapshotDb | null = null
export function getSnapshotDb() {
  snapshotDb ??= new SnapshotDb()
  return snapshotDb
}
