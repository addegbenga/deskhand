import type { AccountState, AiMode, MarketCode, Milestone, Plan } from '@deskhand/schemas'

export type ScenarioId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export type ScenarioDefinition = {
  id: ScenarioId
  available: boolean
  business: string
  slug: string
  industry: 'salon' | 'clinic' | 'barber' | 'real_estate' | 'bakery'
  market: MarketCode
  locations: { name: string; city: string; address: string }[]
  state: AccountState
  plan: Plan
  aiMode: AiMode
  employeeName: string | null
  milestones: Milestone[]
  volume: 'full' | 'empty'
  team: { owner: string; admin: string; manager: string; staff: string; readonly: string }
  brandColor: string
  troubles?: {
    whatsappQualityLow?: boolean
    templateRejected?: string
    calendarTokenExpired?: boolean
    complianceBlocking?: boolean
  }
}

/** Seed scenarios (FE-DOC 8.2). G (agency) arrives with the workspace switcher. */
export const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  A: {
    id: 'A',
    available: true,
    business: 'Amaka Braids',
    slug: 'amaka-braids',
    industry: 'salon',
    market: 'NG',
    locations: [
      { name: 'Lekki', city: 'Lagos', address: '14 Admiralty Way, Lekki Phase 1' },
      { name: 'Ikeja', city: 'Lagos', address: '22 Allen Avenue, Ikeja' },
    ],
    state: 'active',
    plan: 'growth',
    aiMode: 'on',
    employeeName: 'Ada',
    milestones: ['profile_complete', 'first_channel_live', 'ai_taught', 'ai_live', 'first_lead_handled'],
    volume: 'full',
    team: {
      owner: 'Amaka Obi',
      admin: 'Chidi Okeke',
      manager: 'Funke Adebayo',
      staff: 'Tola Bello',
      readonly: 'Emeka Nwosu',
    },
    brandColor: '#0F766E',
  },
  B: {
    id: 'B',
    available: true,
    business: 'Okoye Dental',
    slug: 'okoye-dental',
    industry: 'clinic',
    market: 'NG',
    locations: [{ name: 'Wuse 2', city: 'Abuja', address: '5 Aminu Kano Crescent, Wuse 2' }],
    state: 'active',
    plan: 'starter',
    aiMode: 'manual',
    employeeName: null,
    milestones: ['profile_complete', 'first_channel_live'],
    volume: 'full',
    team: {
      owner: 'Dr. Ngozi Okoye',
      admin: 'Ibrahim Musa',
      manager: 'Halima Yusuf',
      staff: 'Blessing Eze',
      readonly: 'Segun Ajayi',
    },
    brandColor: '#1D4ED8',
  },
  C: {
    id: 'C',
    available: true,
    business: 'Brixton Barbers',
    slug: 'brixton-barbers',
    industry: 'barber',
    market: 'UK',
    locations: [{ name: 'Brixton', city: 'London', address: '41 Atlantic Road, Brixton' }],
    state: 'active',
    plan: 'growth',
    aiMode: 'suggest_only',
    employeeName: 'Sam',
    milestones: ['profile_complete', 'first_channel_live', 'ai_taught', 'ai_live'],
    volume: 'full',
    team: {
      owner: 'Marcus Reid',
      admin: 'Priya Shah',
      manager: 'Jordan Ellis',
      staff: 'Kwame Mensah',
      readonly: 'Helen Clarke',
    },
    brandColor: '#B45309',
  },
  D: {
    id: 'D',
    available: true,
    business: 'Lone Star Realty',
    slug: 'lone-star-realty',
    industry: 'real_estate',
    market: 'US',
    locations: [{ name: 'Austin', city: 'Austin', address: '600 Congress Ave, Austin, TX' }],
    state: 'trial',
    plan: 'pro',
    aiMode: 'on',
    employeeName: 'Riley',
    milestones: ['profile_complete', 'first_channel_live', 'ai_taught'],
    volume: 'full',
    team: {
      owner: 'Dana Whitfield',
      admin: 'Carlos Mendoza',
      manager: 'Ashley Turner',
      staff: 'Tyler Brooks',
      readonly: 'Robert Hayes',
    },
    brandColor: '#7C2D12',
  },
  E: {
    id: 'E',
    available: true,
    business: 'Ife Cakes',
    slug: 'ife-cakes',
    industry: 'bakery',
    market: 'NG',
    locations: [{ name: 'Yaba', city: 'Lagos', address: '' }],
    state: 'trial',
    plan: 'starter',
    aiMode: 'manual',
    employeeName: null,
    milestones: [],
    volume: 'empty',
    team: {
      owner: 'Ifeoma Adeyemi',
      admin: 'Kunle Adeyemi',
      manager: 'Bisi Lawal',
      staff: 'Dayo Ojo',
      readonly: 'Ade Martins',
    },
    brandColor: '#0F766E',
  },
  F: {
    id: 'F',
    available: true,
    business: 'Glow Studio',
    slug: 'glow-studio',
    industry: 'salon',
    market: 'NG',
    locations: [{ name: 'Surulere', city: 'Lagos', address: '9 Adeniran Ogunsanya Street, Surulere' }],
    state: 'past_due',
    plan: 'growth',
    aiMode: 'on',
    employeeName: 'Kemi',
    milestones: ['profile_complete', 'first_channel_live', 'ai_taught'],
    volume: 'full',
    team: {
      owner: 'Kemi Balogun',
      admin: 'Uche Obi',
      manager: 'Sade Ola',
      staff: 'Yinka Ade',
      readonly: 'Femi Kuti',
    },
    brandColor: '#BE185D',
    troubles: {
      whatsappQualityLow: true,
      templateRejected: 'booking_reminder',
      calendarTokenExpired: true,
      complianceBlocking: true,
    },
  },
  G: {
    id: 'G',
    available: false,
    business: 'Growth Partners Agency',
    slug: 'growth-partners',
    industry: 'salon',
    market: 'NG',
    locations: [],
    state: 'active',
    plan: 'pro',
    aiMode: 'on',
    employeeName: null,
    milestones: [],
    volume: 'empty',
    team: { owner: 'Agency Owner', admin: '', manager: '', staff: '', readonly: '' },
    brandColor: '#0F766E',
  },
}

export const SCENARIO_IDS = Object.keys(SCENARIOS) as ScenarioId[]
