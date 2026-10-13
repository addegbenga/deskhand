import type { Goal, Industry, InterviewTopic, MarketCode } from '@deskhand/schemas'

/**
 * Industry packs (PRD 10). Pack content is tenant data in the pack's language, not UI copy:
 * owners edit it, and it stays unverified until they confirm it (FR-IP.4).
 */
export type IndustryPack = {
  id: string
  industry: Industry
  version: string
  /** Sample prices are hints only. Pack services start without a price. */
  services: { name: string; durationMin: number; sampleUsd: number }[]
  faqs: { question: string; answer: string }[]
  answers: Partial<Record<InterviewTopic, string>>
  templates: { name: string; category: 'utility' | 'marketing' }[]
  /** Keyword hints the website parser uses to suggest this pack. */
  keywords: string[]
}

const BASE_TEMPLATES: IndustryPack['templates'] = [
  { name: 'booking_confirmation', category: 'utility' },
  { name: 'booking_reminder', category: 'utility' },
  { name: 'review_request', category: 'marketing' },
]

const COMMON_ANSWERS: Partial<Record<InterviewTopic, string>> = {
  never_promise: 'Never offer discounts, refunds or exact finish times. Never confirm a price that is not in the price list.',
  handoff: 'Complaints, refund requests, group or corporate bookings, and anything you are not sure about.',
}

const packs: IndustryPack[] = [
  {
    id: 'salon-beauty',
    industry: 'salon',
    version: '1.2.0',
    keywords: ['salon', 'braid', 'hair', 'beauty', 'nail', 'lash', 'wig', 'spa'],
    services: [
      { name: 'Knotless braids (medium)', durationMin: 300, sampleUsd: 25 },
      { name: 'Cornrows', durationMin: 120, sampleUsd: 8 },
      { name: 'Wash and style', durationMin: 60, sampleUsd: 6 },
      { name: 'Wig install', durationMin: 90, sampleUsd: 20 },
      { name: 'Silk press', durationMin: 120, sampleUsd: 15 },
    ],
    faqs: [
      { question: 'Do I need to bring my own hair extensions?', answer: 'You can bring your own or buy from us on the day. We will confirm the amount you need when you book.' },
      { question: 'What happens if I am late?', answer: 'We hold your slot for 15 minutes. After that we may need to reschedule.' },
      { question: 'Do you take a deposit?', answer: 'Yes, long services need a deposit to secure the slot. It comes off your final bill.' },
      { question: 'Do you do home service?', answer: 'Home service is available in some areas for an extra fee. Ask us for your area.' },
    ],
    answers: {
      booking: 'Book by message or on our booking page. Services over 3 hours need a deposit.',
      cancellation: 'Cancel or move your booking at least 24 hours before. Deposits are not refunded for no-shows.',
      payment: 'Bank transfer, card or cash. Deposits by transfer or payment link.',
      delivery: 'Home service in nearby areas for an extra fee.',
      ...COMMON_ANSWERS,
    },
    templates: [...BASE_TEMPLATES, { name: 'deposit_request', category: 'utility' }],
  },
  {
    id: 'barber',
    industry: 'barber',
    version: '1.0.0',
    keywords: ['barber', 'fade', 'cuts', 'grooming', 'shave'],
    services: [
      { name: 'Skin fade', durationMin: 45, sampleUsd: 30 },
      { name: 'Beard trim', durationMin: 20, sampleUsd: 15 },
      { name: 'Kids cut', durationMin: 30, sampleUsd: 20 },
      { name: 'Hot towel shave', durationMin: 30, sampleUsd: 25 },
    ],
    faqs: [
      { question: 'Do you take walk-ins?', answer: 'Yes, when a chair is free. Booking guarantees your time.' },
      { question: 'How long does a fade take?', answer: 'About 45 minutes.' },
      { question: 'Can I book for two people?', answer: 'Yes, book back-to-back slots or two chairs at the same time.' },
    ],
    answers: {
      booking: 'Book online or by message. No deposit needed.',
      cancellation: 'Let us know at least 2 hours before if you cannot make it.',
      payment: 'Card or cash.',
      delivery: 'We do not offer home visits.',
      ...COMMON_ANSWERS,
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'clinic-dental',
    industry: 'clinic',
    version: '1.0.0',
    keywords: ['dental', 'clinic', 'dentist', 'health', 'medical', 'physio', 'teeth'],
    services: [
      { name: 'Consultation', durationMin: 30, sampleUsd: 15 },
      { name: 'Scaling and polishing', durationMin: 45, sampleUsd: 25 },
      { name: 'Teeth whitening', durationMin: 60, sampleUsd: 80 },
      { name: 'Filling', durationMin: 45, sampleUsd: 40 },
    ],
    faqs: [
      { question: 'Do you accept health insurance?', answer: 'We work with several insurers. Send us your provider and we will confirm.' },
      { question: 'What should I bring to my first visit?', answer: 'A photo ID and any previous dental records you have.' },
      { question: 'Do you handle emergencies?', answer: 'Call us straight away. For severe pain or swelling outside opening hours, go to the nearest emergency unit.' },
    ],
    answers: {
      booking: 'Book by message or on our booking page.',
      cancellation: 'Please give 24 hours notice to cancel or reschedule.',
      payment: 'Card, transfer or insurance.',
      delivery: 'All treatment happens at the clinic.',
      never_promise: 'Never give medical advice, diagnoses or treatment outcomes. Never confirm insurance cover.',
      handoff: 'Any symptom, pain or medical question, complaints, and insurance questions.',
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'real-estate',
    industry: 'real_estate',
    version: '1.0.0',
    keywords: ['realty', 'real estate', 'homes', 'property', 'properties', 'estate', 'realtor', 'lettings'],
    services: [
      { name: 'Property viewing', durationMin: 45, sampleUsd: 0 },
      { name: 'Buyer consultation', durationMin: 60, sampleUsd: 0 },
      { name: 'Listing consultation', durationMin: 60, sampleUsd: 0 },
    ],
    faqs: [
      { question: 'Do you handle rentals?', answer: 'Yes, we help with both sales and rentals.' },
      { question: 'Can I book a viewing at the weekend?', answer: 'Yes, Saturday viewings are available on request.' },
      { question: 'Do I need to be pre-approved?', answer: 'It helps, and we can introduce you to a lender.' },
    ],
    answers: {
      booking: 'Viewings are booked by message or on our booking page.',
      cancellation: 'Let us know as early as you can so we can tell the seller.',
      payment: 'Consultations are free.',
      delivery: 'We meet you at the property.',
      never_promise: 'Never negotiate prices, guarantee availability or make claims about value or returns.',
      handoff: 'Offers, price negotiation, legal questions and complaints.',
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'bakery',
    industry: 'bakery',
    version: '1.0.0',
    keywords: ['cake', 'bake', 'bakery', 'pastry', 'dessert', 'treats'],
    services: [
      { name: 'Birthday cake (8 inch)', durationMin: 30, sampleUsd: 30 },
      { name: 'Wedding cake (2 tier)', durationMin: 60, sampleUsd: 150 },
      { name: 'Cupcakes (box of 12)', durationMin: 15, sampleUsd: 15 },
      { name: 'Cake tasting', durationMin: 30, sampleUsd: 10 },
    ],
    faqs: [
      { question: 'How much notice do you need for a custom cake?', answer: 'At least 3 days for birthday cakes and 4 weeks for wedding cakes.' },
      { question: 'Do you deliver?', answer: 'Yes, within the city for a delivery fee based on distance.' },
      { question: 'Can you make eggless or sugar-free cakes?', answer: 'Yes, tell us when you order.' },
    ],
    answers: {
      booking: 'Order by message. Custom cakes need a 50% deposit to confirm.',
      cancellation: 'Cancel at least 48 hours before pickup for a full refund of the deposit.',
      payment: 'Bank transfer or card. Deposit to confirm, balance on pickup or delivery.',
      delivery: 'Delivery within the city for a fee. Pickup is free.',
      never_promise: 'Never promise allergen-free products or same-day custom cakes.',
      handoff: 'Allergy questions, wedding orders, complaints and anything you are not sure about.',
    },
    templates: [...BASE_TEMPLATES, { name: 'order_ready', category: 'utility' }],
  },
  {
    id: 'restaurant',
    industry: 'restaurant',
    version: '1.0.0',
    keywords: ['restaurant', 'kitchen', 'grill', 'cafe', 'bistro', 'eatery', 'lounge', 'bar'],
    services: [
      { name: 'Table reservation', durationMin: 90, sampleUsd: 0 },
      { name: 'Private dining', durationMin: 180, sampleUsd: 200 },
      { name: 'Catering enquiry', durationMin: 30, sampleUsd: 0 },
    ],
    faqs: [
      { question: 'Do you have vegetarian options?', answer: 'Yes, several dishes on the menu are vegetarian.' },
      { question: 'Can I bring a cake?', answer: 'Yes, a small cakeage fee applies.' },
      { question: 'Is there parking?', answer: 'Yes, free parking is available for guests.' },
    ],
    answers: {
      booking: 'Reserve by message or on our booking page.',
      cancellation: 'Please cancel at least 4 hours before your booking.',
      payment: 'Card, transfer or cash.',
      delivery: 'Delivery through our partners in nearby areas.',
      never_promise: 'Never confirm a dish is allergen-free. Never promise a specific table.',
      handoff: 'Allergen questions, events and complaints.',
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'gym-fitness',
    industry: 'gym',
    version: '1.0.0',
    keywords: ['gym', 'fitness', 'yoga', 'pilates', 'crossfit', 'training'],
    services: [
      { name: 'Free trial class', durationMin: 60, sampleUsd: 0 },
      { name: 'Personal training session', durationMin: 60, sampleUsd: 30 },
      { name: 'Monthly membership', durationMin: 30, sampleUsd: 40 },
    ],
    faqs: [
      { question: 'Can I try before I join?', answer: 'Yes, your first class is free.' },
      { question: 'Do you have showers?', answer: 'Yes, with lockers.' },
      { question: 'Can I pause my membership?', answer: 'Yes, for up to 2 months a year.' },
    ],
    answers: {
      booking: 'Book classes by message or on our booking page.',
      cancellation: 'Cancel classes at least 6 hours before to keep your credit.',
      payment: 'Card or transfer, monthly.',
      delivery: 'All sessions are at the gym.',
      ...COMMON_ANSWERS,
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'school-tutoring',
    industry: 'school',
    version: '1.0.0',
    keywords: ['school', 'academy', 'tutor', 'tutoring', 'lessons', 'college', 'learning'],
    services: [
      { name: 'Admissions visit', durationMin: 45, sampleUsd: 0 },
      { name: 'Assessment', durationMin: 60, sampleUsd: 20 },
      { name: 'Tutoring session', durationMin: 60, sampleUsd: 15 },
    ],
    faqs: [
      { question: 'What ages do you teach?', answer: 'Tell us the age of your child and we will confirm the right class.' },
      { question: 'When are open days?', answer: 'Open days run monthly. Ask us for the next date.' },
      { question: 'Do you offer payment plans?', answer: 'Yes, fees can be paid termly.' },
    ],
    answers: {
      booking: 'Book visits and assessments by message.',
      cancellation: 'Please give 24 hours notice.',
      payment: 'Transfer or card, per term.',
      delivery: 'Online tutoring is available.',
      never_promise: 'Never promise admission, grades or results.',
      handoff: 'Fee questions, admissions decisions and complaints.',
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'home-services',
    industry: 'home_services',
    version: '1.0.0',
    keywords: ['cleaning', 'plumb', 'electric', 'repairs', 'auto', 'mechanic', 'garage', 'services'],
    services: [
      { name: 'Site visit and quote', durationMin: 60, sampleUsd: 0 },
      { name: 'Standard job (2 hours)', durationMin: 120, sampleUsd: 60 },
    ],
    faqs: [
      { question: 'Which areas do you cover?', answer: 'We cover the whole city. Send us your area to confirm.' },
      { question: 'Do you give free quotes?', answer: 'Yes, quotes are free after a short visit or a few photos.' },
      { question: 'Are you insured?', answer: 'Yes, every job is covered.' },
    ],
    answers: {
      booking: 'Book a visit by message.',
      cancellation: 'Please give 24 hours notice.',
      payment: 'Transfer or card after the job.',
      delivery: 'We come to you.',
      never_promise: 'Never give a final price without a quote. Never promise same-day visits.',
      handoff: 'Quotes, emergencies and complaints.',
    },
    templates: BASE_TEMPLATES,
  },
  {
    id: 'general-service',
    industry: 'general',
    version: '1.0.0',
    keywords: [],
    services: [{ name: 'Consultation', durationMin: 30, sampleUsd: 20 }],
    faqs: [
      { question: 'What are your opening hours?', answer: 'See our opening hours on the booking page.' },
      { question: 'Where are you located?', answer: 'Send us a message and we will share directions.' },
      { question: 'How do I book?', answer: 'Book by message or on our booking page.' },
    ],
    answers: { booking: 'Book by message or on our booking page.', ...COMMON_ANSWERS },
    templates: BASE_TEMPLATES,
  },
]

export const INDUSTRY_PACKS = Object.fromEntries(packs.map((pack) => [pack.industry, pack])) as Record<Industry, IndustryPack>

export function getIndustryPack(industry: Industry): IndustryPack {
  return INDUSTRY_PACKS[industry]
}

const PRICE_FACTOR: Record<MarketCode, { factor: number; step: number }> = {
  NG: { factor: 1400, step: 500 },
  GH: { factor: 12, step: 5 },
  KE: { factor: 130, step: 50 },
  ZA: { factor: 18, step: 10 },
  UK: { factor: 0.8, step: 1 },
  EU: { factor: 0.9, step: 1 },
  US: { factor: 1, step: 5 },
}

/** Rounded, market-local sample price for a pack service, used only as an input hint. */
export function samplePrice(usd: number, market: MarketCode): number {
  const { factor, step } = PRICE_FACTOR[market]
  return Math.max(step, Math.round((usd * factor) / step) * step)
}

/** Recipes each goal switches on (PRD 6.1 step 3). Names come from translations. */
export const GOAL_RECIPES: Record<Goal, string[]> = {
  reply_faster: ['instant_reply', 'missed_message_followup'],
  more_bookings: ['booking_reminder', 'no_show_recovery', 'rebooking'],
  collect_reviews: ['review_request'],
  run_promotions: ['win_back', 'seasonal_offer'],
}

/** Short, friendly employee names that fit the market (FE-DOC 4.9). */
export const EMPLOYEE_NAMES: Record<MarketCode, string[]> = {
  NG: ['Ada', 'Tola', 'Kemi', 'Zara'],
  GH: ['Ama', 'Esi', 'Kofi'],
  KE: ['Amani', 'Zawadi', 'Wanjiru'],
  ZA: ['Thandi', 'Lerato', 'Sipho'],
  UK: ['Sam', 'Ellie', 'Max'],
  EU: ['Léa', 'Emma', 'Noah'],
  US: ['Riley', 'Jordan', 'Avery'],
}
