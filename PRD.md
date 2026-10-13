# PRD: AI Marketing Employee Platform

Working name: Deskhand (a placeholder; no trademark or domain check done). Version 0.5 | October 11, 2026 | Owner: Dex | Status: Draft for review

**How to read this document.** Part I (sections 1 to 26) defines the product: problem, users, scope, requirements, architecture and roadmap. Part II (sections 27 to 30) specifies the tenant experience from registration through every dashboard screen, including the compliance and governance center. Part III (sections 31 and 32) specifies the platform admin console and how market packs and industry packs are configured. Section 33 is the glossary. The frontend build plan lives in a separate document (the Frontend Build Spec) and refers back to these section numbers.

## 1. Overview

### 1.1 Problem

Building a website is now fast and cheap. Getting customers to it is not. Small business owners lose leads because they reply slowly, follow up inconsistently, and have no time to market. Tools like GoHighLevel (GHL) solve this, but they are built for agencies, have a steep learning curve, and assume US-style channels (SMS, email).

### 1.2 Product

An all-in-one CRM and marketing platform where an **AI employee does the work**. It captures leads, replies instantly, follows up, books appointments, collects reviews, and drafts marketing content. The owner approves instead of authors, and sees one number: leads and revenue this month.

### 1.3 Positioning

- GHL-level outcomes without the workflow-canvas complexity: 'do it for me' instead of 'build it yourself'.
- WhatsApp-first and local payment integrations, which GHL underserves in Africa and other emerging markets.
- Multi-tenant from day one so agencies can resell it later (the real GHL growth engine).

### 1.4 The core loop (what v1 must nail)

**Lead arrives → instant reply → follow-up → booking or payment → dashboard shows revenue.**

### 1.5 Assumptions (to confirm)

- v1 customer is the **business owner directly**; agencies come in v3. This is the biggest open decision (see section 25).
- Launch market: Nigeria first, then other African markets, then the UK, EU and US (section 9). One live data region at launch; the architecture supports several.
- Primary customer channel in the launch market: WhatsApp (an assumption; nothing in the product depends on it, see section 5.5). Secondary: email and web chat. SMS deferred. Inbound voice follows once chat is stable; outbound voice comes last because its consent rules are the strictest (section 8).

## 2. Goals, Non-goals, Success Metrics

### 2.1 Goals

1. Cut a business's first-response time to under 1 minute, 24/7.
2. Convert more inbound leads into bookings or payments with no extra effort from the owner.
3. Replace 4 to 6 separate tools (CRM, chat, scheduler, review tool, social scheduler) with one.
4. Make the AI trustworthy: grounded answers, clear approvals, full audit trail.
5. Architect for multi-tenancy and white-label from the start.

### 2.2 Non-goals (v1)

- A full multi-page website builder, blog or online store (owners embed our widgets in their own site instead). Landing pages and simple funnels are in scope from P1 (section 15.20).
- Courses, memberships, communities, affiliate manager.
- SMS marketing, VoIP phone system, outbound Voice AI.
- Running paid ad campaigns autonomously.
- Visual workflow canvas (ship fixed recipes first).
- Full invoicing and accounting.

### 2.3 Success metrics

| Metric | Target (first 6 months after launch) |
| --- | --- |
| Median first-response time | under 60 seconds |
| Lead-to-booking rate lift vs. baseline | +25% |
| AI replies needing human correction | under 10% |
| Weekly active owners (open app or approve something) | 60% of paying accounts |
| Setup to first automated reply | under 30 minutes |
| 90-day logo retention | 70% |
| AI cost per account | under 20% of revenue |

## 3. Users and Personas

**Owner (primary).** Runs a salon, clinic, restaurant, school, gym, real-estate or service business. Time-poor, not technical, lives in WhatsApp. Wants more customers and fewer missed messages.

**Staff member.** Receptionist or sales rep. Handles escalations from the AI, sees conversations, books and edits appointments.

**Agency (later).** Sells the product to many clients under its own brand. Needs sub-accounts, white-label, templates (snapshots), and rebilling.

**Platform admin (internal).** Our team. Needs tenant management, usage and cost visibility, support impersonation (audited), feature flags.

## 4. Product Principles

1. **Outcome over toolbox.** Every feature must serve the core loop or the AI employee.
2. **Approve, don't author.** Default to the AI drafting and the human approving.
3. **Trust is earned.** Autonomy levels start conservative and loosen as the owner gains confidence.
4. **Grounded, never invented.** Prices, policies and hours come from the business knowledge base or the AI escalates.
5. **Every action is auditable.** Who or what did it, why, and the exact content.
6. **Provider-agnostic channels.** One internal interface, many providers.

**7. Manual first, AI optional.** Every capability works by hand. The AI makes the product faster and cheaper to run; it is never the only way to do something (section 15.21).

**8. No single-channel dependence.** WhatsApp is the primary customer channel we expect at launch, not a requirement of the product. Sign-up, invitations, notifications and every feature work through email and in-app alone (section 5.5).

## 5. Account and Integration Model

The rule: **if an account carries the owner's identity, ownership or legal liability, the owner connects it; if it is infrastructure we can pool safely, we run it under our accounts with per-tenant isolation.** Owners see both kinds in one Connections hub, labelled 'We manage this' or 'You connect this'.

### 5.1 Who owns what

| Capability | Model | Account owner | What the owner does | Priority |
| --- | --- | --- | --- | --- |
| WhatsApp number and Business Account (WABA) | Owner connects | Owner | Logs in with Facebook through Embedded Signup, verifies the business, picks or registers the number | P0 |
| WhatsApp number, fallback | We manage | Us at first, portable to the owner later | Asks us for a number when they have none; migrates out on request | P1 |
| Email sending | Hybrid | We run sending; the owner owns the domain | Adds the SPF, DKIM and DMARC DNS records in a guided step, or sends from a shared subdomain until ready | P0 |
| Inbound email and inbox sync | Owner connects | Owner | Connects Gmail or Outlook with OAuth, or forwards mail to a platform address | P1 |
| Web chat, forms, widget | We manage | Us (hosted); the owner's site embeds it | Pastes one script tag or installs a plugin | P0 |
| Google Calendar and Outlook | Owner and staff connect | Each person | Each staff member connects their own calendar with OAuth | P0 |
| Google Business Profile | Owner connects | Owner | Signs in as owner or manager of the location and selects it | P1 |
| Facebook and Instagram | Owner connects | Owner | Logs in as Page admin and grants messaging and posting permissions | P1 |
| LinkedIn and TikTok | Owner connects | Owner | OAuth login | P2 |
| Payments (Paystack, Flutterwave, Stripe) | Owner connects | Owner, as merchant of record | Connects their own merchant account; money settles to them and never passes through us | P0 |
| SMS | Hybrid | We hold the aggregator contract; the owner holds sender IDs | Registers a sender ID with business documents | P2 |
| Voice numbers and telephony | We manage | Us as carrier customer; numbers assigned to the owner | Picks a number, or forwards or ports an existing one; supplies local address and identity documents where required | P2 |
| AI models, storage, queues, hosting | We manage | Us | Nothing; usage is metered | P0 |
| Ad accounts (Meta Ads, Google Ads) | Owner connects, read-only | Owner | OAuth with read permission | P3 |
| Contacts import | Owner connects | Owner | Uploads a CSV (P0) or connects Google Contacts (P2) | P0 |

### 5.2 Connections hub requirements

- **FR-C.1** One screen lists every connection with status (Connected, Needs attention, Not connected), who connected it, scopes granted, last sync, and a Fix button.
- **FR-C.2** Only Owner and Admin roles can connect or disconnect; staff connect only their own calendar.
- **FR-C.3** Least privilege: request only the scopes a feature needs, and ask for more at the moment a new feature is switched on, with a plain-language reason.
- **FR-C.4** Automatic health checks (token refresh, webhook subscription, test send). Failures alert the owner by email and in-app, and by push, WhatsApp or SMS where enabled.
- **FR-C.5** Degraded mode: if a channel disconnects, the AI stops sending on it, tells the owner, and routes inbound to the human inbox where possible. Nothing is silently dropped.
- **FR-C.6** Test button per connection (send a test message, fetch a test review, read a test calendar slot).
- **FR-C.7** Disconnecting deletes stored tokens immediately; historical data follows retention rules.
- **FR-C.8** Every connection event is written to the audit log.

### 5.3 Isolation rules for shared accounts

- Never pool one WhatsApp Business Account across businesses: template approvals, quality ratings and bans attach to the WABA.
- Shared email infrastructure uses reputation tiers. New or risky tenants send from a separate IP pool until bounce and complaint rates are healthy.
- Voice numbers and SMS sender IDs are registered per business wherever local rules require it.
- Tokens are encrypted per tenant and are never shown in the UI or logs after creation.

### 5.4 Leaving the platform

On cancellation the owner can export contacts, conversations, bookings and reviews. Connections are revoked, managed numbers are released or ported out within a stated window, and the owner keeps their domain and WhatsApp number.

### 5.5 Channel strategy and account messages

Nothing in the product depends on one channel. WhatsApp is the assumed primary customer channel in the launch market because that is where those customers already message businesses, but every channel plugs into the same interface (FR-5.1), and each market pack lists the channels enabled there in priority order.

| Channel | Customer conversations | Owner and team notifications | Account messages (codes, invites, resets) | Priority |
| --- | --- | --- | --- | --- |
| Email | Yes | Always available | Default | P0 |
| In-app and push | Not applicable | In-app always; push optional | Alerts and approvals | P0 in-app, P1 push |
| Web chat | Yes | Not applicable | Not applicable | P0 |
| WhatsApp | Yes | Optional, with consent | Optional (sign-in code, P1) | P0 |
| SMS | Yes, subject to sender registration | Optional | Optional (sign-in code) | P2 |
| Facebook Messenger and Instagram DMs | Yes | Not applicable | Not applicable | P1 |
| Telegram | Yes, where customers use it | Not applicable | Not applicable | P3 |
| Phone calls | Yes | Not applicable | Not applicable | P2 inbound, P3 outbound |

Channel order per market is an assumption to validate with pilots:

| Market | Customer channels in priority order | Notes |
| --- | --- | --- |
| Nigeria, Ghana, Kenya | WhatsApp, web chat, email, Messenger and Instagram, SMS (P2) | Mobile-first; WhatsApp is the default way customers message businesses |
| South Africa | WhatsApp, email, web chat, SMS | Local consent rules apply to marketing |
| UK and EU | Email, web chat, WhatsApp, SMS | Marketing consent and AI disclosure rules are strict |
| United States | SMS (after carrier registration), email, web chat, Messenger and Instagram, WhatsApp | SMS and voice need the strictest consent proof |
| India | WhatsApp, email | Registration rules for bulk messaging |
| Brazil | WhatsApp, Instagram, email | Local data protection rules apply |

- **FR-CH.1** Account messages (verification codes, invitations, password resets, billing notices, alerts) go by email by default. WhatsApp or SMS are optional per user where enabled and consented. They are never required to sign up, invite someone or receive notifications.
- **FR-CH.2** Team invitations go by email or a shareable link (copy, QR code, or share through any app). A 'Share via WhatsApp' button may open the sender's own app with the link prefilled; the platform does not send it.
- **FR-CH.3** A contact can exist with only an email or only a phone number. Each contact has a preferred channel and per-channel consent.
- **FR-CH.4** Recipes and AI follow-ups use a channel priority list per account and per contact (for example WhatsApp, then SMS, then email). They skip channels without consent or with a closed window, and record which channel was used.
- **FR-CH.5** Channel-specific rules (WhatsApp 24-hour window and templates, SMS registration, email authentication) live in the channel adapter, not in the inbox, recipes or AI logic.
- **FR-CH.6** Product copy says 'message' unless a rule is channel-specific. Market packs control which channel names and icons appear.
- **FR-CH.7** Adding a channel is adapter work plus market configuration, with no change to the inbox, workflow engine or AI employee prompts.

* **FR-CH.8** Each account enables the channels it wants from those available in its market, in any combination, and sets their priority order (Settings, Channels). No channel is preselected as required; the wizard suggests the market's usual order. Removing a channel pauses sends on it and reroutes recipes to the next channel in the list.
* **FR-CH.9** The channel list is per location, so one branch can use a different WhatsApp number, SMS sender or email address.
* **FR-CH.10** The inbox keeps one thread per contact across all channels. Replies default to the channel the customer last used, and staff can switch channel mid-conversation where the contact has consented.

## 6. Onboarding and Activation

Onboarding decides whether the product works at all: an owner who never connects WhatsApp or teaches the AI their prices gets nothing. Target: **first automated reply live within 30 minutes of signup, first AI-handled real lead within 7 days.**

### 6.1 Onboarding flow

| # | Step | Owner does | We do | Skippable |
| --- | --- | --- | --- | --- |
| 1 | Sign up | Email, Google or phone sign-in; verifies email or phone | Creates the account; asks country, language, timezone, currency and data region (this selects the market pack and compliance profile, sections 9 and 8) | No |
| 2 | Business profile | Pastes a website, Instagram or Google Business link; confirms details | Pre-fills name, services, hours, address and tone, then shows a draft to approve | Partly |
| 3 | Goals | Picks goals: reply faster, get more bookings, collect reviews, run promotions | Selects matching recipes, AI roles and dashboard widgets | No |
| 4 | Teach the AI | Reviews imported knowledge and answers a guided interview of about 10 questions (top services, prices, policies, what the AI must never promise) | Builds the knowledge base, flags gaps, shows a 'what the AI knows' preview | No |
| 5 | Connect channels | Chooses which channels to use from those available in their market (any combination of email, web chat, WhatsApp, Messenger and Instagram, SMS and so on) and connects each one (sections 5 and 5.5) | Walks through each connection and labels what we manage versus what they connect | Any one channel can wait; email and web chat need no external approval |
| 6 | Services and calendar | Adds services, durations and staff; connects a calendar | Computes availability and previews the booking page | Can defer |
| 7 | Create the AI employee | Runs the creation wizard (section 7) | Applies a vertical template and opens the sandbox. The owner can choose 'Manual only for now' and skip this step; the checklist then covers setting up replies, bookings and follow-ups by hand (section 15.21) | No |
| 8 | Compliance setup | Confirms business details, consent wording, AI disclosure, privacy policy link and recording choices; accepts terms and the data processing agreement | Generates region-specific wording and blocks go-live until done | No |
| 9 | Test and go live | Chats with the AI, sends a test WhatsApp to their own phone, reviews the readiness checklist | Starts the AI in Suggest mode and schedules the first digest | No |
| 10 | First week | Approves drafts and answers escalations | Nudges on day 1, 3 and 7; proposes raising autonomy when earned | n/a |

### 6.2 Go-live gates

The AI cannot message real customers until every gate is green (accounts that choose manual only skip the AI gates; the channel, consent and compliance gates still apply to anything sent by people or recipes):

- At least one channel is connected and, for WhatsApp, the starter templates are approved.
- The knowledge base holds services, prices, hours, location and at least 3 FAQs.
- Compliance setup is complete: AI disclosure on, consent wording set, terms and DPA accepted.
- The owner passed the sandbox test: at least 10 scripted conversations, including an angry customer, an unknown price and an off-topic question.
- A named human receives handoffs, and the notification channel is confirmed.

**Autonomy is earned.** Every account starts in Suggest or Approve. The product offers Autopilot for replies after 20 AI drafts have been approved with fewer than 10% edited. It never offers Autopilot for money concessions, bulk sends or public posts.

### 6.3 Industry packs

A pack (full specification in section 10) bundles services and sample prices, FAQs, tone, recipes, consent wording and review-request wording for one vertical. Launch with the single vertical chosen in section 25, then add salons, clinics, restaurants, real estate, schools and gyms. Packs cut setup time and raise first-week answer quality.

### 6.4 Activation milestones

| Milestone | Definition | Target |
| --- | --- | --- |
| Profile complete | Business details and services saved | 80% of signups within day 1 |
| First channel live | WhatsApp or web chat connected and receiving | 70% within 24 hours |
| AI taught | Knowledge-base readiness check passes | 65% within 48 hours |
| AI live (Suggest) | Employee live with real customers | 55% within 3 days |
| First lead handled | AI replies to a real lead in under 60 seconds | 50% within 7 days |
| First booking or payment | Completed through the AI | 35% within 14 days |
| Autopilot for replies | Owner switches replies to Autopilot | 30% within 30 days |

### 6.5 Requirements

- **FR-O.1** Persistent setup checklist with progress, time estimate per step, and resume on any device.
- **FR-O.2** Import from a website URL, Instagram, a Google Business link, and uploaded documents (PDF price lists, menus).
- **FR-O.3** Mobile-first: every step works on a phone, and nudges by email, push or, where enabled and consented, WhatsApp or SMS deep-link into the right step.
- **FR-O.4** Demo mode: inbox, pipeline and dashboard populated with clearly marked sample data before real leads arrive.
- **FR-O.5** Stuck-user detection: a nudge after 24 hours idle at any step, and an offer of a human-assisted setup call after 72 hours (pilot and paid tiers).
- **FR-O.6** Assisted setup: staff or an agency can complete onboarding for the owner; the owner still approves go-live and logs in themselves for connections that need their identity.
- **FR-O.7** Every step emits events for funnel analytics: drop-off, time per step, most failed connection.
- **FR-O.8** Invite staff during onboarding with roles and the handoff contact.
- **FR-O.9** Contextual help and an in-app AI helper that answers setup questions from our documentation.

## 7. AI Employee Creation Flows

An AI employee is a configured teammate, not a prompt box: **role + persona + knowledge + channels + tools + autonomy + guardrails.** An account can have several employees (for example a Chat Receptionist and a Voice Receptionist) that share one knowledge base, one contact record and one audit log.

### 7.1 Employee model

| Part | What it holds | Who edits |
| --- | --- | --- |
| Role | Skill pack: receptionist, follow-up, scheduler, reputation, and so on | Owner picks from templates |
| Persona | Name, tone, languages, greeting, sign-off, AI disclosure wording | Owner, Admin |
| Knowledge | Business profile, services and prices, FAQs, policies, 'never say' list | Owner, Admin; Staff can suggest |
| Channels | Which channels and hours it covers, and after-hours behavior | Owner, Admin |
| Tools | Which actions it may take: book, tag, move stage, send payment link | Owner, Admin |
| Autonomy | Suggest, Approve or Autopilot, set per tool | Owner |
| Guardrails | Escalation triggers, limits, banned topics, quiet hours | Owner, Admin |
| Market and languages | Country and location, languages served with quality tiers, currency, timezone, holidays, data region | Inherited from the market pack; Owner confirms |

A platform floor sits under every employee and the owner cannot lower it: AI disclosure, honoring opt-outs, no impersonation of real people, handoff to a human on request, and business-scope-only answers (see section 8).

### 7.2 Chat employee: creation wizard

| Step | Owner chooses | Defaults and checks |
| --- | --- | --- |
| 1. Template | Receptionist, Sales follow-up, Booking assistant, Support, or Custom | Vertical pack preselects the template and sample answers |
| 2. Name and persona | Display name, tone (formal to friendly), emoji use. Market, languages and quality tiers are inherited from the account and confirmed here (section 9.4) | Disclosure line pre-filled and locked on; Nigerian Pidgin and local-language options flagged as lower-confidence |
| 3. Channels and hours | WhatsApp, web chat, email; 24/7 or business hours; after-hours behavior | Warns if a chosen channel is not yet connected; WhatsApp 24-hour window and template rules applied automatically |
| 4. Knowledge | Which knowledge to use, extra FAQs, a 'never say' list, topics that must escalate | Shows coverage gaps ('no cancellation policy found') and asks to fill them |
| 5. Skills and tools | Toggles: answer FAQs, qualify leads, book, update CRM, send payment link | Money and bulk actions default to Approve |
| 6. Rules | Discount limit (default none), escalation triggers, handoff person, quiet hours | Escalation triggers preloaded: anger, legal, medical, refunds, human requested |
| 7. Test | Chat with the employee in a sandbox; run scripted and adversarial scenarios | Pass criteria: no invented prices, correct handoffs, disclosure shown, resists prompt injection |
| 8. Review | One-page summary of persona, rules and autonomy | Automatic compliance check (section 8) must pass |
| 9. Go live | Staged rollout: Shadow (drafts hidden, owner compares), then Suggest, Approve, Autopilot | Autopilot needs the earned-autonomy threshold from section 6.2 |

### 7.3 Voice employee: creation wizard

Inbound call answering ships first (P2). Outbound calling comes last (P3) because consent and calling-hour rules are strictest there.

| Step | Owner chooses | Defaults and checks |
| --- | --- | --- |
| 1. Use case | Inbound receptionist, after-hours answering, appointment reminders (outbound), lead callback (outbound, P3) | Outbound options hidden until the compliance profile allows them |
| 2. Phone number | Buy a managed number, forward an existing number, or port one in | Collects any local identity or address documents the country requires; shows lead time |
| 3. Voice and persona | Voice from a licensed catalog, language and accent (limited to what the market supports for voice), pace, name, greeting | Spoken AI disclosure and recording notice generated for the jurisdiction; cloning a real person's voice is blocked without verified written consent |
| 4. Call flow | Greeting, intent detection, answers, details to collect (name, number, reason), booking, confirmation, close | Warm transfer number and hours, voicemail fallback, maximum call length, silence handling, keypad (DTMF) fallback |
| 5. Knowledge | Same knowledge base as chat | Answers rewritten shorter for speech; pronunciation list for brand and staff names |
| 6. Recording and transcripts | Record or not, retention period, who can listen | Recording off by default until the notice is configured; card numbers and IDs redacted; no recording while payment details are spoken |
| 7. Outbound rules (P3) | Calling hours, attempts per contact, caller ID | Consent proof required per contact, recipient-timezone hours, do-not-call screening, in-call opt-out |
| 8. Test | Call a test line; scripted scenarios; noise and accent checks | Target under 1 second turn latency, clean barge-in, correct transfer |
| 9. Review and go live | Summary and compliance check | Starts as Shadow (a human answers, the AI listens and suggests), then after-hours only, then full coverage |

### 7.4 Employee lifecycle

Stages: Draft → Testing → Shadow → Live (Suggest, Approve or Autopilot) → Paused → Archived. Every change to persona, rules or knowledge creates a new version with a change log, an Owner approval for sensitive edits (autonomy, discount limit, disclosure), and one-click rollback. A kill switch pauses any employee instantly, and the platform can pause all employees on an account or globally.

### 7.5 Monitoring and improvement

- **FR-E.1** Per-employee dashboard: conversations handled, resolution rate, handoff rate, response time, bookings and revenue influenced, cost.
- **FR-E.2** Transcript review: owners and staff can read any conversation and flag a reply as good or bad with a reason; flags feed the eval set.
- **FR-E.3** 'Needs training' inbox: questions the AI could not answer, each with a one-click button to add the answer to the knowledge base.
- **FR-E.4** Random sample queue: about 5% of AI conversations surfaced for owner review in the first 30 days.
- **FR-E.5** Templates and cloning: duplicate an employee, export it as a template, and (P2) share it as an agency snapshot.
- **FR-E.6** Safety evals run on every persona or model change; a failing employee cannot go live.
- **FR-E.7** Voice-specific metrics: answer rate, abandoned calls, transfer success, average handle time, latency percentiles.

## 8. Compliance, Governance and Trust

Yes: many countries regulate chat and voice monitoring, AI disclosure, call recording, marketing consent and personal data, and the rules differ by country, channel and use case. The product therefore carries a **compliance profile per account** that turns controls on and off, and this section is the requirement set behind it. It is a product spec, not legal advice: every launch market and every voice or bulk-messaging feature needs review by local counsel before it is switched on. Rules below were checked against secondary sources on October 11, 2026 and change often.

### 8.1 Approach and our role

- **Compliance profile.** Set at signup from the business's country and the countries of its customers. It selects disclosure wording, consent requirements, recording notices, calling hours, retention defaults and data-region options (FR-CP.1).
- **Roles.** The business is the data controller for its customers' data. We are the processor, with LLM, telephony, email and cloud vendors as sub-processors. For our own account data we are the controller. Agencies (later) become processors under the business, with flow-down terms.
- **Contracts.** Terms of service, a data processing agreement (DPA), a public sub-processor list, a privacy policy, and a customer-facing template the business can adapt for its own privacy notice.
- **Licensing check.** Before reselling voice numbers or SMS in a country, confirm whether local telecom rules require a licence or a registered local partner.

### 8.2 Regulatory map (launch markets first)

| Region | Rules to know | What it means for the product |
| --- | --- | --- |
| Nigeria (launch market) | Nigeria Data Protection Act 2023 and the GAID 2025, in force from September 19, 2025, which replaced the NDPR 2019. Organisations classed as data controllers or processors of major importance must register with the NDPC; controllers and processors must appoint a DPO; DPIAs are required in defined cases. Foreign companies targeting Nigerian data subjects are in scope. The telecom regulator (NCC) also has consumer rules on unsolicited messages and a do-not-disturb registry; confirm current scope. No single general call-recording rule was found; confirm with counsel | Check our own NDPC classification and registration, appoint a DPO, keep records of processing, run a DPIA for AI conversation processing, support data-subject rights, honor opt-outs and quiet hours, and collect explicit consent for marketing |
| EU and EEA | GDPR (lawful basis, notice, access, deletion, DPIA, transfers) plus ePrivacy rules for marketing messages. **EU AI Act Article 50 applies from August 2, 2026:** people must be told when they interact with an AI system, at the point of interaction and not only in terms of service; deployers carry their own duty. The Digital Omnibus delayed the high-risk regime to December 2027 but left chatbot disclosure in place | AI disclosure on by default and locked; recording needs a lawful basis and a notice; EU data region (P2); breach notification within 72 hours; avoid high-risk uses (hiring, credit, biometrics) entirely |
| United Kingdom | UK GDPR, PECR for electronic marketing, ICO guidance | Same controls as EU; marketing consent and one-click opt-out on every marketing message |
| United States | TCPA: AI-generated voices count as artificial or prerecorded voice, so consent is required before AI voice calls, and marketing calls need prior express written consent; the FCC is developing AI-specific disclosure rules, so track the status. Recording laws vary: several states require all-party consent. State privacy laws (for example CCPA and CPRA), emerging state chatbot-disclosure laws, and carrier registration (A2P 10DLC) for SMS | Outbound AI voice off by default for US numbers; consent ledger stores written-consent proof; all-party-consent mode for recording; SMS only after brand and campaign registration |
| Canada | CASL (consent for commercial electronic messages), PIPEDA | Express or implied consent tracked with expiry; unsubscribe honored within 10 business days |
| South Africa, Kenya, Ghana | POPIA, Kenya Data Protection Act 2019, Ghana Data Protection Act 2012. Registration and officer duties exist in each; confirm per country | Per-country registration checklist and a local-representative decision before launch |
| India | DPDP Act 2023 (rules phased in) and TRAI telemarketing rules | No outbound calls or SMS until local registration is understood |
| Brazil | LGPD | Lawful basis recorded per processing purpose; data-subject rights tooling |
| Platform rules | **WhatsApp Business:** opt-in required, template categories, quality ratings. Since January 15, 2026, Meta bars general-purpose AI chatbots from the Business API; bots serving a business's own customers (support, bookings, order updates) remain allowed. Google and Meta also have review, posting and data-use policies | Each AI employee is locked to its business's scope and refuses open-ended general chat; templates managed in-product; opt-in proof stored; reviews never gated or incentivized |

### 8.3 Product controls

#### Disclosure and transparency

- **FR-CP.2** Every AI-handled conversation says it is an AI at the start: first chat message, and the opening of every call. Wording is configurable, the disclosure itself cannot be disabled, and a human handoff is available on request at any point.
- **FR-CP.3** Customers are told, in the first message or the privacy notice linked from it, that conversations are stored and may be reviewed by the business.
- **FR-CP.4** AI-generated marketing content shown to the public (posts, review replies) can be labelled where a region requires it.

#### Consent and opt-out

- **FR-CP.5 Consent ledger.** Per contact, per channel and per purpose (service messages, marketing, AI voice or text contact): timestamp, source, exact wording version, IP or call reference, and revocation. Imports require the owner to attest to a lawful basis.
- **FR-CP.6** Forms capture separate checkboxes for service follow-up and for marketing, with AI use mentioned in the wording where the profile requires it.
- **FR-CP.7** Opt-out phrases (STOP and multilingual equivalents, including Pidgin) are honored immediately across all channels and flow into a per-account suppression list.
- **FR-CP.8** Quiet hours and calling hours are enforced in the recipient's local time; do-not-call and do-not-disturb screening is applied wherever a national registry is available (outbound voice and SMS only).
- **FR-CP.9** WhatsApp opt-in proof is stored, and template categories are matched to the message purpose.

#### Recording, transcription and monitoring

- **FR-CP.10** Voice recording is off until the owner completes recording setup. The notice is played before recording starts, and in all-party-consent regions a caller who declines is not recorded.
- **FR-CP.11** Audio and transcripts have configurable retention with defaults set by counsel per region; automatic deletion; legal-hold option.
- **FR-CP.12** Sensitive data is redacted from transcripts and recordings (card numbers, ID numbers, passwords), and recording pauses while payment details are spoken.
- **FR-CP.13** Access to transcripts and recordings is role-based and logged. Our support staff can view a tenant's conversations only with the owner's time-limited approval, and every view is audited.
- **FR-CP.14** If a business monitors its own staff's chats or calls, the product shows a staff notice and the business accepts responsibility for local employment rules in the terms.

#### Data rights, residency and minimization

- **FR-CP.15** Per-contact and per-account export and deletion covering messages, recordings, embeddings and any AI memory; a request tracker with due dates; a human-review path for decisions made by automated processing.
- **FR-CP.16** Data-region options as set out in section 9.2, documented transfer mechanisms, and a public sub-processor list with change notices.
- **FR-CP.17** Contracts with the LLM and voice providers prohibit training on customer data and set retention to the minimum. Prompts are minimized: sensitive fields are masked before they reach a model.
- **FR-CP.18** The AI does not collect government IDs, card numbers or passwords, and does not ask for health details beyond what a booking needs.
- **FR-CP.19** Health and finance verticals are gated: clinics and lenders need explicit enablement, a DPIA, stricter retention, and a hard rule that the AI gives no medical, legal or financial advice and escalates instead.
- **FR-CP.20** Contacts identified as minors are excluded from marketing automation.

### 8.4 AI governance

- **FR-G.1 Business-scope lock.** Each employee answers only about its business and its tasks. Open-ended general chat is refused politely. This also keeps us inside WhatsApp's business-AI policy.
- **FR-G.2 Prohibited uses.** No emotion recognition, no voice or face biometric identification, no credit, hiring, insurance or similar eligibility decisions, no impersonation of real people, no cloning a voice without verified written consent, no political persuasion.
- **FR-G.3 Human oversight.** Approval queue for sensitive actions, per-employee kill switch, and automatic handoff triggers (section 15.8.5).
- **FR-G.4 Evals as a release gate.** A test set covering grounding, handoff precision, disclosure, opt-out handling, prompt injection and policy violations must pass before any model, prompt or persona change reaches customers.
- **FR-G.5 Audit.** Every AI action stores the input context reference, the tool calls, the output, the model version and the reason, in an immutable log retained for at least 12 months.
- **FR-G.6 Incident response.** Playbooks for harmful AI output, data breach and provider outage. Regulators and affected businesses are notified within the legal deadline for the jurisdiction (72 hours is the common benchmark), and the playbook is rehearsed twice a year.
- **FR-G.7 Risk register.** A living register of AI risks (wrong price, inappropriate reply, privacy leak, bias in language handling, cost runaway) with an owner, mitigation and review date.
- **FR-G.8 Transparency pack.** A plain-language page for owners on what the AI does, what it cannot do, how it is tested and what data it uses.
- **FR-G.9 Marketing honesty.** AI-generated content cannot make claims about prices, results, health or finance that are not in the knowledge base; every marketing message carries sender identity and an unsubscribe route.

### 8.5 Company governance

- Appoint a Data Protection Officer and a compliance owner; publish DPO contact details. Default: start with an external DPO service and Nigerian technology and data protection counsel engaged in phase 0, then move to a named in-house owner once there are paying customers in several markets.
- Confirm our NDPC classification and complete registration and annual audit filings if we are a controller or processor of major importance; repeat the check for each launch country's regulator.
- Keep a record of processing activities, DPIAs for conversation processing and voice, and a vendor register with signed DPAs.
- Security programme: encryption, access reviews, penetration test before launch and yearly, SOC 2 readiness in year one.
- Compliance calendar for audits, policy reviews, sub-processor changes and regulatory watch (AI Act implementation, FCC rules, NDPC directives).
- **Market launch checklist:** local counsel sign-off, regulator registration, channel and telecom rules, consent wording, retention defaults, support language. No country, and no voice or bulk-messaging feature, goes live without it.

### 8.6 Compliance priorities by phase

| Priority | Controls |
| --- | --- |
| P0 (before any real customer message) | AI disclosure, consent ledger, opt-out handling, WhatsApp opt-in proof, privacy policy, terms and DPA, audit log, retention settings, data-subject export and delete (basic), breach playbook, DPO appointed, NDPC classification checked, business-scope lock, kill switch |
| P1 | Recording controls and notices, regional compliance profiles, DPIA templates, public sub-processor list, redaction pipeline, transcript access logging, health and finance gating |
| P2 | EU data region, inbound voice launch controls, SOC 2 audit, per-country registrations beyond launch markets, agency data-processing flow-down |
| P3 | Outbound voice and SMS controls (consent proof, do-not-call screening, calling-hours engine), further certifications |

### 8.7 Go-live gates for compliance

- Legal review complete for the country and channel being enabled.
- AI disclosure verified in every channel by test conversation.
- Consent capture and opt-out tested end to end, including a STOP reply in a local language.
- Retention and deletion jobs verified on test data.
- Breach and incident playbooks rehearsed once.
- For voice: recording notice, transfer to a human and kill switch tested on a live call.

### 8.8 Sources and caveats

Built from web search results on October 11, 2026, not from reading the primary texts, so confirm against official sources and with counsel before relying on them.

- [WhatsApp business-AI policy summary (respond.io)](https://respond.io/blog/whatsapp-ai-chatbot-policy)
- [EU AI Act Article 50 timing after the Digital Omnibus (Ropes and Gray)](https://www.ropesgray.com/en/insights/viewpoints/2026/08/102nfqm/you-talkin-to-me-operationalising-the-eu-ai-acts-transparency-obligations)
- [TCPA and AI voice agents (Retell AI playbook)](https://retellai.com/blog/tcpa-compliance-playbook-voice-ai-outbound)
- [FCC proposal on AI-generated calls and texts (Wiley)](https://wiley.law/alert-FCC-Proposes-New-Rules-for-AI-Generated-Calls-and-Texts)
- [Nigeria GAID 2025 overview (Afriwise)](https://www.afriwise.com/blog/key-updates-from-the-nigeria-data-protection-act---general-application-and-implementation-directive-2025)

## 9. Markets, Localization and Data Regions

The product is built for many countries from day one, so country-specific behavior lives in configuration, never in code. Three layers stack: a **market pack** per country (rules and defaults), the **account** (the business's own choices) and the **AI employee** (language and persona). Launch order is an assumption to confirm: Nigeria first, then Ghana, Kenya and South Africa, then the UK and EU, then the US.

### 9.1 Market packs

A market pack is a versioned configuration object per country. Accounts inherit it at signup and can override only what the pack allows.

| Setting | What it controls | Example |
| --- | --- | --- |
| Compliance profile | Disclosure wording, consent rules, recording notices, retention defaults, calling hours (section 8) | Nigeria: NDPA consent wording; EU: AI Act disclosure |
| Data region | Where the account's data is stored and processed (section 9.2) | Default region per country; owner can pick among allowed regions |
| Languages | UI languages and AI conversation languages with quality tiers (section 9.3) | Nigeria: English, Pidgin, Yoruba, Hausa, Igbo |
| Currency and formats | Currency, number, date and time formats, week start, phone and address formats | ₦ with thousands separators, +234 numbers, day-first dates |
| Timezone and calendar | Default timezone, public holidays, typical weekend | Public holidays preloaded as optional closed days |
| Channels | Which channels are enabled and which provider routes each | WhatsApp on; SMS and voice off until enabled for that country |
| Payment gateways | Gateways offered for the business's own payments | Paystack and Flutterwave in supported African markets, Stripe elsewhere |
| Legal documents | Terms, privacy notice and DPA templates in the local language and entity | Versioned per country and accepted at signup |
| Billing | Plan currency, tax display, payment methods for our own subscription | NGN and USD plans, card and bank transfer |
| Support | Support hours, languages, escalation contacts | Local business hours and language |
| Feature flags | Features enabled, piloted or disabled in that country | Outbound voice disabled until counsel signs off |

- **FR-M.1** Market packs are editable by our team without a release, versioned, and every change is logged.
- **FR-M.2** Each country has a status: Disabled, Pilot (invite only) or Live. Signing up from a Disabled country joins a waitlist.
- **FR-M.3** Businesses in several countries add **locations**. Each location has its own market settings, hours, currency, phone numbers and, optionally, its own AI employee.
- **FR-M.4** Changing an account's country re-runs the compliance and market checks and lists what will change before it applies.

### 9.2 Data regions

Data residency is a product setting, because some customers and some laws care where personal data sits.

- **FR-R.1** Each account has a **data region**, chosen at signup (defaulted from the country) and stored on the account. Examples: Africa, EU, US. Which regions exist is a business decision, not a code change.
- **FR-R.2** Pinned to the region: the database (contacts, conversations, messages, bookings, reviews), object storage (uploads, recordings), the vector index and embeddings, backups, and logs that contain personal data.
- **FR-R.3** Not pinned: a minimal global directory (sign-in email, tenant-to-region map, billing identity) and anonymized telemetry. Both are named in the privacy notice.
- **FR-R.4** AI inference may run outside the region unless the account requires otherwise. The sub-processor list states where each model provider processes data. Where a region-pinned inference option exists, EU accounts use it (P2).
- **FR-R.5** Architecture: one complete stack per region (API, database, queue, workers, object storage, vector index) plus a thin global control plane. Requests route by tenant, and public surfaces (booking page, widget) resolve the tenant and are served from the right region.
- **FR-R.6** Launch with one live region, but build the `region` attribute, the routing layer and per-region configuration from day one so adding a region is deployment work, not re-architecture.
- **FR-R.7** Per-region defaults for retention, sub-processors, DPA wording and backups.
- **FR-R.8** Moving an existing account between regions is a P3 operations tool, not self-serve.
- **FR-R.9** Whether Nigerian accounts must stay on local or African infrastructure is a question for counsel. The region setting lets us answer it either way without rebuilding.

| Phase | Regions |
| --- | --- |
| P0 | One live region; region attribute and routing built in |
| P1 | Second region (EU) and region choice at signup |
| P2 | Third region (US or Africa), per-region sub-processors and DPAs |
| P3 | Self-serve migration between regions |

### 9.3 Languages and localization

UI language and customer-conversation language are separate settings.

**UI languages:** English at launch, then French and Portuguese (P1), then Swahili and Arabic with right-to-left layout (P2). All strings come from translation files with ICU message formatting; no copy is hard-coded.

**AI conversation languages** carry a quality tier that the owner sees:

| Tier | Meaning | Rule |
| --- | --- | --- |
| A | Fully evaluated: a native-reviewed test set passes release thresholds | Can run on Autopilot |
| B | Supported but less tested | Starts in Approve mode, with a lower-confidence note to the owner |
| C | Best effort | Suggest mode only; handoff encouraged |

- **FR-L.1** Language is detected per message. The AI replies in the customer's language when the employee supports it, otherwise in the employee's default language with an offer of a human.
- **FR-L.2** Code-switching is handled: English mixed with Pidgin, Romanized Hausa or Yoruba without diacritics, and mixed-script messages.
- **FR-L.3** WhatsApp templates are language-specific. Each language variant is submitted and approved separately, and the engine picks the variant by contact language.
- **FR-L.4** The knowledge base is authored in one primary language and the AI translates on the fly. Owners can pin exact wording per language for sensitive statements (prices, policies, medical or legal notes).
- **FR-L.5** Compliance-critical text (AI disclosure, consent wording, recording notices) is human-reviewed in each language; machine translation alone is not accepted.
- **FR-L.6** Voice: each market lists the languages and accents supported for speech recognition and synthesis. Unsupported languages route to a human or voicemail.
- **FR-L.7** Formatting follows the contact's and the location's locale: currency symbol and grouping, dates, 12 or 24-hour time, names (single names, name order), phone parsing and address fields.
- **FR-L.8** Each Tier A language has an evaluation set of at least 50 realistic transcripts reviewed by a native speaker before release.
- **FR-L.9** Public surfaces (booking page, widget, forms) switch language from the visitor's browser or the owner's default, with per-service and per-field translations.

### 9.4 How the AI employee learns the market and language at setup

During creation (section 7), the employee inherits settings from the account's market pack and location, and the owner confirms them. The wizard shows what was applied and why.

| Setup input | What the employee does with it |
| --- | --- |
| Country and location | Applies the compliance profile: disclosure wording, consent requirements, recording notice, quiet hours |
| Languages served and tiers | Sets the default and supported languages, shows each tier, and caps autonomy for that language |
| Currency | Quotes prices in the location's currency with the right symbol and grouping; never converts unless told to |
| Timezone, opening hours, holidays | Offers only valid slots, avoids closed days and public holidays, and states times with the right timezone |
| Local channels and payment methods | Mentions only channels and payment options the business actually has in that country |
| Vertical and pack | Loads vocabulary and escalation rules for that vertical in that market (section 10) |
| Region | Applies region-appropriate retention and, for voice, the telephony route |

- **FR-M.5** The employee's runtime context always includes country, location, timezone, currency, local date and time, holidays, language preferences and compliance flags, so it never guesses them.
- **FR-M.6** A multi-location business can scope an employee to one location or share one across locations. A shared employee must resolve the location from the conversation before quoting prices or slots.
- **FR-M.7** The wizard blocks go-live if a served language is Tier C with Autopilot selected, or if compliance wording for a served language is missing.
- **Acceptance example:** a Lagos salon serves English and Pidgin. A customer writes in Pidgin asking for braids on Sunday. The AI answers in Pidgin, quotes a price in naira, knows Sunday is a closed day, and offers the next open slot.

## 10. Industry Packs

An industry pack is a versioned bundle of configuration and content that turns a blank account into a working setup for one vertical in one market. It is data, not code: JSON and markdown files installed into an account. Packs are how we get a salon owner to a live AI employee in minutes instead of days, and they are the main lever on first-week answer quality.

### 10.1 What a pack contains

| Component | What it includes | Salon example |
| --- | --- | --- |
| Business profile template | Categories, typical fields, resources | Stylists, chairs, hair types |
| Service catalog | Default services, durations, buffers, add-ons, deposit rules, price placeholders | Braids (long), wash and style, 4 to 6 hours, deposit on long services |
| Booking rules | Lead time, cancellation window, no-show policy, request-to-book versus instant | 24-hour cancellation, deposit forfeited on no-show |
| Knowledge starter | Draft FAQs and policies, each marked 'needs your input' | Late arrival, bringing hair extensions, payment methods |
| Interview script | Vertical-specific questions for the guided knowledge interview (section 6) | 'Do you work with natural hair? What is your most booked service?' |
| Employee templates | Persona presets, tone, escalation triggers, default tool permissions | Warm tone; escalate bridal or group quotes |
| Workflow recipes | Recipes worded for the vertical | Appointment reminder, rebooking reminder after 6 weeks, no-show recovery, win-back |
| Message templates | WhatsApp and email templates per language, submitted for approval on install | Reminder, deposit request, review request |
| Forms | Lead and enquiry forms | Quote request with photo upload |
| Pipeline | Stages tuned to the vertical | Enquiry, Quote sent, Booked, Completed, Lost |
| Fields and tags | Custom fields and tags | Hair type, preferred stylist, allergies noted (not stored by the AI) |
| Dashboard | KPI definitions and widgets | Bookings, no-show rate, rebooking rate |
| Review taxonomy | Topics used to analyse reviews and wording for review requests | Wait time, stylist skill, cleanliness |
| Marketing library | Seasonal calendar, post and offer templates | Back-to-school, holiday, wedding season |
| Compliance overlay | Vertical-specific rules | Health and finance gating, minors rule, claims limits |
| Demo data | Sample contacts, conversations, bookings for demo mode | A week of fake bookings |

### 10.2 Pack structure

Each pack ships a manifest listing what it contains and where it applies. A sketch:

```json
{
  "id": "salon-beauty",
  "version": "1.2.0",
  "verticals": ["salon", "beauty"],
  "markets": ["NG", "GH", "KE"],
  "languages": ["en", "pcm", "yo"],
  "requires": { "platform": ">=1.0" },
  "components": ["services", "knowledge", "interview", "employees", "recipes", "templates", "forms", "pipeline", "fields", "dashboard", "compliance", "reviews", "content", "demo"],
  "compliance": { "specialCategoryData": false, "minorsRule": true }
}
```

A pack has a core, plus **market overlays** (local currency placeholders, local terminology, payment methods, legal overlay) and **language packs** (translated templates and sample answers). The installer picks the core and the overlays that match the account's market and languages.

### 10.3 Install and customization flow

1. The owner picks a vertical in onboarding step 2, or the system suggests one from their website or Google Business link.
2. A preview shows what will be created: services, FAQs, recipes, templates, forms, pipeline.
3. Install creates entities in the account, tagged with the pack id and version. It is idempotent: running it twice creates nothing twice.
4. A **Needs your input** list appears: prices, hours, staff, policies, and anything the pack could not know. Everything the pack created is editable.
5. WhatsApp templates from the pack are submitted for approval in the owner's language set.
6. The vertical's evaluation set runs against the configured employee, and failures appear as warnings before go-live.

**Updates.** When a new pack version exists, the owner sees a diff and can apply it selectively. An update never overwrites something the owner edited. An owner can detach from a pack at any time and keep everything it created.

### 10.4 How the AI employee uses a pack

- Pack knowledge is stored as knowledge items tagged `source: pack` with status **unverified** until the owner confirms them. The AI never states an unverified price, policy or promise; it says it will check and notifies the owner.
- Go-live is blocked while any price or policy used by the employee is still a placeholder (section 6.2).
- The pack supplies vocabulary and intent examples for the vertical and market (for example local names for hairstyles or neighborhood names for real estate), which improve intent detection and search.
- The pack's escalation rules are added to the employee's triggers (for example: clinics escalate any request for medical advice).
- The pack's compliance overlay can tighten defaults, never loosen the platform floor (section 8).

### 10.5 Authoring and governance

- **Pipeline:** draft → evaluation run → compliance review → pilot with 3 to 5 accounts → publish. Versions follow semantic versioning with a change log.
- **Quality bar:** a pack cannot publish unless its evaluation set passes (grounding, handoff, disclosure, language tiers).
- **Measure each pack:** activation rate, share of pack items edited, answers marked wrong, time to go-live.
- **Pack studio (P2):** an internal tool for editing, previewing and testing packs without engineers.
- **Packs versus snapshots:** a pack is curated by us and versioned. A snapshot (P2) is an export of a real account's setup, made by an agency for its clients. A marketplace for third-party packs is P3.

### 10.6 First packs

| Pack | Core flows | Special rules | Priority |
| --- | --- | --- | --- |
| General service business | Enquiry capture, FAQ answering, booking, review requests | None beyond the platform floor | P0 (fallback for any vertical) |
| Salon and beauty | Booking with deposits, reminders, no-show recovery, rebooking, review requests | Minors rule for marketing | P0 (first vertical; default decided in section 25) |
| Clinics and dental | Appointment booking, reminders, intake forms | Health data gating, no diagnosis or medical advice, stricter retention | P1 |
| Real estate | Lead qualification (budget, area, timeline), viewing booking, listing questions | No price negotiation by the AI; claims limits | P1 |
| Restaurants and venues | Reservations, menu questions, events, catering requests | Allergen questions escalate to a human | P1 |
| Schools and tutoring | Admissions enquiries, open-day booking, fee reminders | Minors rule, parent consent | P2 |
| Gyms and fitness | Trial booking, membership enquiries, win-back | None beyond the floor | P2 |
| Home and auto services | Quote requests, job scheduling, follow-up | Quote disclaimers | P2 |

### 10.7 Requirements

- **FR-IP.1** Pack installer: preview, idempotent install, per-entity pack tagging, and a Needs-your-input list.
- **FR-IP.2** Market overlays and language packs resolved automatically from the account's market and languages.
- **FR-IP.3** Pack versioning with diff and selective update that preserves owner edits.
- **FR-IP.4** Pack knowledge is unverified until confirmed, and the AI cannot assert unverified facts.
- **FR-IP.5** Detach and uninstall: remove pack tags without deleting content, or remove untouched pack content.
- **FR-IP.6** Each pack has an evaluation set that runs at install and on every pack or model change.
- **FR-IP.7** Pack analytics (activation, edit rate, wrong-answer rate) visible to our team per pack and version.
- **Acceptance:** installing the salon pack in a fresh Nigerian account reaches a Needs-your-input list of 15 items or fewer within 5 minutes, and the AI never quotes an unconfirmed price.

## 11. Public-Facing Surfaces: Booking Page, Chat Widget and Embeds

These are the pages and scripts customers touch. They are where leads enter, so they carry a higher uptime and performance bar than the owner app.

### 11.1 Surface overview

| Surface | What it is | Where it lives | Priority |
| --- | --- | --- | --- |
| Public booking page | Hosted page where a customer books a service | Platform subdomain per account; custom domain later | P0 |
| Booking embed | The booking flow inside the owner's website (inline, popup or floating button) | Owner's site, via one script tag | P1 |
| Chat widget | Floating chat bubble connected to the inbox and the AI employee | Owner's site, via one script tag | P0 (basic), P1 (full) |
| Lead forms | Embeddable or hosted forms | Owner's site or hosted page | P0 |
| Click-to-WhatsApp links and QR codes | Deep links that open WhatsApp with a prefilled message, with source tracking | Anywhere: bio, flyers, posters, ads | P0 |
| Hosted payment page | Page opened from a payment link | Platform subdomain | P0 |
| Review landing page | One-tap route to the Google review form | Platform subdomain | P1 |
| Link hub | One page with buttons: Book, WhatsApp, Call, Map, Reviews | Platform subdomain | P2 |
| Preference center | Page where a contact manages consent per channel and purpose, or unsubscribes in one click (section 11.9) | Linked from every marketing message | P1 |
| Privacy request page | Public form for access, correction, deletion and similar requests; feeds the request queue (section 30.6) | Linked from the privacy notice and forms | P1 |

### 11.2 Public booking page

**Customer flow**

1. **Choose a service** (and add-ons or variant).
2. **Choose staff**: any available or a specific person (if the business allows).
3. **Pick a date and time**: slots shown in the customer's timezone, with the business timezone noted.
4. **Enter details**: name, phone, optional email and notes, plus any custom questions. Consent checkboxes follow the compliance profile (section 8).
5. **Pay a deposit** (if the service requires one).
6. **Confirmation**: summary page, add-to-calendar file, and a confirmation by WhatsApp or email, with a manage link.

**Requirements**

- **FR-PB.1 URLs.** Each account has a slug URL on our domain. Deep links exist per service and per staff member, and UTM parameters are captured on every booking. Custom domains are P2 (white-label).
- **FR-PB.2 Availability.** Reuses the availability engine (FR-7.2). Adds slot holds during checkout (5 to 10 minutes, enforced by a lock), minimum notice, maximum booking horizon, same-day cutoffs, blackout dates, public holidays and daylight-saving-safe computation.
- **FR-PB.3 Booking rules per service.** Deposit amount, cancellation window, reschedule limit, instant booking versus request-to-book with owner approval, buffer times, and bookings allowed per customer per day.
- **FR-PB.4 Group services.** Capacity per slot (classes, workshops) with remaining-spots display. A waitlist for full slots is P1.
- **FR-PB.5 Customer details.** Phone is required and validated by country. Duplicate customers are matched by phone and email into one contact. Optional phone verification by one-time code over WhatsApp or SMS to stop fake bookings (P1).
- **FR-PB.6 Consent.** A required service-message consent, an unticked marketing checkbox, a plain note on AI-assisted communication where the profile requires it, and links to the privacy notice and terms, in the page language.
- **FR-PB.7 Deposits.** Paid through the owner's gateway (section 5). A failed or abandoned payment releases the held slot. The refund and cancellation policy is shown before payment.
- **FR-PB.8 Notifications.** Immediate confirmation on the channel the customer used or chose, reminders at 24 hours and 2 hours (configurable), and an owner and staff alert. Bookings write back to the staff member's connected calendar.
- **FR-PB.9 Manage booking.** A signed, expiring link lets the customer reschedule or cancel within the business's rules, with no login.
- **FR-PB.10 No dead ends.** When no slot fits, the page offers 'Message us' (opens chat or WhatsApp) and a waitlist option, which converts the visit into a lead.
- **FR-PB.11 Abandonment capture.** If a customer entered a phone number but did not finish, the system creates a lead with the partial details and triggers the abandoned-booking recipe, honoring consent.
- **FR-PB.12 Branding.** Logo, colors, cover image and a short welcome text. No custom CSS or scripts (security); more control with white-label (P2).
- **FR-PB.13 Languages.** Page language follows the visitor's browser or the owner's default, with translated service names and descriptions (section 9.3).
- **FR-PB.14 SEO and sharing.** Indexable by default with LocalBusiness structured data and a noindex option; share cards for WhatsApp and social previews. Reserve with Google is P3.
- **FR-PB.15 Performance and accessibility.** Mobile-first; first load under 2 seconds on a typical mid-range phone on a 3G-class connection, with an initial payload under 150 KB; WCAG AA.
- **FR-PB.16 Abuse controls.** Rate limiting, invisible captcha, honeypot field, and an owner block list. No-show scoring is P2.
- **FR-PB.17 AI integration.** The AI employee can send the booking link or book on the customer's behalf through the same API. Every booking records its source (page, AI, staff, embed) for attribution.
- **FR-PB.18 Events.** The page emits events (viewed, service selected, slot selected, details submitted, booked, abandoned) for the funnel dashboard.

### 11.3 Booking embed

- **FR-BE.1** Three modes from one script: inline (inside a page container), popup (opened by any button with a data attribute) and floating button.
- **FR-BE.2** Install is one script tag with the account's public key, or a plugin for WordPress (P1) and Shopify and Wix guides (P2). An owner who cannot edit code can link to the hosted page instead.
- **FR-BE.3** The embed loads the booking flow in an isolated iframe and passes events to the host page through a documented message API (booked, closed, resized).
- **FR-BE.4** Allowed embedding origins are set per account; other origins are refused.
- **FR-BE.5** Third-party-cookie restrictions must not break it: the flow works with first-party tokens in the URL and no reliance on third-party cookies.
- **FR-BE.6** Prefill from the host page (service, staff, UTM parameters, logged-in customer name and phone) through attributes or the script API.

### 11.4 Chat widget

**Install and configuration**

- **FR-W.1** One script tag with a public key. Also: a WordPress plugin (P1), Shopify app embed and a React package (P2), and written guides for Wix, Squarespace and Google Tag Manager.
- **FR-W.2** Allowed origins per account; requests from other origins are rejected.
- **FR-W.3** Owner controls: name, avatar, brand color, position, greeting, suggested questions, business hours, offline message, languages, and per-page rules (show or hide on given URLs).

**Visitor experience**

- **FR-W.4** Floating launcher, full-screen on mobile, keyboard and screen-reader accessible.
- **FR-W.5** The first AI message states that it is an AI assistant (section 8). The visitor can ask for a human at any time.
- **FR-W.6** Optional pre-chat form (name, phone). A visitor who gives a phone number becomes a contact and can continue on WhatsApp.
- **FR-W.7** Quick-reply buttons, suggested questions, typing indicator, read receipts, emoji and limited image or file upload (size-limited and scanned for malware).
- **FR-W.8** Rich cards inside the conversation: service card, inline slot picker that books without leaving the chat, payment link card, location card.
- **FR-W.9** **Continue on WhatsApp** button: a deep link carrying a one-time code so the web thread and the WhatsApp thread merge into one conversation.
- **FR-W.10** After hours, the AI still answers, captures the lead and promises the next human reply time stated by the owner.
- **FR-W.11** History persists across visits through an anonymous visitor ID and merges into the contact once the visitor identifies themselves.
- **FR-W.12** Proactive triggers (time on page, exit intent, specific URLs) are P1, off by default, and respect consent rules.
- **FR-W.13** Visitor context (page URL, referrer, UTM, device, language) is passed to the AI and stored on the contact. The AI uses the page the visitor is on (for example a service page) to answer in context.
- **FR-W.14** Transcript by email on request.

**Privacy and consent**

- **FR-W.15** In regions that require it, the widget sets no cookies or local storage until the visitor interacts or consent is given. A hook lets the owner's cookie banner call `Widget.consent(true)`.
- **FR-W.16** The privacy notice link and the stored-and-reviewed notice (FR-CP.3) show in the first screen.

**JavaScript API**

- **FR-W.17** `Widget.open()`, `close()`, `identify({name, email, phone})`, `setAttributes({...})`, `showBooking()` and events `onMessage`, `onLead`, `onBooking`.
- **FR-W.18** Identity verification: logged-in sites pass a server-signed identity token so a visitor cannot impersonate another customer.

**Technical and safety**

- **FR-W.19** Loader under 20 KB gzipped, then lazy-loads the app inside an isolated iframe. It never blocks the host page.
- **FR-W.20** Realtime over WebSocket with automatic fallback to long polling, reconnection and an offline message queue.
- **FR-W.21** Abuse protection: per-visitor message limits, invisible captcha, bot detection, message size limits, escaped output to prevent script injection, and an owner block list.
- **FR-W.22** Metrics: opens, conversations started, lead capture rate, containment rate (resolved without a human), bookings from chat.
- **FR-W.23** If our service is unreachable, the widget hides itself or shows a static contact card with phone and WhatsApp; it never shows a broken box.

### 11.5 Lead forms

- **FR-F.1** Inline embed, popup, and standalone hosted page, built from the same definition (extends FR-4.1 to FR-4.4).
- **FR-F.2** Multi-step forms, conditional fields, file upload, hidden fields (UTM, page, referrer), prefill from URL parameters and a consent block per profile.
- **FR-F.3** Submit emits `form.submitted`, creates or updates the contact, and starts the instant-response recipe within seconds.
- **FR-F.4** Spam protection (rate limit, honeypot, invisible captcha) and optional double opt-in (P1).
- **FR-F.5** Labels and errors translate per page language (section 9.3). Survey mode (P2): the same builder offers rating, NPS and CSAT questions, scoring, a private feedback path for low scores and response analytics; every respondent still sees the review link, so feedback never gates reviews (FR-9.2). Builder screen: section 29.17.

### 11.6 Click-to-WhatsApp links and QR codes

- **FR-Q.1** Generate links of the form wa.me with a prefilled message and a tracking code, one per campaign or placement (Instagram bio, flyer, shop window, business card).
- **FR-Q.2** The tracking code is stored on the contact as the source and reported in attribution (FR-12.3).
- **FR-Q.3** QR code generator with a printable poster (A4 PDF with the business logo and a call to action) and a PNG for social posts.
- **FR-Q.4** Parsing referral data from Click-to-WhatsApp ads (P3).

### 11.7 Hosted payment page, review landing and link hub

- **FR-H.1 Payment page (P0).** Opens from a payment link: amount, description, business name, gateway checkout, and a receipt by WhatsApp or email on success.
- **FR-H.2 Review landing (P1).** A short page with a single button to the Google review form for the right location. It never filters visitors by sentiment (section 15.9).
- **FR-H.3 Link hub (P2).** One hosted page with buttons for Book, WhatsApp, Call, Directions, Reviews and Menu; a single link for social bios.

### 11.8 Requirements common to every public surface

- **Performance:** payload and load budgets as above; served from a CDN close to the visitor.
- **Availability:** 99.9% target, higher than the owner app, because downtime loses leads. A public status page and a static fallback exist for every surface.
- **Versioned embeds:** `embed.js` is served from a stable channel with long caching; breaking changes ship under a new major path so existing customer sites never break.
- **Security:** strict content-security policy, origin allow-lists, signed identity tokens, rate limiting, captcha, no secrets in the client, no personal data in URLs.
- **Privacy:** minimal cookies, consent hooks, region-correct wording, and visitor IDs documented in the privacy notice.
- **Accessibility and i18n:** WCAG AA, keyboard navigation, right-to-left support (P2), translated strings.
- **Theming:** design tokens for colors, radius and fonts; light and dark modes; 'Powered by' badge removable on higher plans.
- **Analytics:** a common event schema (viewed, interacted, converted) feeding the dashboard and attribution.

### 11.9 Preference center and privacy request page (P1)

- **FR-PC.1 Preference center.** A page opened from a signed link in every marketing message (email footer, template footer where the channel allows it, SMS). It shows the contact's consent per channel and purpose with toggles and a one-click 'unsubscribe from all'. Changes are written to the consent ledger immediately. No login is needed, and the page follows the visitor's language. Email also carries the one-click unsubscribe header.
- **FR-PC.2 Privacy request page.** A public page per account where a customer can ask for access, correction, deletion, restriction or objection, or ask for human review of an automated decision. The requester verifies identity by an emailed or texted code. Submission creates a request in the queue with its due date (section 30.6) and sends a confirmation to the requester.
- **FR-PC.3** Both pages show the business name and logo and the privacy contact, set no tracking beyond what is essential, meet WCAG AA, and are translated like every other public surface.

## 12. Team, Roles and Permissions

Owners run the business, staff handle conversations, and the AI employee acts with the permissions its owner grants. Permissions are enforced by the API, so the UI, the AI and the public API all obey the same rules.

### 12.1 Roles

| Role | Who | Scope |
| --- | --- | --- |
| Owner | The business owner; one or more per account | Everything, including billing and deleting the account |
| Admin | Trusted manager or agency operator | Everything except billing and account deletion |
| Manager | Team lead, receptionist lead | Conversations, bookings, contacts, approvals and reports; no connections or compliance settings |
| Staff | Receptionist, stylist, sales rep | Assigned conversations, own calendar, own bookings and tasks |
| Read-only | Accountant, investor, auditor | View dashboards and reports |
| Agency Owner and Agency Admin (P2) | Agency staff across client sub-accounts | Switch between sub-accounts; permissions inside each are set by the role granted there |
| Platform Support and Support Admin | Our staff | Access only with the owner's time-limited approval; every view is logged (FR-CP.13) |

### 12.2 Permission matrix

| Capability | Owner | Admin | Manager | Staff | Read-only |
| --- | --- | --- | --- | --- | --- |
| Billing, plan and invoices | Yes | No | No | No | No |
| Connect or disconnect integrations | Yes | Yes | No | No | No |
| Create, edit or pause AI employees; change autonomy | Yes | Yes | No | No | No |
| Approve AI actions and drafts | Yes | Yes | Yes | Own conversations | No |
| Compliance settings (disclosure, consent, retention, recording) | Yes | Yes | No | No | No |
| View all conversations | Yes | Yes | Yes | Assigned only | Yes |
| Send messages | Yes | Yes | Yes | Yes | No |
| View and edit contacts | Yes | Yes | Yes | Assigned or own | View |
| Export or delete contacts | Yes | Yes | No | No | No |
| Pipelines and opportunities | Yes | Yes | Yes | Assigned | View |
| Bookings and calendar | Yes | Yes | Yes | Own calendar | View |
| Publish social posts and review replies (when approval is required) | Yes | Yes | Yes | No | No |
| Reports and dashboard | Yes | Yes | Yes | Own metrics | Yes |
| Manage team and invitations | Yes | Yes | No | No | No |
| View audit log | Yes | Yes | No | No | No |
| Data export and account deletion | Yes | No | No | No | No |

### 12.3 Requirements

- **FR-T.1** Invite by email or by a shareable link (copy it, show a QR code, or share it through any messaging app) with a role and optional location scope; invitations expire.
- **FR-T.2** Location-scoped roles: a manager can be limited to one branch's conversations, bookings and reports.
- **FR-T.3** Record-level visibility: staff can be restricted to contacts and conversations assigned to them.
- **FR-T.4** Two-factor authentication is required for Owner and Admin and optional for others; passkeys are P2; single sign-on is P3.
- **FR-T.5** Session management: device list, remote sign-out, idle timeout, and sign-in alerts for new devices.
- **FR-T.6** Offboarding a team member reassigns their conversations, tasks and bookings, ends their sessions and calendar connection, and logs the change.
- **FR-T.7** Custom roles are P3. Until then the five roles above cover all accounts.
- **FR-T.8** Every permission check is server-side and covered by automated tests for cross-role and cross-tenant access (section 17).

### 12.4 Inviting team members by email

| Step | What happens | Rules |
| --- | --- | --- |
| 1. Start | An Owner or Admin opens Settings, Team, Invite, enters one or more email addresses (paste up to 50), picks a role and an optional location scope, and can add a personal note | Seats are checked against the plan with an upgrade prompt if full. The Owner role is assigned only by ownership transfer (section 27.5) |
| 2. Email | The invitee receives an email from our domain naming the business and the inviter, the role, and an Accept button | Written in the invitee's language if known, otherwise the inviter's. The link is single-use, tied to that email address, and valid for 7 days |
| 3. Accept (new user) | Sets a name and password, or signs in with Google using the same email. Clicking the link verifies the email, so no code is needed. Chooses language and timezone | Phone number is optional. Two-factor setup is required for the Admin role |
| 4. Accept (existing user) | Signs in and the business appears in their workspace switcher | One person can belong to several accounts with different roles |
| 5. Joined | Lands on a Home suited to the role; the inviter is notified | Role and scope apply immediately and the event is audited |
| 6. Manage | Pending invitations list with resend, revoke, change role or scope, and expiry | Resend limited to 3 per invitation; a revoked link stops working at once |

- **FR-T.9** Bulk invitations report per-address results (sent, already a member, invalid, blocked) without failing the whole batch.
- **FR-T.10** Optional domain allow-list per account (for example only addresses at the business's own domain), and a block list of disposable domains.
- **FR-T.11** Invitation emails are authenticated and rate-limited per account and per recipient. If an email bounces, the inviter sees it and can copy the invite link instead.
- **FR-T.12** Link invitations (secondary): an Admin can create a join link for one role that expires in 24 hours, and each person who uses it appears as a join request that an Admin must approve.
- **FR-T.13** Invitation, acceptance, role change, revoke and removal are all written to the audit log, and a removed member's work is reassigned (FR-T.6).
- **FR-T.14** The whole flow works with email alone. No phone number or messaging app is needed to join a team.

## 13. Billing, Plans and Usage Metering

Billing has to protect margin, because AI, WhatsApp and voice all cost real money per use, and it has to feel fair to owners who think in a single monthly number. Prices themselves are assumptions to validate (section 20); this section specifies the machinery.

### 13.1 Plan model

Plans are defined by an **entitlements** table (limits and features per plan) that the API checks on every relevant action. Plan names and prices are configuration, not code, and can differ by market and currency.

| Dimension | Limit type | Notes |
| --- | --- | --- |
| Seats (team members) | Included count, extra seats as add-on | Read-only seats free |
| Locations | Included count | Each location has its own market settings (section 9) |
| AI employees | Included count | One chat employee on the entry plan; the AI can be turned off entirely and the rest of the product keeps working |
| Active contacts | Included count, soft overage | Storage cost driver |
| AI conversations | Included per month, overage priced | A conversation is a 24-hour window with one contact |
| Channels | Feature gate | WhatsApp and web chat on all plans; email volume by plan; voice and SMS as add-ons |
| Features | Feature gate | Reputation, marketer, packs, white-label, API by plan |

### 13.2 Metered units and cost drivers

| Unit | Cost driver | How it is billed |
| --- | --- | --- |
| AI conversations and tokens | LLM provider | Included allowance, then per-conversation overage |
| WhatsApp messages | Meta fees by message category and country (rates change; confirm current rates before pricing) | Passed through at cost plus a stated margin, or bundled up to a cap |
| Emails | Email provider | Volume tiers |
| SMS segments (P2) | Aggregator | Pass-through plus margin |
| Voice minutes (P2) | Telephony, speech recognition and synthesis, LLM | Per-minute add-on with a monthly included pool |
| Phone numbers (P2) | Carrier rental | Monthly per number |
| Storage (recordings, uploads) | Object storage | Included allowance, then per GB |

### 13.3 Billing mechanics

- **FR-B.1 Currency and methods.** Plans in local currency per market (for example NGN and USD). Our own subscription is paid through Paystack, Flutterwave or Stripe by card or bank transfer, depending on the market.
- **FR-B.2 Trial.** A time-limited trial without requiring a card (length to decide in section 25). The trial runs the real product with usage caps and ends in Suggest-only mode, not a hard stop.
- **FR-B.3 Invoices and tax.** Invoices and receipts with sequential numbering, the correct legal entity per market, and VAT or sales tax where applicable. Local e-invoicing requirements are checked per country.
- **FR-B.4 Changes.** Upgrade and downgrade with proration, annual billing with a discount, pause (P2), and cancellation with data export (section 5.4).
- **FR-B.5 Dunning.** Failed payments retry on a schedule with email and WhatsApp reminders. After a grace period the account degrades gracefully: the AI moves to Suggest mode, then pauses new automations. It never cuts off in the middle of a conversation, and the owner can always read and export their data.
- **FR-B.6 Usage visibility.** A usage page shows current consumption against allowances, with alerts at 80% and 100%.
- **FR-B.7 Caps.** The owner chooses a hard cap (stop paid usage at the limit) or a soft cap with a monthly spending ceiling for pass-through costs.
- **FR-B.8 Prepaid credits (P1).** A wallet for pass-through usage (WhatsApp, SMS, voice) for markets where card payments are unreliable, with auto-top-up optional.
- **FR-B.9 Metering pipeline.** Usage events are idempotent, aggregated per account per day, auditable, and reconciled against provider invoices monthly.
- **FR-B.10 Margin dashboard (internal).** Revenue versus cost per account, per plan and per market, with alerts for accounts whose AI or messaging cost exceeds a set share of revenue.
- **FR-B.11 Entitlement checks.** Every feature gate and limit is enforced in the API, with a clear upgrade prompt in the UI and in the AI's handoff message to the owner.
- **FR-B.12 Agency billing (P2).** Wholesale plan, per-sub-account fee, rebilling markup, sub-account suspension controls, and payouts through Stripe Connect or a local equivalent.
- **FR-B.13 Refunds and disputes.** A documented refund policy, chargeback handling, and an audit trail of every billing change.

## 14. Scope and Priorities

**P0** = MVP, must ship for launch. **P1** = fast follow (first 60 days after launch). **P2** = next quarter. **P3** = later / exploratory.

| Area | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- |
| Platform | Multi-tenancy, auth, roles, event bus, queue, audit log, usage metering | Notifications center, billing | Public API, webhooks (outbound) | Marketplace |
| CRM | Contacts, tags, custom fields, timeline, import CSV | Smart lists, dedupe tools | Custom objects | Lead scoring ML |
| Sales | Leads, opportunities, one pipeline, kanban | Tasks and reminders | Multiple pipelines per account | Forecasting |
| Lead capture | Forms, embeddable widget, UTM capture | Web chat widget | QR codes, missed-call capture, survey mode in forms | Advanced survey scoring and reports |
| Channels and inbox | WhatsApp, email, web chat, unified inbox | Facebook and Instagram DMs | SMS (Termii, Twilio) | Telegram, voice notes |
| Workflows | Engine plus 4 recipes | 10 more recipes, recipe editor | Visual canvas | Marketplace of recipes |
| Booking | Availability, booking page, Google Calendar sync, reminders | Outlook sync, reschedule flows | Round-robin teams, paid bookings | Resource booking |
| **AI employee** | Receptionist, follow-up, scheduler, CRM clerk (approve and autopilot modes) | Reputation manager, analyst digest | Marketer, manager's assistant (chat) | Voice AI, multi-language tuning |
| Reputation | Review request workflow | Google review sync, analysis, reply drafts | Trend insights, staff and theme breakdown | Other review sites |
| Marketing | Brand profile | AI content drafts, approval queue | Social planner and publishing | Ad creative suggestions |
| Payments | Payment links (Paystack/Flutterwave) | Stripe, payment-to-pipeline automation | Invoices and estimates | Subscriptions |
| Dashboard | Leads, response time, bookings, revenue | Source attribution, funnel | Cohorts, exports | Custom reports |
| Agency and white-label | Tenancy designed in | Agency-level billing groundwork | White-label, custom domains, snapshots | Rebilling, reseller marketplace |
| Accounts and integrations | Connections hub, WhatsApp and calendar connect, email domain setup, web chat widget, payment connect | Gmail and Outlook sync, Google Business Profile, Facebook and Instagram, managed WhatsApp number fallback | LinkedIn and TikTok, SMS sender IDs, voice numbers, Google Contacts import | Ad accounts (read-only) |
| Onboarding and activation | Setup wizard, website import, guided knowledge interview, go-live gates, demo mode, first-week nudges | Second and third industry packs, assisted setup, funnel analytics | Paid concierge setup, agency setup mode | Self-serve training academy |
| AI employee creation | Chat employee wizard, sandbox, staged rollout, versioning, kill switch | Needs-training inbox, transcript review and sampling, templates and cloning | Inbound voice employee wizard, employee A/B tests | Outbound voice wizard, multi-employee routing |
| Compliance and governance | AI disclosure, consent ledger, opt-out, privacy policy, terms and DPA, audit log, retention, breach playbook, DPO, business-scope lock | Recording controls, regional profiles, DPIA templates, sub-processor page, redaction | EU data region, SOC 2, registrations beyond launch markets | Outbound voice and SMS controls, further certifications |
| Markets, localization and regions | Market pack engine, region attribute and routing, one live region, English UI, per-language WhatsApp templates, locale formatting | Second region (EU), French and Portuguese UI, Tier A and B AI languages, per-location settings | Third region, Swahili and Arabic (right-to-left), region-pinned AI inference | Self-serve region migration |
| Industry packs | Pack installer, General and Salon packs, Needs-your-input list, unverified-knowledge rule | Clinics, real estate and restaurant packs, pack updates with diff, pack analytics | Pack studio, schools, gyms and home-services packs, snapshots | Third-party pack marketplace |
| Public surfaces | Public booking page, basic chat widget, lead forms, Click-to-WhatsApp links and QR codes, hosted payment page | Booking embed, full widget (rich cards, WhatsApp handoff), review landing page, WordPress plugin | Custom domains, link hub, Shopify and React packages | Reserve with Google, ad referral parsing |
| Team and permissions | Five roles, permission matrix, two-factor for Owner and Admin, invitations, offboarding | Location-scoped roles, session management | Passkeys, agency roles | Custom roles, single sign-on |
| Billing and plans | Plans and entitlements, usage metering, trial, invoices, dunning with graceful degrade | Prepaid credits, margin dashboard, annual billing | Agency wholesale billing and rebilling | Marketplace revenue share |
| API, import and export | CSV import and export, open-format export on cancellation | Migration assistants (spreadsheets, HubSpot, GoHighLevel) | Public API, outbound webhooks, Zapier and Make, scheduled exports | App marketplace, native integrations |
| Mobile | Responsive PWA, one-tap approvals, WhatsApp deep-link notifications | Data-saver mode, offline reading | Native iOS and Android apps | Voice-note replies, advanced offline |
| Admin and support operations | Tenant directory, feature flags and kill switches, audited support access, AI debugger | Provider health, abuse tooling, compliance admin | Pack studio, market pack editor | Customer health scoring |
| Pages and funnels | Hosted forms and booking page only | Single landing page from a vertical template (form, booking embed, WhatsApp button) | Block editor, AI-drafted pages, simple multi-step funnels, custom domains, analytics | A/B tests, multi-page microsites, import from URL |
| Registration and account lifecycle | Sign-up and verification, login and recovery, two-factor for Owner and Admin, account states, close and delete | Phone-first sign-up, resume and reminders, ownership transfer | Apple sign-in, account pause, merge and split | Single sign-on |
| Compliance and governance center (tenant) | Checklist and readiness, disclosure, consent ledger and suppression list, legal documents, audit log | Recording and retention settings, requests inbox, access review | AI governance console, evidence exports, incident history | Certification support |
| Configuration management (market and industry packs) | Market pack and pack schemas, config as files with validation, installer, resolved-configuration view | Admin editors with review and release workflow, impact analysis, rollback | Pack studio, eval runner, localization workflow | Partner-authored packs |
| Manual operation (AI optional) | Manual path for every AI action, Human-only mode per account, location, channel and conversation, 'Manual only' onboarding, rule-based recipes, created-by tracking | Bulk manual tools, saved replies and templates library, manual and cash payment records | Visual recipe builder for manual workflows | None |
| Forms, tasks and customer privacy pages | Form builder (multi-step, conditional logic, consent block), responses table, hosted forms | Tasks screen with reminders, preference center, privacy request page, double opt-in, email template editor | Survey mode (rating, NPS, CSAT) with analytics, call conversations in the inbox | Form A/B tests |

## 15. Functional Requirements

### 15.1 Platform foundation (P0)

- **FR-1.1 Tenancy.** Hierarchy: Agency (optional) → Account (business) → Users. Every record carries `account_id`; row-level security enforces isolation.
- **FR-1.2 Auth and roles.** Email plus password and Google sign-in, with email verification. Roles: Owner, Admin, Staff, Read-only. Per-role permissions on inbox, pipeline, settings and billing.
- **FR-1.3 Event bus.** All meaningful changes emit typed events (`contact.created`, `message.received`, `form.submitted`, `appointment.booked`, `payment.succeeded`, `opportunity.stage_changed`, `review.received`). Workflows, AI and dashboards subscribe.
- **FR-1.4 Job queue.** Durable, retryable, delayable jobs for sends, waits, syncs and AI calls.
- **FR-1.5 Audit log.** Immutable record of every AI and human action with actor, timestamp, before/after and reason.
- **FR-1.6 Usage metering.** Count messages by channel, AI tokens and cost, storage and active contacts per account.
- **FR-1.7 Onboarding.** Guided setup under 30 minutes: business profile, connect WhatsApp, add services and prices, connect calendar, turn on AI. Target: first automated reply live at the end.

### 15.2 CRM (P0)

- **FR-2.1** Contact record: name, phone (E.164), email, source, tags, owner, custom fields, consent status per channel.
- **FR-2.2** Dedupe on normalized phone and email at creation and import.
- **FR-2.3** Activity timeline per contact: messages, form submissions, bookings, payments, stage changes, AI actions.
- **FR-2.4** CSV import with field mapping and error report.
- **FR-2.5** Custom field definitions (text, number, date, dropdown, boolean) per account.
- **FR-2.6 (P1)** Smart lists: saved filters on tags, fields, source, last activity, stage.
- **Acceptance:** two forms submitted with the same phone number produce one contact with two timeline entries.

### 15.3 Pipelines and opportunities (P0)

- **FR-3.1** One default pipeline per account, with editable stages (for example New, Qualified, Proposal, Won, Lost).
- **FR-3.2** Opportunity: contact, lead, stage, value, probability, owner, expected close, lost reason. The same record appears on the Pipeline board and in the Opportunities table.
- **FR-3.3** Kanban board with drag-and-drop; each move emits `opportunity.stage_changed`.
- **FR-3.4** A contact is not an opportunity. Inbound messages, forms and abandoned bookings create or update a **lead** (a potential buying relationship). An opportunity is created only when the business qualifies the lead: an AI suggestion, a staff action, or an account rule the owner turned on. Auto-create on first inbound is off by default.
- **FR-3.5 (P1)** Tasks with due dates and reminders, assignable to staff.
- **FR-3.6** Lead: contact, status (New, Working, Qualified, Disqualified, Converted), source, owner, last activity, next follow-up. A salon or clinic may convert a lead with a booking and never open an opportunity; a realtor typically qualifies into a valued deal.

### 15.4 Lead capture (P0)

- **FR-4.1** Form builder: fields, validation, thank-you message or redirect, consent checkbox.
- **FR-4.2** Embeddable script and hosted form page; per-account allowed origins.
- **FR-4.3** Capture UTM parameters, referrer and landing page on every submission and store on the contact.
- **FR-4.4** Spam protection: rate limiting, honeypot, optional captcha.
- **FR-4.5 (P1)** Web chat widget connected to the inbox and AI.
- **FR-4.6 (P2)** Click-to-WhatsApp links and QR codes with source tracking.

### 15.5 Channels and unified inbox (P0)

- **FR-5.1 Channel interface.** Common contract: `send`, `handleInbound`, `handleStatus`. Implementations: WhatsApp, email, web chat.
- **FR-5.2 WhatsApp.** Embedded Signup so each tenant connects their own number. Support free-form messages inside the 24-hour window and approved templates outside it. Delivery status (sent, delivered, read, failed).
- **FR-5.3 Email.** Per-account sending domain with guided SPF, DKIM and DMARC setup; bounce and complaint handling with automatic suppression; inbound reply parsing.
- **FR-5.4 Inbox.** One conversation thread per contact across channels; filters (unread, assigned, AI-handled, needs-human); assignment; internal notes; real-time updates.
- **FR-5.5 Idempotency.** Inbound webhooks are signature-verified, acknowledged fast, processed asynchronously and deduplicated by provider message ID.
- **FR-5.6 Consent.** Track opt-in and opt-out per channel; 'STOP' is honored immediately and blocks sends.
- **FR-5.7 (P1)** Facebook Messenger and Instagram DMs. **(P2)** SMS via local aggregator and Twilio.

### 15.6 Workflow engine and recipes (P0)

- **FR-6.1** Workflows stored as a versioned JSON graph: trigger → conditions → actions → waits.
- **FR-6.2** Triggers: any bus event, schedule, manual enrollment.
- **FR-6.3** Actions: send message, add or remove tag, move stage, create task, notify owner, call AI step, call webhook, wait.
- **FR-6.4** Per-contact run state; waits are delayed jobs; steps are idempotent; failures are visible in a run log.
- **FR-6.5** Channel awareness: the engine knows whether free-form WhatsApp is allowed and switches to a template or email otherwise.
- **FR-6.6** Stop conditions: contact replies, books, converts, opts out.
- **FR-6.7 Launch recipes (P0):** (1) Instant lead response, (2) No-reply follow-up sequence, (3) Appointment reminders and no-show recovery, (4) Post-visit review request.
- **FR-6.8 (P1)** Ten more recipes (win-back, birthday offers, quote follow-up, abandoned booking, payment reminder). **(P2)** Visual canvas editor over the same JSON.

### 15.7 Booking and calendar (P0)

- **FR-7.1** Services with duration, price, buffer, and staff assignment.
- **FR-7.2** Availability = working hours minus existing bookings minus connected calendar busy time minus buffers, in the business's timezone.
- **FR-7.3** Google Calendar OAuth sync, two-way.
- **FR-7.4** Public booking page and an internal API the AI uses to offer and book slots.
- **FR-7.5** Double-booking prevented by a database constraint and locking.
- **FR-7.6** Confirmation, reminder (24h and 2h defaults) and reschedule or cancel links.
- **FR-7.7 (P1)** Outlook sync. **(P2)** Round-robin across staff, deposits at booking.

### 15.8 The AI Employee (P0 core, expanding by phase)

**Definition.** One agent per account, with role-specific skills, acting through the same internal tools as human staff. Triggered by events, schedules, or the owner's instructions.

Creation and monitoring flows for chat and voice employees are in section 7; the compliance controls every employee must satisfy are in section 8.

#### 15.8.1 Operating loop

1. **Trigger:** event (`message.received`, `form.submitted`, `lead.idle`, schedule) or owner request.
2. **Context load:** business profile, knowledge base (retrieved), contact history and stage, owner rules.
3. **Decide:** reply, ask a question, book, tag, update, escalate, or do nothing.
4. **Act:** call tools, each permission-checked and logged.
5. **Report:** activity feed entry; approval requested where required.

#### 15.8.2 Roles and phasing

| Role | Responsibilities | Priority |
| --- | --- | --- |
| Receptionist | Answers inbound messages 24/7 on WhatsApp, web chat, email; answers FAQs from the knowledge base; qualifies leads (what, when, budget) | P0 |
| Sales follow-up | Instant reply to new leads; runs nurture and no-reply sequences; re-engages cold leads; stops on conversion or opt-out | P0 |
| Scheduler | Offers slots, books, reschedules, cancels, confirms, reminds, recovers no-shows | P0 |
| CRM clerk | Tags, fills custom fields from conversations, moves stages, flags duplicates | P0 |
| Collections | Sends payment links, nudges unpaid bookings, marks deals won on payment | P1 |
| Reputation manager | Requests reviews, analyses and drafts replies to Google reviews (section 15.9) | P1 |
| Analyst | Weekly digest, anomaly alerts, suggestions | P1 |
| Marketer | Drafts posts, captions and offers; schedules after approval (section 15.10) | P2 |
| Manager's assistant | Owner chats with it: 'who haven't we replied to?', 'send an offer to last month's visitors' | P2 |
| Voice | Answers inbound calls first, places outbound calls later; creation flow in section 7.3 | P2 inbound, P3 outbound |

#### 15.8.3 Tool catalog and permissions

| Tool | Description | Default permission |
| --- | --- | --- |
| `send_message` | Reply in the current conversation | Autopilot (inside rules) |
| `send_template` | Send an approved WhatsApp or email template | Autopilot |
| `get_availability` / `book_appointment` | Read slots, create or change bookings | Autopilot |
| `update_contact` / `add_tag` | Edit fields and tags | Autopilot |
| `move_stage` | Change pipeline stage | Autopilot |
| `create_task` / `notify_owner` | Hand off or flag | Autopilot |
| `create_payment_link` | Generate link for a known service price | Autopilot for listed prices, approval otherwise |
| `offer_discount` / `refund` | Any money concession | **Disabled** unless owner sets explicit limits; approval required |
| `post_review_reply` | Publish a Google review reply | Approval (autopilot only for 4 to 5 stars with no flags, if owner enables) |
| `publish_social_post` | Publish to a social account | Approval |
| `bulk_message` | Message many contacts | Approval always |

#### 15.8.4 Autonomy levels

Per role, the owner chooses **Suggest** (AI drafts, human sends), **Approve** (AI acts after one-tap approval) or **Autopilot** (AI acts and reports). Defaults: replies and follow-ups on Autopilot; money, bulk sends and public posts on Approve.

#### 15.8.5 Requirements

- **FR-8.1 Business profile and knowledge base.** Owner enters services, prices, hours, location, policies, FAQs, tone of voice; can upload documents or paste a website URL for import. Stored with embeddings for retrieval.
- **FR-8.2 Grounding.** Factual claims (price, hours, policy) must come from the knowledge base. If not found, the AI says it will check, creates a task and notifies the owner.
- **FR-8.3 Handoff.** Automatic pause and escalation on: anger or complaint, request for a human, legal, safety or medical topics, money concessions, low confidence, repeated failed attempts. Staff can pause or resume the AI per conversation.
- **FR-8.4 Language.** Handle English, Nigerian Pidgin and common local languages gracefully; reply in the customer's language where supported, else English.
- **FR-8.5 Channel and timing rules.** Respects the WhatsApp 24-hour window, quiet hours per account, and consent.
- **FR-8.6 Human-sounding replies.** Short, tone-matched, no repeated boilerplate; a clear note that the customer is chatting with an assistant if the owner or local rules require disclosure (setting).
- **FR-8.7 Activity feed.** Chronological list of what the AI did, with the message sent and the reason, filterable by role and contact.
- **FR-8.8 Approval queue.** One place for pending drafts and actions, with approve, edit and reject, plus mobile push.
- **FR-8.9 Cost controls.** Per-account token budgets, model routing (cheap model for routine replies, stronger model for hard cases), and alerts on abnormal usage.
- **FR-8.10 Evals.** Maintain a transcript test set; every prompt or model change must pass regression evals before release.
- **FR-8.11 Feedback loop.** Owner can mark any AI reply as good or bad with a reason; corrections feed the account's rules and the eval set.
- **FR-8.12 Safety.** Prompt-injection resistance: customer message content is treated as data, never as instructions; tools validate arguments server-side.

**Acceptance example:** a new form lead at 9:47pm receives a relevant WhatsApp reply in under 60 seconds with price context and two open slots; if the lead picks one, a booking is created, a confirmation is sent and the opportunity moves to Booked, with no human action and a complete audit trail.

### 15.9 Reputation manager (P1; review requests P0)

- **FR-9.1 Review requests (P0).** After `appointment.completed` or `payment.succeeded`, send a personal message with the Google review link. Maximum one reminder; skip opted-out contacts.
- **FR-9.2 Policy compliance.** The review link is sent to all eligible customers; no filtering by sentiment (review gating) and no incentives for reviews. Complaints received privately are routed to the owner without hiding the link from anyone.
- **FR-9.3 Connect (P1).** Google OAuth (`business.manage` scope), location selection, and token-expiry detection with reconnect prompts. Requires Google Business Profile API approval.
- **FR-9.4 Sync (P1).** Pub/Sub notifications where available plus polling every 15 to 30 minutes; store reviews per location with rating, text, reviewer name, timestamps and reply status; emit `review.received`.
- **FR-9.5 Analysis (P1).** Sentiment, topics (wait time, price, staff, quality), urgency, and suspected spam or fake classification.
- **FR-9.6 Reply drafts (P1).** Grounded, specific, non-defensive; never admits liability, promises refunds or shares private details. Negatives, and anything about money, safety, staff misconduct or legal threats, always require owner approval.
- **FR-9.7 Insights (P2).** Theme trends, rating drift alerts, response-time metrics, staff and service breakdowns, weekly digest section.
- **FR-9.8 Multi-location (P1).** Reviews modeled per location.

### 15.10 Marketer and social planner (P1 drafts, P2 publishing)

- **FR-10.1 Brand profile (P0).** Tone, audience, offers, do's and don'ts, brand colors and logo.
- **FR-10.2 Content drafts (P1).** AI proposes weekly post ideas, captions and promotional offers from the brand profile, upcoming events and top reviews (with reviewer permission).
- **FR-10.3 Approval queue (P1).** Draft → approved → scheduled → published, with edit and reject.
- **FR-10.4 Publishing (P2).** Facebook and Instagram through the Meta Graph API, then LinkedIn and TikTok; scheduled publishing, status tracking and error handling. Requires Meta app review.
- **FR-10.5 Campaigns (P2).** Broadcast offers to a smart list over WhatsApp templates or email, with opt-out handling and performance tracking.

### 15.11 Payments (P0 links, P1 expansion)

- **FR-11.1** Payment links via Paystack and Flutterwave for a service, deposit or custom amount.
- **FR-11.2** Webhook confirmation emits `payment.succeeded`, updates contact and opportunity, and notifies the owner.
- **FR-11.3 (P1)** Stripe for international accounts. **(P2)** Invoices and estimates.

### 15.12 Dashboard and reporting (P0 basics)

- **FR-12.1** Home: leads this month, median response time, bookings, revenue, and leads needing a human.
- **FR-12.2** Speed-to-lead metric: time from lead arrival to first reply, AI versus human.
- **FR-12.3 (P1)** Source attribution: leads, bookings and revenue by source and campaign using stored UTM data.
- **FR-12.4 (P1)** Weekly digest by WhatsApp and email.
- **FR-12.5 (P2)** Exports and cohort views.

### 15.13 Notifications (P1)

Push, email and WhatsApp alerts to the owner for escalations, approvals, negative reviews, payment received and weekly digest; per-user preferences.

### 15.14 Agency and white-label (architected P0, shipped P2)

- **FR-14.1** Agency account with sub-accounts and cross-account switcher.
- **FR-14.2** White-label: custom domain (automatic TLS), logo, colors, product name, branded emails and login.
- **FR-14.3** Snapshots: export and import an account's pipelines, forms, recipes, templates and AI configuration as JSON.
- **FR-14.4** Billing: agency pays us; agency charges its clients via Stripe Connect or local equivalent; usage rebilling from metering data.

### 15.15 Voice AI (P2 inbound, P3 outbound)

Telephony plus realtime speech-to-LLM-to-speech with sub-second latency. Inbound answering ships in P2 once chat is stable. Outbound calling ships last, and only in markets where section 8 shows a clear consent path. Creation flow: section 7.3.

### 15.16 Public API, webhooks and integrations (P2)

- **FR-API.1** REST API with the same permissions model as the app: API keys and OAuth apps, scopes per resource, per-tenant rate limits, cursor pagination, idempotency keys and versioned paths.
- **FR-API.2** Published OpenAPI specification, interactive docs, a sandbox account and a changelog with deprecation notices of at least 6 months.
- **FR-API.3** Outbound webhooks for every bus event (`contact.created`, `message.received`, `appointment.booked`, `payment.succeeded`, `review.received`), with HMAC signatures, retries with backoff, a delivery log and manual replay.
- **FR-API.4** Zapier and Make connectors (P2). Native integrations in this order: Google Sheets, Shopify, WooCommerce, accounting tools (P3).
- **FR-API.5** Embed SDKs for the widget and booking flow (section 11).
- **FR-API.6** Third-party app marketplace is P3 and needs app review, scoped permissions and revocation.

### 15.17 Data import, export and migration

- **FR-IM.1 (P0)** CSV import and export for contacts with field mapping, validation, dedupe rules and an error report. Imports require a lawful-basis attestation (FR-CP.5).
- **FR-IM.2 (P1)** Migration assistants from spreadsheets, HubSpot and GoHighLevel exports: contacts, tags, pipelines and opportunities, with a preview and a dry run.
- **FR-IM.3 (P2)** Conversation history import (where the source allows) and scheduled full-account exports to the owner's cloud storage.
- **FR-IM.4** Export formats are open (CSV and JSON). Account deletion is preceded by an offered export (section 5.4).
- **FR-IM.5** Large imports run as background jobs with progress, partial-failure handling and undo for 7 days.

### 15.18 Mobile experience

Owners and staff live on phones, so mobile is a primary surface, not an afterthought.

- **FR-MO.1 (P0)** Fully responsive installable web app (PWA) with push notifications where the platform allows them.
- **FR-MO.2 (P0)** Mobile-first owner views: inbox, approval queue, today's bookings, dashboard. Approvals complete in one tap with edit-before-send.
- **FR-MO.3 (P0)** Notifications by push and email, and by WhatsApp or SMS where enabled and consented, with deep links into the exact conversation or approval.
- **FR-MO.4 (P1)** Data-saver mode and offline reading of recent conversations for weak connections.
- **FR-MO.5 (P2)** Native apps (Expo) for iOS and Android: push, voice-note replies, offline cache, biometric unlock.
- **FR-MO.6** Performance targets: inbox interactive in under 3 seconds on a mid-range phone over 3G-class networks.

### 15.19 Platform admin console and support operations

Internal tools our team needs to run the product safely. A minimal version is P0 because launch support depends on it; the full specification is section 31.

- **FR-AD.1** Tenant directory with plan, status, market, region, usage, cost and health score.
- **FR-AD.2** Feature flags per tenant, per market and per plan; kill switches per employee, per account and global.
- **FR-AD.3** Support access: impersonation only with the owner's time-limited approval, read-only by default, fully audited (FR-CP.13).
- **FR-AD.4** AI debugger: for any AI action, show the context that was loaded, retrieved knowledge, tool calls, output, model version and cost.
- **FR-AD.5** Provider health: webhook delivery logs, queue depth and lag, WhatsApp quality rating and template status per tenant, email reputation per sending domain.
- **FR-AD.6** Abuse and trust tooling: spam and abuse review queues, tenant suspension, sender reputation actions.
- **FR-AD.7** Compliance admin: consent audit lookup, data-subject request tracker, retention job status, market pack and legal document versions.
- **FR-AD.8** Pack studio (P2) and market pack editor (section 9, section 10).
- **FR-AD.9** Role-based internal access with two-factor authentication; no routine direct database access; every admin action logged.
- **FR-AD.10** Customer support: in-app help with an AI helper that answers from our documentation and hands off to a human, a help center, a status page, and response targets by plan.

### 15.20 Landing pages and funnels (P1 single page, P2 editor and funnels)

Owners need somewhere to send traffic. This is a focused builder for landing pages and simple funnels that capture leads and bookings. A full multi-page website builder, blog and online store stay out of scope: owners keep their own site and embed our booking page, widget and forms (section 11).

- **FR-PG.1 (P1)** Single landing page from a vertical template: hero, services, testimonials, FAQ, lead form, booking embed, chat widget, WhatsApp button and map. Hosted on a platform subdomain with publish and unpublish.
- **FR-PG.2 (P2)** Block editor with mobile-first preview, autosave, version history and restore.
- **FR-PG.3 (P2)** AI draft: the AI writes copy and layout from the business profile, verified knowledge and a short prompt. The owner approves before publishing. Prices and claims come only from verified knowledge, and claims are checked against the banned-claims list.
- **FR-PG.4 (P2)** Simple funnels: ordered steps (landing page, form, thank-you, booking, payment) with per-step visits, drop-off and conversion. UTM parameters carry through every step.
- **FR-PG.5** Hosting: platform subdomain; custom domain with automatic TLS (P2); CDN with static rendering; the performance and availability budgets in section 11.8.
- **FR-PG.6** SEO: title, meta description, social preview image, structured data, sitemap, indexable toggle and redirects.
- **FR-PG.7** Compliance: consent block, privacy links and, where the profile requires, a cookie notice and the AI disclosure on the chat widget. Pages meet WCAG AA.
- **FR-PG.8** Languages: one language per page (P1); linked language variants (P2).
- **FR-PG.9** Analytics: visits, sources and conversions tied to contacts and attribution (FR-12.3).
- **FR-PG.10** Safety: no tenant-supplied scripts (an approved tracking-pixel list in P2), moderation for prohibited claims and phishing, domain-ownership verification, and an abuse report link.
- **FR-PG.11 (P3)** A/B tests, multi-page microsites and import from an existing URL.

### 15.21 Manual operation and AI-optional mode

The AI employee is an accelerator, not a prerequisite. Everything it can do, a person can do by hand in the same screens, and the product stays fully useful with the AI switched off.

| Capability | By the AI employee | By a person (manual path) |
| --- | --- | --- |
| Create a contact or lead | From a conversation, form or booking | Quick create (+), add contact, CSV import, forms and booking page |
| Reply to a customer | Drafts or sends replies | Inbox composer, saved replies, templates |
| Follow up | Recipes and AI follow-ups | Tasks and reminders; start a recipe by hand; send a template |
| Book an appointment | Offers slots and books | Create a booking in the calendar; customers self-book on the booking page; share the link |
| Update CRM (tags, fields, stage) | CRM clerk skill | Edit on the contact; drag the opportunity; bulk actions |
| Take payment | Sends a payment link | Create a payment link by hand; record a cash or transfer payment (P1) |
| Collect reviews | Review request recipe | Send a request by hand; switch the recipe on or off |
| Reply to reviews | Drafts a reply | Write and post the reply |
| Create marketing content | Drafts posts and offers | Compose, upload media, schedule; build a campaign by hand |
| Answer FAQs | Uses the knowledge base | Staff answer; saved replies library |
| Create pages | AI draft | Template and block editor |
| Reports and digests | Analyst summaries | Reports screens and scheduled rule-based digests |

- **FR-MA.1** No capability requires the AI. Every action an AI tool can perform (section 15.8.3) has a UI path and an API path with the same permissions, validation and audit.
- **FR-MA.2** Manual-only mode: an account, a location, a channel, or a single conversation can run with the AI off ('Human only'). The state is visible in the inbox and reversible.
- **FR-MA.3** Onboarding offers a 'Manual only for now' path. The AI can be enabled later without redoing setup, and the knowledge base and industry pack still help.
- **FR-MA.4** Recipes work without AI steps. Rule-based follow-ups (templates, delays, conditions) are the default; AI steps (generate, classify, reply) are optional blocks.
- **FR-MA.5** Manual creation uses the same data model and validation as AI creation. Every record carries a 'created by' value (person, AI employee, recipe, form, booking page, import, API) shown in the timeline and usable in reports.
- **FR-MA.6** AI suggestions in the composer, drafted replies and summaries are toggles per user and per account. Turning them off hides the AI interface without removing data.
- **FR-MA.7** AI-specific controls (AI disclosure, evals, approvals queue, employee wizard) appear only when an AI employee exists. Consent, opt-out, retention and audit controls apply either way.
- **FR-MA.8** Reports separate manual and AI-handled work, so owners can compare response time, bookings and conversion.
- **FR-MA.9** Plans: AI is an entitlement and a metered add-on (section 13). A plan without AI still includes CRM, inbox, booking, forms, payments, rule-based recipes, review requests and reports.
- **FR-MA.10** Manual tools are built to be efficient, not a fallback: bulk actions, templates, saved views and keyboard shortcuts.
- **FR-MA.11** If the AI is switched off mid-conversation, the thread goes to a human with the history and a summary.
- **Acceptance:** a new account that skips the AI entirely can capture a lead from a form, reply, book, take a deposit and see the revenue in reports in its first session.

## 16. Non-Functional Requirements

- **Security.** Tenant isolation by row-level security; encryption at rest and in transit; OAuth tokens encrypted; secrets in a vault; audit log immutable; regular dependency scanning.
- **Privacy and compliance.** Full requirements are in section 8; the baseline is NDPA 2023 with GAID 2025 (Nigeria) and GDPR-readiness: consent tracking, data export and deletion per contact and per account, data processing records.
- **Reliability.** 99.5% API uptime at launch; no message lost (queue-backed, retried, idempotent); graceful degradation if the AI provider is down (fall back to templates and human handoff).
- **Performance.** Inbound message to AI reply start under 5 seconds p95; inbox updates under 1 second.
- **Scalability.** Designed for 10,000 accounts and 10 million messages per month on a single region before re-architecting.
- **Observability.** Structured logs, tracing across webhook → queue → worker, per-tenant dashboards, alerting on queue lag and webhook failures.
- **Accessibility and UX.** Mobile-first web app (owners live on phones), responsive, WCAG AA basics.
- **Localization.** Specified in section 9. English first for the interface; AI conversation languages follow the quality tiers in section 9.3.

## 17. Quality, Testing and Release Strategy

A missed lead, a wrong price or a cross-tenant data leak each costs more than a late feature, so quality gates are part of the product scope.

### 17.1 Testing layers

| Layer | What it covers | Gate |
| --- | --- | --- |
| Unit and integration | Domain logic, provider adapters against sandboxes | Every pull request |
| Contract tests | Webhook payloads from WhatsApp, email, payment and calendar providers | Every pull request |
| End to end | Onboarding, inbox, booking page, chat widget, payment link flows on real browsers and mobile viewports | Before each release |
| Tenancy and permissions | Automated attempts to read or write across tenants and roles (FR-T.8) | Every pull request; failure blocks release |
| Load and resilience | Message bursts, campaign sends, provider outages, queue backlogs, slow LLM responses | Before launch and quarterly |
| Security | Dependency and code scanning, secrets scanning, penetration test | Continuous; pen test before launch and yearly |
| Accessibility and i18n | WCAG AA checks, pseudo-localization, right-to-left rendering | Before each release of public surfaces |

### 17.2 AI quality

- Evaluation suites by role, language, vertical and market, run on every prompt, model, pack or persona change (FR-G.4, FR-L.8, FR-IP.6).
- A red-team set covering prompt injection, attempts to extract other customers' data, off-scope requests, abuse, and fake emergencies.
- Shadow mode in production: new employees or prompts run silently beside the live one and are compared before taking over.
- Canary rollout: a new prompt or model serves 5% of conversations first, with automatic rollback if handoff rate, correction rate, latency or cost regress beyond thresholds.
- Human sampling: about 5% of conversations reviewed in the first 30 days and a rolling sample after that, with findings feeding the eval set.

### 17.3 Service levels

| Surface | Target |
| --- | --- |
| Public booking page, chat widget, forms | 99.9% availability monthly |
| Owner app and API | 99.5% availability monthly |
| Webhook acknowledgement | Under 2 seconds |
| Inbound message to AI reply start | Under 5 seconds p95 |
| Inbox real-time update | Under 1 second |
| Dashboard data freshness | Under 5 minutes |
| Voice turn latency (P2) | Under 1 second typical |

### 17.4 Release and operations

- **Environments:** development, staging and production, with production per region (section 9.2).
- **Feature flags and progressive rollout** by tenant cohort and market; every risky feature ships dark first.
- **Safe migrations:** expand-then-contract schema changes with no downtime; embed scripts versioned (section 11.8).
- **Rollback:** one-step rollback for application releases and prompt versions.
- **Incidents:** on-call rotation, severity levels, a public status page, and a post-incident review within 5 business days.
- **Backups and recovery:** continuous backups with point-in-time recovery, recovery point of 15 minutes, recovery time of 4 hours per region, and a restore drill each quarter. Cross-region failover is P3.
- **Documentation:** help center, API reference, changelog, and an internal runbook per alert.

## 18. Architecture Overview

### 18.1 Components

- **API and workers:** NestJS (TypeScript), modular by domain.
- **Database:** Postgres with row-level security and pgvector for knowledge retrieval.
- **Queue and workflows:** Redis with BullMQ, or Inngest/Temporal for durable workflows.
- **Web app:** React with TanStack Router and shadcn/ui, delivered as three separate apps (tenant app, platform admin console, public surfaces); native mobile apps (Expo) in a later phase.
- **Real-time:** WebSockets or SSE for the inbox and activity feed.
- **Providers:** WhatsApp Cloud API (direct or via a BSP), SES/Postmark/Resend, Paystack/Flutterwave/Stripe, Google (Calendar, Business Profile), Meta Graph API, an LLM provider with model routing.

**Regions and public surfaces.** Each data region runs a complete stack (API, database, queue, workers, object storage, vector index), and a thin global control plane holds the tenant-to-region map, sign-in directory and billing (section 9.2). Public surfaces (booking page, widget, forms) are served from a CDN with a static fallback (section 11.8).

### 18.2 Core entities

`agencies`, `accounts`, `users`, `memberships`, `contacts`, `contact_channels`, `tags`, `custom_fields`, `pipelines`, `stages`, `opportunities`, `conversations`, `messages`, `forms`, `form_submissions`, `workflows`, `workflow_runs`, `services`, `staff`, `availability_rules`, `appointments`, `payments`, `reviews`, `social_posts`, `knowledge_items` (with embeddings), `ai_actions` (audit), `approvals`, `usage_events`, `events` (bus log).

Added entities: `markets`, `regions`, `locations`, `packs`, `pack_installs`, `translations`, `booking_pages`, `widget_configs`, `visitors`, `subscriptions`, `entitlements`, `usage_aggregates`, `invoices`, `roles`, `api_keys`, `webhook_endpoints`, `consent_records`.

### 18.3 Key design rules

1. Every table has `account_id`; all queries are tenant-scoped through RLS.
2. Features communicate through events, not direct calls.
3. The AI uses the same internal API as the UI, so permissions and audit apply automatically.
4. All provider webhooks are idempotent and signature-verified.
5. Workflow definitions are data (JSON), which enables recipes, snapshots and a future canvas without re-architecture.

## 19. External Dependencies and Lead Times

Start these in parallel with development, as several block launch:

| Dependency | Why it matters | Risk |
| --- | --- | --- |
| Meta Business verification and WhatsApp Embedded Signup | Required for tenants to connect numbers; template approval | Weeks; template rejections |
| Google Business Profile API access | Review sync and replies | Approval not instant; quotas |
| Meta app review (Instagram and Facebook posting) | Social publishing | Weeks; strict requirements |
| Paystack / Flutterwave business accounts | Payments | KYC delays |
| Email domain and IP reputation | Deliverability | Needs warmup |
| LLM provider limits and pricing | AI cost and latency | Pricing changes; outages |
| Telephony and voice AI provider | Inbound and later outbound voice, number provisioning | Per-country number rules, latency, cost per minute |
| Legal counsel in each launch market | Terms, DPA, consent wording, recording and voice rules | Lead time and cost; blocks voice and bulk messaging launches |
| NDPC classification, registration and DPO appointment | Operating lawfully in Nigeria | Filing deadlines and audit obligations |
| LLM provider data terms | No-training and minimum-retention commitments, region options | Contract negotiation; pricing and policy changes |
| Cloud regions and CDN | Data residency, public surface performance | Region availability and cost; edge coverage near target users |
| Native-speaker reviewers and translators | Tier A languages, legal wording, evaluation sets | Hard to find for Pidgin and local languages; quality varies |
| Payment gateway coverage per country | Owner payments and our own billing | Business verification per market; settlement delays |
| Speech recognition and synthesis language support | Voice employees in each market | Limited quality for local languages and accents; latency |

## 20. Pricing and Unit Economics (assumptions to validate)

- Per-account monthly subscription tiers by contacts and AI usage; AI conversations and WhatsApp conversation fees metered and either bundled up to a cap or passed through.
- Target gross margin of at least 70% after WhatsApp, AI and email costs.
- Agency plan (P2): flat platform fee plus per-sub-account fee with rebilling.
- Validate with 5 to 10 pilot businesses before fixing prices.

### 20.1 Default plans and pricing (a hypothesis to test with pilots)

Prices are USD anchors. Local-currency plans (for example NGN) are set from the anchor at the current exchange rate and reviewed quarterly. Treat every number as a starting hypothesis; the pilots decide.

| Plan | Price per month | For | Includes |
| --- | --- | --- | --- |
| Manual | $15 | Owners who want CRM, inbox and booking without AI | 3 seats, 1 location, 1,000 contacts, inbox, booking page, forms, rule-based recipes, payment links, review requests, reports. AI off |
| Assistant | $39 | Owners who want an AI employee on chat | Everything in Manual, plus 5 seats, 2,000 contacts, 1 chat AI employee, 200 AI conversations included, reputation manager, industry pack, landing page |
| Growth | $79 | Busier or multi-branch businesses | 10 seats, 3 locations, 10,000 contacts, up to 3 AI employees, 500 AI conversations included, content planner and campaigns, funnels (P2), API (P2) |
| Agency (P2) | Wholesale per sub-account | Agencies and resellers | White-label, snapshots, rebilling |

- **Annual billing:** two months free.
- **AI overage:** $0.12 per AI conversation beyond the allowance, with the caps in FR-B.7.
- **WhatsApp and SMS:** passed through at provider cost plus a 10% handling margin, shown on the usage page and paid from a prepaid wallet where cards are unreliable (FR-B.8). Voice (P2) is a per-minute add-on.
- **Trial:** 14 days, no card, with caps of 50 AI conversations and 100 template messages. At the end the account moves to Suggest-only instead of stopping (FR-B.2).
- **No-AI plan:** yes (Manual). It lowers the entry price, matches the manual-parity principle (section 15.21), builds trust with cautious owners, and gives a clear upgrade path.
- **Margin check:** with AI cost held to 20% of plan revenue (FR-B.10), Assistant can spend about $7.80 a month on AI, roughly $0.04 per included conversation, and Growth about $15.80, roughly $0.03 per included conversation. Model routing and caching must reach these numbers before launch.
- **Review:** test three price points in the first 20 sales conversations (section 21.2), then review after the first 10 paying accounts and every quarter.

## 21. Go-to-Market and Competitive Position

The product wins by being the outcome-focused alternative to an agency-grade toolbox, in markets where WhatsApp and local payments matter.

### 21.1 Positioning against GoHighLevel

| Dimension | GoHighLevel | This product |
| --- | --- | --- |
| Primary buyer | Agencies and consultants who resell it | Business owners directly in v1; agencies from phase 6 |
| Setup effort | Steep learning curve; workflow canvas and many modules | Under 30 minutes with an industry pack and a guided wizard |
| AI approach | Conversation, voice and content AI as features, some with per-minute costs | AI employee is the product: owner approves instead of building |
| Main channels | SMS and email, built for US-style compliance | WhatsApp-first, with web chat and email |
| Payments | Mainly Stripe and PayPal | Paystack and Flutterwave first, owner's own gateway |
| Scope | CRM, funnels, websites, courses, communities, calendars and more | Focused: lead-to-booking-to-review loop, marketing drafts, and landing pages with simple funnels (P1 and P2); no courses, communities or full website builder |
| Pricing reference | $97, $297 and $497 per month tiers with unlimited contacts | Local-currency plans sized for small businesses (to validate, section 20) |
| White-label | Core strength (SaaS mode) | Architected from day one, shipped in phase 6 |
| Compliance posture | Customer responsibility, varies by feature | Built-in disclosure, consent ledger and market packs (section 8) |

GoHighLevel facts come from public 2026 reviews and pricing pages and should be re-checked before any public comparison.

### 21.2 Customer and channel strategy

- **First customer:** salon and beauty businesses in Lagos, Nigeria (the default decision, section 25), small businesses with 1 to 20 staff whose customers already message them on WhatsApp.
- **Design partners:** 5 to 10 pilot businesses, including clients of the founder's existing web agency, run on the manual playbook first (roadmap phase 0).
- **Acquisition:** WhatsApp-native demos (the owner chats with a live AI employee for their own business), referrals from pilot customers, local business communities, social proof from measured results (response time, bookings recovered).
- **Partners:** web designers and agencies who sell sites but not marketing; a partner program with commission and, later, white-label.
- **Pricing test:** three price points in the first 20 conversations; keep the winner and publish.

### 21.3 Launch stages

1. **Pilot (free):** hands-on onboarding, weekly review calls, results report after 30 days.
2. **Paid beta:** discounted plans for the first cohort in exchange for case studies.
3. **Public launch** in the first country, then the next market by the launch checklist (section 8.5).

### 21.4 Proof points to collect

Median first-response time before and after, bookings recovered from after-hours messages, no-show rate change, review count and rating change, hours saved per week.

## 22. Roadmap

| Phase | Window | Contents |
| --- | --- | --- |
| **0. Validation** | Weeks 1 to 4 | Run the manual version for 5 to 10 pilot businesses (WhatsApp plus spreadsheet plus a human following the playbook); start Meta, Google and payment approvals; finalize decisions in section 25; start counsel review of terms, DPA and disclosure wording; check NDPC classification and appoint a DPO; trademark and domain check for the product name |
| **1. Foundation** | Weeks 3 to 8 | Tenancy, auth, events, queue, audit, metering; registration and account lifecycle; CRM, pipelines, forms; Connections hub, consent ledger, compliance profile, region routing, market packs, i18n framework, roles, billing and entitlements; admin console foundation (tenant directory, flags, audit) |
| **2. Inbox and channels** | Weeks 7 to 12 | WhatsApp, email, web chat, unified inbox, consent handling, opt-out handling, AI disclosure, basic chat widget |
| **3. Workflows, booking, AI core** | Weeks 11 to 16 | Workflow engine and 4 recipes, booking and calendar sync, AI receptionist, follow-up, scheduler and CRM clerk, knowledge base, approval queue, dashboard, payment links, onboarding wizard, chat employee creation wizard with sandbox, go-live gates, public booking page, industry pack engine with the first pack, minimal admin console |
| **MVP launch** | About week 16 | Closed beta with pilot businesses, then paid launch |
| **4. Reputation and insights** | Months 5 to 6 | Google review sync, analysis, reply drafts, weekly digest, attribution; admin insights, health score, setup monitor, requests tracker; Compliance center beyond the basics |
| **5. Marketing** | Months 6 to 8 | AI content drafts, approval queue, social publishing, campaigns, landing pages from templates |
| **6. Agency and white-label** | Months 8 to 10 | Sub-accounts, custom domains, snapshots, rebilling, pack studio and market pack editor UI, block editor and funnels |
| **7. Later** | After month 10 | Inbound voice (earlier if pilots demand it), outbound voice, SMS, visual workflow canvas, public API and marketplace |

## 23. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| AI says something wrong or harmful | Lost trust, legal exposure | Grounding, handoff rules, approvals for money and public content, evals, audit log |
| WhatsApp template rejection or account bans | Core channel blocked | Conservative templates, opt-in tracking, quality-score monitoring, email fallback |
| Platform approvals delayed (Meta, Google) | Launch slip | Start early; launch with features that do not depend on them |
| AI cost exceeds margin | Unprofitable | Model routing, token budgets, metering, pricing caps |
| Scope creep toward full GHL parity | Never ships | Hold the core loop; the non-goals list is binding |
| Review policy violations by tenants | Google penalties for customers | Product-enforced no-gating, no-incentive rules |
| Cross-tenant data leak | Existential | RLS, tenant-scoped tests, security review before launch |
| Single builder bottleneck | Slow delivery | Phase plan with provider-based shortcuts; consider early contractor or co-founder for backend |
| Low owner adoption (set up but never use) | Churn | Under-30-minute onboarding, weekly digest, visible wins in the first week |
| Rules change or block a feature (EU AI Act enforcement, TCPA, local recording laws) | Feature delayed, fines, forced rework | Compliance profile engine, counsel sign-off per market, regulatory watch calendar, voice and bulk messaging gated behind the market launch checklist |
| A customer is messaged or recorded without valid consent | Fines, platform bans, lost trust | Consent ledger, enforced opt-outs, recording and outbound voice off by default, owner attestation on imports |
| Owners skip setup, so the AI is poorly taught | Wrong answers, churn | Go-live gates, guided knowledge interview, industry packs, sandbox tests, earned autonomy |
| A connection breaks (expired token, flagged WhatsApp number, disconnected calendar) | Silent missed leads | Health checks, degraded-mode rules, alerts by email and WhatsApp |
| Meta changes WhatsApp rules for AI bots | Core channel blocked | Business-scope lock, template discipline, web chat and email fallback, policy monitoring |
| Multi-country configuration sprawl: one market's rules break another's | Inconsistent behavior, hard-to-trace bugs | Market packs as versioned data, per-market feature flags and test suites, one live country at a time |
| Weak local-language quality (Pidgin, Hausa, Yoruba) causes wrong or offensive replies | Lost trust, escalations | Quality tiers, native-reviewed evals, autonomy caps by tier, human handoff |
| Public widget or booking page abused (spam, fake bookings, scraping) | Wasted capacity, cost, lost trust | Rate limits, captcha, phone verification, block lists, slot holds with expiry |
| AI and WhatsApp costs exceed plan revenue | Negative margin | Metering, caps, pass-through pricing, margin dashboard, model routing |
| Industry pack content is wrong for a market | Wrong prices or policies quoted | Unverified-knowledge rule, market overlays, pilot before publish, pack evals |

## 24. Release Criteria for MVP

- All P0 requirements shipped and passing acceptance tests.
- Eval set passes at the agreed thresholds (grounding accuracy, handoff precision, no policy violations).
- 5 or more pilot businesses live for at least 2 weeks with measured response-time improvement.
- Security review and tenant-isolation tests passed.
- Cost per account within target; billing works end to end.

## 25. Open Questions and Decisions Needed

1. **Customer for v1:** business owners directly, or agencies who resell? (Assumed: owners; agencies in phase 6.)
2. **First vertical:** a single niche (salons, clinics, real estate, schools) makes the knowledge base, recipes and messaging much sharper than going horizontal. Default decided: salon and beauty businesses in Lagos, Nigeria (sections 10.6 and 21.2).
3. **WhatsApp access:** direct Cloud API or a BSP at launch?
4. **Build or buy for workflows:** BullMQ plus custom engine, or Inngest/Temporal?
5. **Pricing model:** Default decided: hybrid, with flat tiers that include AI conversations and metered overage (section 20.1).
6. **AI provider and model routing strategy,** and data-residency expectations from customers.
7. **Team:** solo build with contractors, or bring in a co-founder or engineers before phase 3?
8. **Name and brand (default: working name Deskhand, a placeholder pending a trademark and domain check).**

**Added in v0.2:**

- Default decided: Nigeria first, with Nigerian technology and data protection counsel engaged in phase 0 (section 8.5). Still to do: choose the firm.
- Default decided: get counsel's written opinion on our NDPC classification in phase 0, register if required, and start with an external DPO service.
- Do we offer a managed WhatsApp number to owners who have none, and who carries the Meta verification risk?
- Payments: owners use their own gateway and we never hold funds (assumed). Confirm.
- Voice: build on a voice-agent provider or assemble our own pipeline, and which countries get numbers first?
- Recording: can owners disable it entirely, and what are the default retention periods per region?
- Which vertical's industry pack ships first?
- How much onboarding is self-serve versus paid concierge setup?
- What happens when no human is available for a handoff (voicemail, delayed-reply message, next-business-day task)?

**Pages, admin and configuration:**

- Do landing pages ship in P1 (single page) and funnels in P2, and is a full website builder ever in scope?
- Which admin roles are staffed at launch (support, success, compliance), and which admin modules can wait?
- Who authors market packs and industry packs at launch, and who signs off compliance text per country?
- Is the admin console built on an internal-tool framework or inside the main app?
- Do owners get a self-serve privacy request form for their customers, and who handles the first requests?

**Added in v0.3:**

- Which data regions exist at launch, and does any launch country require local storage?
- Which UI languages and AI conversation languages (with tiers) ship first?
- Default decided: salon and beauty in Lagos. Still to do: name the first 5 pilot businesses.
- Default decided: 14 days, no card (section 20.1).
- Default decided: three plans starting with a no-AI plan, and WhatsApp cost passed through at cost plus a handling margin (section 20.1).
- Do we build the widget and booking page ourselves or start from open-source components?
- Is a PWA enough at launch, or is a native app needed?
- Who is the first hire beyond the founder: backend, design or support?

## 26. Out of Scope (explicitly)

Full multi-page website builder, blog and online store (landing pages and simple funnels are P1 and P2, section 15.20), courses and memberships, communities, affiliate manager, VoIP phone system, autonomous ad buying, full invoicing and accounting, enterprise SSO and advanced compliance certifications.

## 27. Registration and Account Lifecycle

This section details everything from the first visit to account deletion. Onboarding after sign-up (setup wizard, go-live gates) is in section 6.

### 27.1 Sign-up flow

| Step | Screen | Fields and actions | Rules |
| --- | --- | --- | --- |
| 1 | Sign up | Email, phone or Google sign-in; password for email sign-up; country (auto-detected, editable); accept terms and privacy notice; marketing opt-in (unticked) | Terms and privacy versions and timestamps are stored. Password strength meter. Countries that are Disabled join a waitlist (FR-M.2) |
| 2 | Verify | Six-digit code by email, WhatsApp or SMS, or a magic link | Code valid 10 minutes, 5 attempts, resend after 60 seconds. Verification is required before connecting any channel |
| 3 | About you | Name, role (owner, manager, agency), team size, how you heard about us | Role chooses the owner path or the agency path (P2). 'How you heard' feeds acquisition reports |
| 4 | About the business | Business name, industry (searchable list that preselects an industry pack), website, Instagram or Google Business link, city, timezone, languages served, currency, opening hours | Country, timezone and currency prefill from the market pack. Legal entity name is optional here and required before compliance setup |
| 5 | Plan | Entry plan preselected, trial starts, no card required; agency owners see agency plans | Trial length and caps from the plan (section 13) |
| 6 | Workspace created | Account, first location and account slug created; data region assigned; market pack applied | The slug is unique, URL-safe and editable once before booking links are shared. The user lands in onboarding step 2 (section 6.1) |

Target: from the sign-up page to the onboarding wizard in under 3 minutes.

### 27.2 Sign-up requirements

- **FR-REG.1** Sign-in methods: email with password and Google (P0); phone-first sign-up by WhatsApp code for WhatsApp-native owners (P1); Apple (P2).
- **FR-REG.2** Duplicate detection on email, phone and business website. A matching account offers 'join this business' (request access) or 'sign in' instead of creating a second tenant.
- **FR-REG.3** Abuse controls: captcha, rate limits per IP and device, disposable-email blocking, velocity checks, and a risk score that routes suspicious sign-ups to manual review before any messaging is enabled.
- **FR-REG.4** Invite-based sign-up: an invited user skips the business steps, inherits the account's market and language, and sees only what their role allows.
- **FR-REG.5** Business use only: the user confirms they are 18 or older and sign up on behalf of a business. Accounts for individuals under 18 are not offered.
- **FR-REG.6** Attribution: UTM parameters, referrer, referral code and partner code are stored on the account.
- **FR-REG.7** Account creation emits `account.created`, `user.verified` and `trial.started` events for analytics and the admin console (section 31).
- **FR-REG.8** Resume: a partially completed sign-up or onboarding is saved and resumable, with a reminder after 24 hours.

### 27.3 Login and recovery

- Methods: email and password, Google, magic link, and WhatsApp or SMS one-time code (P1).
- Password reset by email link that expires in 1 hour and signs out other sessions.
- Two-factor authentication: authenticator app (P0, required for Owner and Admin), recovery codes, and WhatsApp code as a fallback (P1).
- Lockout: 5 failed attempts triggers a 15-minute delay with a captcha; alerts on sign-in from a new device or country.
- Sessions: device list, remote sign-out, idle timeout (default 30 days on trusted devices, 12 hours on others), and re-authentication before billing, deletion or compliance changes.

### 27.4 Account states

| State | Meaning | What works | How it changes |
| --- | --- | --- | --- |
| Trial | Using the real product under plan caps | Everything within caps; AI starts in Suggest or Approve mode | Converts to Active on payment; ends in Trial expired |
| Trial expired | Trial ended without payment | Read-only inbox and data export; AI paused; booking page shows a message-us fallback | Reactivates on payment; deleted after the retention window if never paid |
| Active | Paid and in good standing | Everything per plan | Moves to Past due, Paused or Cancelled |
| Past due | Payment failed | Grace period (default 7 days), then graceful degradation (FR-B.5) | Back to Active on payment; to Suspended after grace |
| Suspended | Stopped by us for abuse, policy or compliance reasons | Read-only, data export, support contact; AI and sends paused; reason shown to the owner | Reinstated by Platform Support or Compliance after review |
| Paused (P2) | Owner-requested hold | Read-only; billing paused | Resumes on request |
| Cancelled | Cancellation requested | Full access until the period ends, then read-only for 30 days | Reactivates, or moves to Deleted |
| Deleted | Retention window ended | Nothing; data erased per policy, billing records and audit proof retained | Final |

- **FR-REG.9** Every state change notifies the owner by email and in-app (plus WhatsApp or SMS where enabled), explains what changes and what to do, and is audited.
- **FR-REG.10** Banner copy and the AI's behavior follow the state: for example, in Past due the AI stops marketing sends first and never drops a live conversation.

### 27.5 Account management

- **Transfer ownership:** the current Owner nominates a user, who must accept and pass two-factor authentication. Required for staff turnover.
- **Change country or region:** a guided request that re-runs market and compliance checks (FR-M.4); region moves are a support-assisted operation (FR-R.8).
- **Merge or split accounts:** support-assisted; moves locations between accounts with contacts, history and connections intact.
- **Close account:** the owner chooses export first, then confirms by typing the business name; billing stops at period end; WhatsApp number and domain stay with the owner (section 5.4).
- **Data deletion:** after the retention window all personal data is erased from primary stores, then from backups within 35 days, with a deletion certificate available to the owner.

## 28. Tenant App: Information Architecture

The tenant app is what owners and staff use every day. This section defines its structure; section 29 specifies each screen and section 30 the compliance and governance center.

### 28.1 Navigation map

| Area | Pages | Visible to | Priority |
| --- | --- | --- | --- |
| Home | Today, Needs attention, Results, AI activity, Setup checklist | All roles (content scoped by role) | P0 |
| Inbox | Conversations, Needs human, AI-handled, Snoozed, Closed | Owner, Admin, Manager, Staff | P0 |
| Contacts | List and smart lists, contact detail, duplicates, import and export | Owner, Admin, Manager, Staff (scoped) | P0 |
| Sales | All leads (default), Pipeline, Opportunities; opportunity detail; stage settings | Owner, Admin, Manager, Staff (assigned) | P0 |
| Bookings | Calendar (day, week, month), booking drawer, services, staff and availability, booking page settings | Owner, Admin, Manager, Staff (own) | P0 |
| AI Employees | Employees, knowledge base, approvals, activity, testing sandbox, transcripts | Owner, Admin (edit); Manager, Staff (approvals) | P0 |
| Automations | Recipes, active workflows, run logs | Owner, Admin | P0 |
| Marketing | Content planner, campaigns, templates, forms and pages, links and QR | Owner, Admin, Manager | P1 |
| Reputation | Reviews, review requests, insights | Owner, Admin, Manager | P1 |
| Payments | Payment links, payments, deposits | Owner, Admin, Manager (view) | P0 |
| Reports | Overview, attribution, AI performance, bookings, revenue, reviews, team | Owner, Admin, Manager, Read-only | P0 basics |
| Compliance center | Overview, disclosure, consent, recording, data governance, requests, AI governance, audit log | Owner, Admin | P0 basics |
| Connections | Connections hub | Owner, Admin | P0 |
| Settings | Business, locations, services, team, languages and market, branding, notifications, billing, security, data, API | Role-dependent | P0 |
| Tasks | My tasks, team tasks, due today, overdue (section 29.18) | Owner, Admin, Manager, Staff (scoped) | P1 |

Mobile bottom bar: Home, Inbox, Bookings, Approvals, More.

### 28.2 Global elements

- **Workspace switcher.** For agency users (P2) and users with several accounts.
- **Location switcher.** For multi-location accounts; scopes inbox, calendar, reports and AI employees.
- **Search and command palette.** One box for contacts, conversations, bookings, settings and actions ('create payment link'), reachable by keyboard shortcut.
- **Quick create (+).** Contact, booking, message, payment link, post, task.
- **Notification center.** Approvals waiting, escalations, connection problems, payments, negative reviews, compliance alerts, system notices. Each item deep-links to the exact record.
- **AI status pill.** Per employee: Live, Suggest-only, Paused, Needs attention. One click opens the kill switch and the reason for any warning.
- **Setup checklist pill.** Shown until activation milestones are done (section 6.4).
- **Help.** Documentation, AI helper, contact support, status page, what's new.
- **Global banners.** Billing state, broken connection, template rejected, compliance step blocking go-live. Banners explain the impact and carry one fix button.
- **Account menu.** Profile, language, theme, security, sign out.

### 28.3 Interaction conventions

- **Tables and lists:** saved views, column picker, filters that persist, sorting, bulk actions with a confirmation that states how many records change, and undo for 10 seconds on non-destructive bulk changes.
- **States:** every screen has an empty state (explains the value and offers the next best action), a loading state (skeletons, not spinners), an error state (plain-language cause, retry, and a support code), and a no-permission state (explains which role can do it).
- **Permission-aware UI:** controls the user can never use are hidden; controls they could use after a change (upgrade, connection, role) are disabled with the reason.
- **Destructive actions:** require typed confirmation for irreversible ones (delete contacts in bulk, delete employee, close account) and are always audited.
- **Real-time:** inbox, approvals and bookings update live; stale data shows a refresh prompt instead of silently changing.
- **Language and locale:** every string, date, number and currency follows the user's language and the location's locale (section 9.3).
- **Accessibility:** WCAG AA, full keyboard navigation in the inbox and calendar, visible focus, screen-reader labels, reduced-motion support.
- **Responsiveness:** desktop three-pane layouts collapse to single-pane flows on phones; every approval and reply action works one-handed.
- **Terminology:** one name per concept across the product: contact, lead, opportunity, conversation, booking, employee, recipe, approval. Do not use 'calendar' in navigation; the diary lives under Bookings. Do not use Pipeline as a top-level nav item; it is a view inside Sales.

### 28.4 Notification matrix

| Event | In-app | Push | WhatsApp | Email | Default |
| --- | --- | --- | --- | --- | --- |
| Approval waiting | Yes | Yes | Yes (digest after 30 minutes unanswered) | No | On |
| Conversation needs a human | Yes | Yes | Yes | No | On |
| New booking or cancellation | Yes | Yes | Optional | Optional | On |
| Payment received | Yes | Yes | Optional | Receipt | On |
| Negative review | Yes | Yes | Yes | Yes | On |
| Connection broken or token expiring | Yes | Yes | Yes | Yes | On |
| WhatsApp template approved or rejected | Yes | No | No | Yes | On |
| Usage at 80% or 100% of allowance | Yes | No | Optional | Yes | On |
| Compliance alert (consent gap, request due) | Yes | Yes | No | Yes | On |
| Weekly digest | Yes | No | Yes | Yes | On |

Each user sets their own channels per event (email and in-app are always available; push, WhatsApp and SMS are optional and need the user's consent), quiet hours apply, and critical items (connection broken, compliance alert) cannot be fully disabled for Owner and Admin.

## 29. Tenant App: Screen Specifications

Every record on these screens can be created, edited and deleted by a person without the AI (section 15.21). Each module below is specified in the same shape: purpose, layout, data, actions, states and edge cases, permissions, and the events it emits for analytics and the admin console. Functional rules that already exist in section 15 are referenced, not repeated.

### 29.1 Home

| Aspect | Specification |
| --- | --- |
| Purpose | Answer two questions in under 10 seconds: what happened, and what needs me now |
| Layout | Top: location switcher and date range. Row 1: Needs your attention. Row 2: Today and Results this month. Row 3: AI activity feed and Suggestions. Side or bottom: setup checklist until done |
| Needs your attention | Cards for: approvals waiting, conversations needing a human (with wait time), unanswered conversations over the response target, negative reviews without a reply, broken connections, rejected templates, compliance steps blocking go-live. Each card has one primary action (approve, open, fix) |
| Today | Timeline of today's bookings by staff, tasks due, and no-show risks |
| Results | Leads, median first-response time, bookings, revenue (payments received), new reviews and rating, each with change versus the previous period and a sparkline |
| AI activity | Last 20 AI actions with employee, contact, action and outcome; link to full activity |
| Suggestions | AI-generated, dismissible ideas with a one-tap action, for example 'Saturday is 80% booked: send a reminder offer to last month's visitors' (draft only, needs approval) |
| Actions | Approve, edit or reject drafts inline; open a conversation; create a booking; pause or resume an employee |
| States | New account: demo-data toggle and a prominent checklist. Disconnected channel: top banner. Zero results: explains what will appear and how to get the first lead |
| Permissions | Staff see only their own tasks, bookings and metrics; Read-only sees results only |
| Events | `home.viewed`, `attention_card.clicked`, `suggestion.accepted` and `suggestion.dismissed` |

### 29.2 Inbox

| Aspect | Specification |
| --- | --- |
| Purpose | Handle every customer conversation across channels with the AI and the team in one place |
| Layout | Three panes on desktop: conversation list, thread, contact panel. Single pane flow on phones |
| List and filters | Views: All, Mine, Unassigned, Needs human, AI-handled, Waiting on customer, Snoozed, Closed. Filters: channel, location, employee, tag, stage, language, date. Each row shows contact, last message, channel icon, unread count, wait timer, assignee, and an AI badge |
| Thread | Unified messages across channels with delivery status (sent, delivered, read, failed). AI messages carry the employee's name and a badge. Internal notes are visually distinct. System events (booking made, payment received, stage moved) appear inline |
| Composer | Free text, saved replies, template picker, attachment, emoji, schedule send, translate preview for other languages. A WhatsApp indicator shows whether the 24-hour window is open; when closed, only approved templates are offered. Sending is blocked with a reason when consent is missing or the contact opted out |
| AI controls | Take over (pauses the AI on this conversation), hand back, accept or edit a suggested reply, see why the AI answered that way (sources used), mark reply good or bad |
| Contact panel | Name, phones, email, language, tags, custom fields, stage and value, upcoming bookings, payments, consent status per channel, AI summary of the conversation, next suggested action, full timeline |
| Actions | Assign, transfer, snooze, close and reopen, merge duplicate contact, create booking, send payment link, add task, add note, bulk actions on the list |
| Collision handling | Presence and typing indicators; a soft lock when two people reply at once |
| States | Empty inbox: shows the channels connected and a test-message button. Channel down: banner with fix link and a note that sends are paused |
| Permissions | Staff see assigned conversations only unless granted more; Read-only sees but cannot send |
| Events | `conversation.opened`, `reply.sent`, `ai.takeover`, `ai.handback`, `suggestion.edited` |
| Keyboard shortcuts | Next and previous, assign to me, snooze, close, focus composer, open command palette |
| Calls (P2) | Voice employee calls appear as conversations: audio player with the recording-notice status, transcript with speaker labels, AI summary and outcome, transfer record, and a call-back action. Playback needs permission and is logged (FR-CP.13) |

### 29.3 Contacts

| Aspect | Specification |
| --- | --- |
| Purpose | The single source of truth about every person the business talks to |
| List | Configurable columns, saved views and smart lists (FR-2.6), search across name, phone, email and tags, bulk tag, assign, add to list, delete (typed confirmation), export (FR-IM.1) |
| Contact detail | Header with name, language, source and consent badges. Tabs: Overview, Timeline, Conversations, Bookings, Payments, Notes and tasks, Files, Consent, AI memory |
| AI memory tab | Shows what the AI employee knows about this contact (preferences, past services, notes it saved). The owner can edit or delete any item, and deletion is honored in the AI's context immediately |
| Consent tab | The contact's consent ledger entries with source, wording version and date, and any opt-outs (section 8, FR-CP.5) |
| Duplicates | A review screen lists likely duplicates by phone or email with a side-by-side merge preview; merges are logged and reversible for 30 days |
| Custom fields | Definitions managed in Settings; field types text, number, date, dropdown, boolean; required-on-create option |
| Import | Wizard: upload, map fields, choose consent attestation, preview errors, run in the background with undo for 7 days (FR-IM.5) |
| Companies (P2) | Optional grouping of contacts under a company record |
| States | Empty: import, add manually, or share the booking page and form links. Large lists paginate and keep filters |
| Permissions | Export and bulk delete require Admin or Owner |
| Events | `contact.created`, `contact.merged`, `contact.deleted`, `import.completed` |

### 29.4 Sales (leads, pipeline, opportunities)

| Aspect | Specification |
| --- | --- |
| Purpose | Turn potential customers into paying customers without forcing every enquiry into a deal |
| Layout | One Sales area with three views of related records. Default view is All leads so an owner does not have to learn CRM vocabulary on day one |
| All leads | Table of potential buying relationships: contact, source, status, owner, last activity, next follow-up. AI may suggest qualifying a lead; the owner can accept, dismiss or qualify manually. Creating an opportunity from a lead is the promotion step (FR-3.4) |
| Pipeline | Kanban of **opportunities** (not leads). Filters by owner, location, source, value, age in stage, tag. Card: contact, value, stage age, next task, last activity, assigned staff, source, AI flag. Stage header shows count and total value; WIP hint when a stage ages beyond the limit. Drag emits `opportunity.stage_changed`. Won or lost requires a reason |
| Opportunities | Deal table of the **same records** as the board: value, probability, expected close, forecast (value × probability). An opportunity on the board always appears here |
| Settings | Stage names, order, default probability, stale-after days, auto-actions on entry, won and lost reasons, optional rule to auto-create an opportunity (off by default) |
| Rules | Payment received can move an opportunity to Won when configured. A booking can convert a lead without creating an opportunity |
| P2 and later | Multiple pipelines per account (P2); forecasting roll-up (P3) |
| Permissions | Staff see leads and opportunities assigned to them |
| Events | `lead.created`, `lead.qualified`, `opportunity.created`, `opportunity.stage_changed`, `opportunity.won`, `opportunity.lost` |

### 29.5 Bookings

| Aspect | Specification |
| --- | --- |
| Purpose | Run the diary: see, change and fill appointments (navigation label is Bookings, not Calendar) |
| Calendar views | Day, week and month inside Bookings; columns by staff or resource; location filter; time shown in the location's timezone; colors by service or status |
| Booking drawer | Customer, service, staff, time, price and deposit status, notes, source (page, AI, staff, embed), history. Actions: reschedule, cancel (with the policy applied), mark completed, mark no-show, send reminder, take payment, message customer |
| Create booking | Pick contact (or create), service, staff, slot from live availability, override rules with a reason (Manager or higher), optional deposit request |
| Services | Catalog with name, description, duration, buffer, price, deposit, staff who perform it, capacity for group services, visibility on the booking page, translations. Bulk edit and reorder |
| Staff and availability | Weekly hours, time off, holidays imported from the market pack, per-service overrides, calendar connection status per staff member |
| Booking page settings | Slug and link, branding, rules (notice, horizon, instant versus request), questions, consent text, languages, preview (section 11.2) |
| Waitlist (P1) and classes | Waitlist per slot with auto-offer on cancellation; class capacity and attendee list |
| Reminders and rules | Reminder schedule and templates, cancellation window, no-show policy, deposit rules |
| Reports | Utilization, no-show rate, lead time, booking source, revenue per service |
| States | No services yet: guided creation from the industry pack. Calendar disconnected: banner and fix |
| Permissions | Staff manage their own calendar and bookings; Manager sees all |
| Events | `appointment.booked`, `.rescheduled`, `.cancelled`, `.completed`, `.no_show` |

### 29.6 Pages and funnels (P1 single landing page, P2 editor and funnels; specification in section 15.20)

| Aspect | Specification |
| --- | --- |
| Purpose | Let owners publish landing pages and simple funnels that capture leads and bookings, without a full website builder |
| List | Pages and funnels with status (Draft, Published), URL, visits, conversions, last edited |
| Create | Start from a vertical template, from a prompt ('landing page for bridal braids offer'), or blank. The AI drafts copy and layout from the business profile and knowledge base; the owner approves |
| Editor | Block-based: hero, text, image, gallery, services, pricing, testimonials, FAQ, map, booking embed, form, chat widget, WhatsApp button, footer. Mobile preview first; version history; autosave |
| Funnel view | Steps in order (landing, form, thank-you, booking, payment) with visits and drop-off per step |
| Publishing | Subdomain by default, custom domain (P2) with automatic TLS, SEO fields, social preview image, unpublish and redirect |
| Compliance | Consent block and privacy links inserted by the compliance profile; cookie notice where required |
| Permissions | Owner, Admin and Manager |
| Events | `page.published`, `page.viewed`, `funnel.step_completed`, `funnel.converted` |

### 29.7 AI Employees

| Aspect | Specification |
| --- | --- |
| Purpose | Create, configure, supervise and improve the AI employees |
| List | One card per employee: name, role, channels, languages with tiers, autonomy summary, status (Draft, Testing, Shadow, Live, Paused), conversations handled, handoff rate, cost this month. Actions: create, duplicate, pause, archive |
| Create | The wizards in section 7.2 (chat) and 7.3 (voice) |
| Employee detail tabs | **Overview** (health, trend charts, warnings). **Persona and languages** (name, tone, greeting, disclosure, languages and tiers). **Knowledge** (which collections it uses, pinned wording). **Channels and hours** (channels, hours, after-hours behavior, locations). **Skills and tools** (toggles with autonomy per tool). **Rules and guardrails** (escalation triggers, limits, banned topics, quiet hours, handoff person). **Test** (sandbox chat or call, scripted and adversarial scenarios, last results). **Versions** (change log, compare, roll back). **Activity** (actions and transcripts). **Compliance check** (live pass or fail list from section 8) |
| Controls | Pause or resume, kill switch, change autonomy per tool (confirmation and a reason for raising it), shadow-mode toggle |
| Change safety | Edits to persona, rules or autonomy create a new version; sensitive edits need Owner approval and re-run the evals (FR-G.4) |
| Warnings | Examples: language Tier C on Autopilot, price placeholders still unverified, WhatsApp template missing for a served language, compliance wording missing |
| Permissions | Owner and Admin edit; Manager and Staff can view activity and use approvals |
| Events | `employee.created`, `employee.version_published`, `employee.paused`, `autonomy.changed` |

### 29.8 Knowledge base

| Aspect | Specification |
| --- | --- |
| Purpose | Everything the AI is allowed to know and say about the business |
| Structure | Collections: Business profile, Services and prices, Policies, FAQs, Locations and hours, Promotions, Do-not-say list. Each item has title, answer, language versions, category, location, status, source |
| Item status | **Verified** (owner confirmed), **Unverified** (from a pack or an import; the AI cannot assert it), **Needs review** (flagged by a wrong-answer report or a stale date) |
| Add content | Type an item, import from a website or Google Business link, upload PDF or document, paste text, accept AI-suggested answers from the Needs training inbox |
| Needs training inbox | Questions the AI could not answer, grouped by topic with the count of times asked, each with an answer box and 'add to knowledge' |
| Gaps panel | Coverage score per collection and missing items for the vertical (for example 'no cancellation policy') |
| Language | Pinned wording per language for sensitive items (prices, policies, medical or legal notes); machine translation shown as 'auto' until confirmed |
| Search and preview | Ask the AI a test question and see which items it used |
| Governance | Version history per item, who changed it, expiry date option (for promotions), and a scheduled review reminder |
| Permissions | Owner, Admin edit; Manager suggests; Staff views |
| Events | `knowledge.item_verified`, `knowledge.gap_filled`, `knowledge.import_completed` |

### 29.9 Approvals and activity

| Aspect | Specification |
| --- | --- |
| Purpose | Let humans supervise the AI quickly, and see everything it did |
| Approvals queue | Items: drafted replies, payment links, public posts, review replies, bulk messages, discount requests. Each shows the context, the draft, the reason it needs approval, and the AI's confidence |
| Actions | Approve, edit then approve, reject with a reason (feeds the eval set and the employee's rules), approve all of a type, snooze |
| Timing | Waiting-time badge; unanswered items escalate to WhatsApp and then to another approver |
| Activity log | Every AI action with employee, contact, channel, tool, input summary, output, cost, and outcome. Filters by employee, role, tool, outcome, date. Export to CSV |
| Transcript review | Random sample queue, flagged-by-customer items, and low-confidence items; reviewer marks good, needs fix or harmful, with notes |
| Permissions | Approvers: Owner, Admin, Manager; Staff approve on their own conversations |
| Events | `approval.requested`, `approval.approved`, `approval.edited`, `approval.rejected` |

### 29.10 Automations

| Aspect | Specification |
| --- | --- |
| Purpose | Control the recipes that run in the background |
| Library | Recipes grouped by goal (respond, follow up, book, remind, review, win back), each with a plain-language description, expected result and required connections |
| Active workflows | List with status, enrolled, completed, replied and converted counts, last run, and errors. Toggle on or off |
| Recipe settings | Parameters per recipe: delays, channels in priority order, conditions (for example only if no reply), templates per language, quiet hours, stop conditions, and which employee owns it |
| Run log | Per contact: each step, time, result and the reason it stopped. Search by contact |
| Test mode | Run a recipe on a test contact without sending real messages |
| Safety | Recipes inherit consent and opt-out rules; a recipe cannot enable a channel the contact has not agreed to |
| P2 | Visual canvas editor over the same workflow JSON (FR-6.8) |
| Permissions | Owner and Admin |
| Events | `workflow.enabled`, `workflow.run_completed`, `workflow.run_failed` |

### 29.11 Marketing

| Aspect | Specification |
| --- | --- |
| Purpose | Plan and send marketing with the AI drafting and the owner approving |
| Content planner (P1 drafts, P2 publishing) | Calendar of posts by platform, AI-proposed weekly ideas from the brand profile and top reviews, edit, approve, schedule, publish status, performance |
| Campaigns | Broadcasts to a smart list by WhatsApp template or email: audience builder, template and language, schedule, preview. A pre-send check shows how many contacts are excluded for missing consent or opt-out, quiet hours, and template approval state. Results: delivered, read, replies, bookings, revenue, opt-outs |
| Templates | WhatsApp templates by language with status (Draft, Pending, Approved, Rejected with Meta's reason), email templates built in a simple block editor (text, image, button, and a required footer with sender identity and an unsubscribe link to the preference center), usage count. Create from pack or from scratch; submit for approval from the screen |
| Offers (P2) | Promo codes and time-limited offers tied to services, with the knowledge base updated automatically while the offer is live |
| Links and QR | Click-to-WhatsApp links and QR codes with tracking codes and printable posters (section 11.6) |
| Guardrails | Bulk sends always need approval; AI-generated claims are checked against the knowledge base |
| Permissions | Owner, Admin; Manager can draft and approve posts |
| Events | `campaign.sent`, `post.published`, `template.status_changed` |

### 29.12 Reputation

| Aspect | Specification |
| --- | --- |
| Purpose | Collect, read and answer reviews, and learn from them (section 15.9) |
| Reviews | List by location with rating, text, date, reply status; filters for rating, topic, unanswered. Detail shows AI analysis (sentiment, topics, urgency, spam flag) and a draft reply |
| Requests | Settings for timing, message wording per language, one reminder maximum, exclusions, and the review landing link; stats on sent, opened and reviews received |
| Insights | Rating trend, volume, theme trends, staff and service mentions, response time |
| Alerts | Negative review alert to the owner; token-expiry reconnect prompt |
| Rules | No review gating and no incentives; the product blocks request wording that offers rewards |
| Permissions | Owner, Admin; Manager can approve replies |
| Events | `review.received`, `review.reply_posted`, `review_request.sent` |

### 29.13 Payments

| Aspect | Specification |
| --- | --- |
| Purpose | Collect money through the owner's own gateway and see what was paid |
| Payment links | Create for a service, deposit or custom amount; expiry; share by WhatsApp, email or copy; status tracking |
| Payments list | Date, contact, amount, currency, status, gateway reference, source (AI, staff, booking), receipt. Reconciliation flags for mismatches |
| Deposits | Rules shown per service; refunds are done in the gateway and reflected here by webhook |
| Gateway | Connection status per currency and location, test payment button, settlement information read from the gateway (P2) |
| Rules | We never hold funds (section 5.1). The AI can create links only for listed prices or within approved limits |
| Permissions | Owner and Admin manage; Manager views |
| Events | `payment_link.created`, `payment.succeeded`, `payment.failed` |

### 29.14 Reports

| Aspect | Specification |
| --- | --- |
| Purpose | Show results in business terms and prove the product's value |
| Standard reports | Overview; Lead sources and attribution; Speed to lead and response times; AI performance (containment, handoff, correction, cost); Bookings and no-shows; Revenue; Reviews; Campaigns; Team performance |
| Filters | Date range with comparison, location, channel, source, employee, pack vertical |
| Delivery | Export CSV or PDF; scheduled digest by email or WhatsApp (weekly or monthly); shareable read-only link (P2) |
| Definitions | Every metric has an info tooltip with its definition and a link to the full list, so numbers are never ambiguous |
| Data freshness | Shown on each report; target under 5 minutes |
| P3 | Custom report builder and saved dashboards |
| Permissions | Staff see their own metrics; Read-only sees all reports; Manager and above export |
| Events | `report.viewed`, `report.exported`, `digest.sent` |

### 29.15 Settings

| Page | What it contains | Who can edit |
| --- | --- | --- |
| Business profile | Business name, legal entity name and registration number, logo, description, industry and installed pack (with update notice), website and social links, contact phone and email, privacy contact | Owner, Admin |
| Locations | List of locations with address, timezone, hours, holidays, currency, phone numbers, languages, market settings, linked calendars and employees. Add, archive, set default | Owner, Admin |
| Services and pricing | Service catalog shared with the booking page and the AI (same data as 29.5), price per location and currency, packages (P2), taxes display | Owner, Admin, Manager |
| Team and roles | Members, roles, location scope, email invitations (single or bulk) and shareable join links, pending and expired invitations with resend and revoke (section 12.4), two-factor status, last active, offboarding wizard | Owner, Admin |
| Languages and market | Market pack in effect (read-only summary), languages served with tiers, default language, holidays, currency formats, data region (read-only, request change) | Owner, Admin |
| Branding | Logo, colors, fonts from an allowed list, booking page and widget appearance, 'Powered by' badge (removable on higher plans) | Owner, Admin |
| Channels | Enabled channels with their priority order per location, WhatsApp numbers and templates, email sending domains and DNS status, web chat settings, Messenger and Instagram pages, SMS sender IDs (P2), voice numbers (P2). Links to the Connections hub for health | Owner, Admin |
| Notifications | Per user: events by channel, quiet hours, digest time (section 28.4) | Each user |
| Billing and plan | Plan, entitlements and limits, payment method, invoices and receipts, billing contacts and tax details, usage and caps, prepaid credits (P1), plan changes, cancel | Owner |
| Usage | Consumption against allowances by unit (section 13.2), cost drivers, projected month-end, alerts | Owner, Admin |
| Security | Two-factor, sessions and devices, sign-in alerts, support-access approvals (pending, active, history), IP allow-list (P3) | Owner, Admin |
| Data | Import, export, backups on request (P2), retention periods (links to the Compliance center), delete data, close account | Owner |
| API and webhooks (P2) | API keys with scopes and last used, webhook endpoints with delivery log and replay | Owner, Admin |
| Audit log | Searchable record of changes by person, AI and system (also in the Compliance center) | Owner, Admin |
| Labs (P2) | Opt-in features and early access | Owner, Admin |
| Saved replies and templates | Library of saved replies and message templates by channel and language, with variables, folders and sharing; WhatsApp template approval status shown inline; usage counts | Owner, Admin, Manager |

### 29.16 Connections hub

| Aspect | Specification |
| --- | --- |
| Purpose | One place to connect, check and repair every integration (section 5) |
| Layout | Grouped cards: Messaging (WhatsApp, email, web chat, Facebook and Instagram), Calendar, Google Business Profile, Payments, Social accounts, Contacts, and Voice and SMS (P2). Each card shows 'We manage' or 'You connect', status, who connected it, scopes, last sync and next step |
| Connect flow | Guided and role-checked. WhatsApp: Facebook login, business verification, number selection or registration, display name approval, template submission. Email: add domain, copy DNS records, verify, send test. Calendar: OAuth. Payments: OAuth or keys, test payment |
| Health | Green, amber or red per connection with the exact problem and a Fix button (reconnect, re-verify DNS, resubmit template). WhatsApp shows quality rating and messaging tier read from Meta; email shows bounce and complaint rates |
| Test | Per-connection test action |
| History | Connection events (connected, token refreshed, failed, disconnected) with the actor |
| Rules | FR-C.1 to FR-C.8 (section 5.2) |
| Permissions | Owner and Admin; staff connect only their own calendar |
| Events | `connection.connected`, `connection.failed`, `connection.disconnected`, `connection.health_changed` |

### 29.17 Forms and surveys

| Aspect | Specification |
| --- | --- |
| Purpose | Build forms and surveys that capture leads, requests and feedback, and see the responses |
| List | Forms and surveys with type, status (Draft, Live), submissions, conversion rate and last edited. Actions: create, duplicate, archive |
| Create | From a vertical template (quote request, consultation, booking enquiry, feedback, NPS) or blank |
| Builder | Field palette: short text, long text, phone, email, number, date, dropdown, multi-select, checkbox, file upload, yes or no, rating, NPS (0 to 10), CSAT, and the consent block. Single page or multi-step. Conditional logic (show or hide, skip to step), required rules and validation, hidden fields (UTM, page, referrer, location, employee), live preview at phone and desktop widths |
| Survey mode (P2) | The same builder with rating, NPS, CSAT and opinion-scale questions, optional scoring, a thank-you message that depends on the score, and a private feedback path for low scores that notifies the owner. The Google review link is shown to every respondent whatever their score, so feedback never gates reviews (FR-9.2) |
| Settings | Consent block from the market profile, language versions, success action (message, redirect or booking embed), staff notification, assignment, tags applied, recipe triggered, spam protection, double opt-in (P1) |
| Share and embed | Hosted link, QR code, inline and popup embed snippets, WhatsApp link, and per-source tracking |
| Responses | Table with filters, link to the contact, CSV export. For surveys: NPS and CSAT summaries and trend, AI-grouped comment themes, and breakdowns by location, staff and service |
| Rules | A submission creates or updates a contact (FR-F.3); survey answers appear on the contact's timeline; personal-data fields are flagged; edits create versions and published forms keep the data already submitted |
| States | Empty: template picker. No responses yet: shows the share options |
| Permissions | Owner, Admin, Manager |
| Events | `form.created`, `form.published`, `form.submitted`, `survey.completed`, `nps.recorded` |

### 29.18 Tasks

| Aspect | Specification |
| --- | --- |
| Purpose | Make sure follow-ups get done, whether a person or the AI created them |
| Views | My tasks, Team tasks, Due today, Overdue, Completed. List and calendar toggle. Filters by assignee, location, linked record and created-by |
| Task | Title, notes, due date and time, assignee, priority, linked contact, conversation, opportunity or booking, reminder, and a created-by chip (person, AI employee, recipe) |
| Actions | Create (quick create, from a conversation, from an AI handoff), complete, snooze, reassign, bulk actions |
| AI | The AI creates tasks when it hands off or cannot answer (for example 'confirm the bridal group price'), and the owner can see why |
| Reminders | In-app, push and email, plus a digest of overdue tasks |
| Home | Tasks due today appear on Home (section 29.1) |
| Permissions | Staff see their own tasks; Manager and above see all |
| Events | `task.created`, `task.completed`, `task.overdue` |

## 30. Tenant App: Compliance and Governance Center

The center turns section 8 into screens an owner can understand and act on. It does not give legal advice; it shows what is configured, what is missing and what the business is responsible for. It is visible to Owner and Admin, with read-only access for Manager where noted.

### 30.1 Overview

| Aspect | Specification |
| --- | --- |
| Purpose | Show compliance status at a glance and what to fix first |
| Compliance status | A checklist computed from the market pack and the account's setup, grouped by area (disclosure, consent, recording, data, requests, AI governance, legal documents). Each item is Done, Needs attention or Blocking go-live, with a one-line reason and a fix link |
| Readiness score | A simple percentage of required items complete. It is shown for guidance only and never labelled a certification |
| Market summary | The country, applicable rules in plain language, and what the product does for the owner versus what the owner must still do (for example 'register with the data regulator if you are of major importance', or 'obtain customer consent for marketing') |
| Alerts | Consent gaps, template rejections, retention jobs failed, requests nearing their deadline, legal document updates awaiting acceptance |
| Permissions | Owner and Admin; Manager read-only |

### 30.2 Disclosure and transparency

- AI disclosure wording per language and channel with live preview. The disclosure itself cannot be turned off (FR-CP.2); wording can be edited within allowed templates.
- The 'conversations are stored and may be reviewed' notice (FR-CP.3), with the privacy notice link.
- Legal entity details shown to customers and the privacy contact (and the DPO contact where required).
- Verification: a button that runs a test conversation per channel and language and reports whether the disclosure appeared.

### 30.3 Consent center

- **Ledger explorer:** search a contact and see every consent record (purpose, channel, source, wording version, date, proof reference) and every opt-out.
- **Wording versions:** the consent text used on forms, the booking page and imports, with version history and which forms use which version.
- **Opt-out and suppression list:** all opted-out contacts, source of each opt-out, and manual add or remove with a reason (removal requires proof of re-consent).
- **Import attestations:** history of imports with the lawful basis the owner attested.
- **Re-consent campaigns:** send a compliant consent request to contacts missing consent for a purpose.
- **WhatsApp opt-in proof:** how each contact opted in and the stored evidence.
- **Rules summary:** quiet hours, calling hours, and do-not-contact checks active for the market.

### 30.4 Recording and monitoring

- Recording on or off per employee and channel, with the notice text and its legal preview per language.
- All-party-consent mode and what happens when a caller declines (call continues unrecorded).
- Retention for audio and transcripts, who can listen (role list), redaction rules, and whether staff monitoring notices are shown.
- A plain statement of the owner's responsibility for employment rules when monitoring their own staff (FR-CP.14), accepted with a timestamp.

### 30.5 Data governance

- **Data region:** current region shown with where each data type is stored; request a change (support-assisted, FR-R.8).
- **Retention schedule:** per data type (messages, recordings, contacts, bookings, reviews, audit, backups) with defaults from the market pack, owner overrides within allowed limits, and a legal-hold switch.
- **Documents:** download the DPA, the sub-processor list with change notices and subscription, the records-of-processing export, and a DPIA template for conversation processing.
- **Deletion jobs:** status of scheduled erasures and certificates.

### 30.6 Data subject requests

| Aspect | Specification |
| --- | --- |
| Purpose | Handle people's requests to access, correct, delete, restrict or object, and requests for human review of automated decisions |
| Intake | Requests logged manually by staff or received through a public privacy request form and the privacy email, then verified for identity |
| Queue | Request type, requester, contact match, received date, due date from the market's response period, status, assignee, and timers with escalation |
| Actions | Find all data for the contact across messages, recordings, bookings, payments, reviews, AI memory and embeddings; export as a file; delete or anonymize with a preview of what will be removed and what must be kept (billing records, legal hold); correct fields; restrict processing |
| Proof | Completion record with date, actor and scope, and a response template in the requester's language |
| Permissions | Owner and Admin; Manager can log requests |
| Events | `dsar.received`, `dsar.completed`, `dsar.overdue` |

### 30.7 AI governance console

- **Policy matrix:** every employee against autonomy level per tool, channels, languages with tiers, and last evaluation result.
- **Guardrails:** the platform floor (read-only) and the business's own rules, with a log of changes and approvals (FR-G.1 to FR-G.3).
- **Evaluations:** latest results per employee and per language, failing scenarios, and the date of the next scheduled run.
- **Quality review:** results of transcript sampling, flagged items and their resolution.
- **Incidents:** reports of harmful or wrong AI output with status, root cause and fix; a button to report a new one; kill switch history.
- **Prohibited uses:** acknowledgement of FR-G.2 by the owner at setup and at each year, with a timestamp.
- **Transparency pack:** the plain-language description of what the AI does and how it is tested (FR-G.8).

### 30.8 Audit log

- Searchable, filterable record of changes by people, AI and the system: connections, settings, roles, autonomy, consent edits, exports, deletions, support access.
- Filters by actor, area, date, location and outcome; export to CSV; retention at least 12 months (FR-G.5). Entries cannot be edited or deleted.

### 30.9 Access review and incidents

- **Access review:** who has access, role, last active, location scope, API keys, and connections owned. A quarterly review prompt with one-click revoke.
- **Support access:** pending approvals, active sessions with expiry, and history of every view by our staff (FR-CP.13).
- **Security and breach:** how to report an incident, our notification commitments, the owner's own obligations by market in plain language, and incident history affecting the account.

### 30.10 Legal documents

- Terms, DPA, privacy notice template and sub-processor list with acceptance history (who, when, version).
- Change notices with a required re-acceptance for material changes; banners until accepted.
- Market-specific addenda (for example country data protection addenda) shown for the account's market.

### 30.11 Requirements

- **FR-CC.1** The checklist is computed from the market pack, so a new market needs no code change in the center.
- **FR-CC.2** Every control in section 8.3 has a screen or setting here, or states why it is platform-managed.
- **FR-CC.3** Blocking items prevent go-live and Autopilot for the affected employee, and the reason is shown in the AI employee wizard (section 7).
- **FR-CC.4** All changes in the center are audited and require recent re-authentication.
- **FR-CC.5** Plain language first: each setting has a short 'what this means' text, reviewed by counsel for each market.
- **FR-CC.6** Exports from the center (consent ledger, request log, audit log) are available as CSV and JSON for regulators or auditors.

## 31. Platform Admin Console

This is the internal product our team uses to run the platform. It ships as a separate application from the tenant app, with its own deployment, internal sign-in and access controls, and it lets the team: see every tenant's setup, usage, cost, health and compliance, support them, tune AI quality, configure markets and packs, and keep the whole system safe. It extends the minimal admin tools in section 15.19.

### 31.1 Users and access

| Persona | Main jobs | Edits | Views |
| --- | --- | --- | --- |
| Support agent | Resolve tenant problems, guide setup, repair connections | Tenant notes, nudges, support-access requests, connection retries | Tenant 360, setup monitor, channel health, AI debugger (PII masked) |
| Customer success | Drive activation and retention, run reviews with pilot customers | Tasks, outreach, health-score notes | Setup monitor, health scores, usage, outcomes, billing status |
| Compliance officer or DPO | Oversee consent, requests, retention, legal documents, market rules | Market compliance profiles, legal document versions, request escalations | Compliance admin, audit, tenant compliance tabs |
| Finance and billing ops | Revenue, invoicing, dunning, plan changes, credits | Plans and entitlements, coupons, credits, refunds | Revenue, margin, usage cost, invoices |
| AI quality lead | Evals, incidents, prompt and model rollout | Eval sets, prompt versions, rollout and rollback, model routing | AI operations, transcripts (masked), cost |
| Content and pack author | Industry packs, templates, language packs | Pack studio, translations | Pack analytics |
| Market manager | Open and run countries | Market packs, market status, local support settings | Market analytics, compliance status |
| Engineering and SRE | System health and incidents | Feature flags, kill switches, queue controls | System health, logs, provider status |
| Trust and safety | Abuse, spam, suspensions | Tenant suspension, sender reputation actions | Abuse queues, risk scores |
| Leadership | See the business | Nothing | Overview, revenue, activation, AI, compliance summaries |

All internal roles use single sign-on and two-factor authentication. Each role gets the minimum modules above; custom combinations are assigned by an Admin Owner and logged.

### 31.2 Console structure

| Module | What it covers |
| --- | --- |
| Overview | Company-level dashboard: tenants by state, activation funnel, revenue, AI quality, incidents, compliance alerts |
| Tenants | Search and list of all tenants; Tenant 360 page (31.3) |
| Onboarding and setup monitor | Funnel, stuck tenants, setup failures (31.4) |
| Usage and cost | Messages, AI usage and cost per tenant, plan, market and channel; margin |
| AI operations | Evals, incidents, prompt and model versions, transcripts sampling, cost routing |
| Channels and providers | WhatsApp quality and templates, email reputation, calendar and Google health, payment gateway status, provider outages |
| Compliance | Consent audits, requests tracker, retention jobs, legal documents, disclosure verification, market compliance status |
| Markets and regions | Market packs, status, regions, local support (section 32) |
| Industry packs | Pack studio, versions, analytics, localization (section 32) |
| Billing and revenue | Subscriptions, invoices, dunning, credits, coupons, MRR and churn |
| Plans and entitlements | Plan definitions, limits, feature gates, per-market pricing |
| Support | Tickets, notes, support-access requests and sessions, canned responses |
| Trust and safety | Abuse queues, risk scores, suspensions, blocked senders |
| Feature flags and experiments | Flags by tenant, market and plan; kill switches; experiment results |
| System health | Queues, workers, webhooks, error rates, latency, provider status, deployments |
| Insights | Product analytics, cohorts, funnels, custom queries (31.6) |
| Admin users and audit | Internal users, roles, access reviews, audit of every admin action |

### 31.3 Tenant 360 page

The one page that answers 'how is this tenant doing and what do they need?'

| Tab | What it shows | Admin actions |
| --- | --- | --- |
| Header | Name, status (account state), plan, market, region, locations, owner contact, created date, health score and trend, MRR, assigned success manager, open tickets, active flags | Change owner contact note, assign manager, impersonation request, suspend (with reason and second approval) |
| Overview | Key metrics for 30 days: leads, response time, bookings, revenue, AI conversations, handoff rate; timeline of notable events | Add note, create task |
| Setup and onboarding | Checklist state per step with timestamps and time spent; go-live gates passed or blocked and why; pack installed with version and items still unverified; knowledge coverage; employees and autonomy; connections with status | Send a targeted nudge, re-run a check, trigger assisted setup, retry a connection |
| Usage and cost | Messages by channel and category, AI conversations and tokens, email and storage, cost versus revenue for the period, cap status, projection | Raise or lower caps, add credits |
| AI quality | Handoff, correction and escalation rates, grounded-answer rate, latest eval results by language, flagged transcripts (masked), incidents | Open the AI debugger on any action, pause an employee, roll back a version, add to eval set |
| Channels | WhatsApp quality rating, messaging tier, template statuses; email domain verification, bounce and complaint rates, sending reputation tier; calendar sync errors; Google token state; payment gateway state | Resend verification, escalate a template, move to another email pool |
| Compliance | Consent coverage, opt-out rate, disclosure verification date, recording settings, retention jobs, open requests and due dates, legal documents accepted by version, special-category flags | Escalate a request, require re-acceptance, apply a legal hold |
| Billing | Subscription, invoices, payments, dunning stage, credits, coupons, tax details | Issue credit, retry payment, change plan, extend trial, refund |
| Activity | Chronological event stream: sign-ups, connections, config changes, AI incidents, support access | Filter, export |
| Support | Tickets, notes, conversations with the owner, access requests and sessions | Request access, add note, create ticket |
| Flags and overrides | Feature flags, limits, market overrides in effect, who set them and why | Set or clear (reason required) |

Sensitive fields are masked by default. Revealing a name, phone, message or recording asks for a reason, is time-limited, and is logged (FR-PA.6).

### 31.4 Onboarding and setup monitor

| View | Specification |
| --- | --- |
| Funnel | Counts and conversion for sign-up, verified, business profile, channel connected, knowledge taught, employee created, go-live gates passed, first lead handled, first booking, Autopilot on. Sliced by market, vertical or pack, source, plan, week |
| Time to value | Median and 90th percentile time between each step and to first AI reply, with trend |
| Stuck tenants | List of tenants idle at a step beyond its threshold (for example WhatsApp not connected after 48 hours), with the reason code (for example business verification pending, template rejected, DNS not verified), owner contact, and a one-click nudge or task |
| Failure leaderboard | Most common blockers by count: connection errors by provider and error type, template rejections by reason, verification failures, missing knowledge items |
| Setup quality | Share of go-lives with unverified pack items, with a Tier C language on Autopilot, or with missing compliance wording; compared with later wrong-answer rates |
| Cohorts | Retention and activation by signup cohort, country, vertical and acquisition source |
| Assisted setup queue | Tenants who asked for help or were flagged for concierge setup, with status and assignee |
| Alerts | Funnel step conversion dropping more than a set percentage week over week; a provider error spike affecting many tenants |

### 31.5 Module specifications

| Module | Screens and what they show | Admin actions | Alerts |
| --- | --- | --- | --- |
| AI operations | Eval dashboard by role, language, vertical and market; incident register; prompt and model version history with cohort rollout state; transcript sampling queue (masked); cost per conversation by model; AI debugger search by tenant, contact or action ID | Run evals, start canary rollout, roll back, change model routing, add scenarios, label transcripts, close incidents | Eval regression; handoff or correction rate above threshold; cost per conversation spike; provider latency or error rise |
| Channels and providers | WhatsApp: quality rating and messaging tier per tenant, template approval status and rejection reasons, number status. Email: sending domains, DNS verification, bounce, complaint and spam rates, IP pool tiers. Calendar and Google: token health, sync errors. Payments: gateway webhook health. Provider status feed | Retry verification, move tenant between IP pools, escalate to provider, pause a tenant's sends, resubmit templates in bulk | Quality rating drops to low; template rejection spike; domain verification failing; token expiry wave; provider outage |
| Compliance | Consent coverage and opt-out rates by tenant and market; requests tracker across tenants with deadlines; retention and deletion jobs; legal document versions and acceptance rates; disclosure verification results; market compliance status; special-category (health, finance) tenants | Publish legal document versions, force re-acceptance, escalate overdue requests, apply legal hold, run disclosure verification, export evidence for a regulator | Request nearing deadline; retention job failure; acceptance of a material update below target; disclosure test failing |
| Billing and revenue | MRR, ARR, ARPA, new, expansion, contraction and churn; subscriptions by plan, market and currency; invoices and payment status; dunning pipeline; credits and refunds; failed payments by gateway | Retry payment, issue credit or refund, extend trial, apply coupon, change plan, pause or cancel | Failed payments above threshold; churn spike; gateway outage |
| Plans and entitlements | Plan definitions: price per currency and market, limits, feature gates, add-ons; entitlement overrides per tenant | Create or edit plans (versioned, effective-dated), grandfather rules, override a limit with reason | Override count growing; plan without an owner |
| Support | Ticket queue linked to tenants; notes; support-access requests with approval state; canned responses; macros that trigger fixes | Request access, run macros, escalate | Tickets breaching response target |
| Trust and safety | Risk score for each sign-up and tenant; abuse queues (spam, impersonation, prohibited use, review gating attempts); blocked senders and numbers | Review, warn, restrict features, suspend, unsuspend, block sender | Risk score above threshold; user reports; provider abuse notices |
| Feature flags and experiments | Flags with owner, scope (tenant, market, plan, percentage), state and history; experiments with assignment, metric and result | Create and change flags, kill switches, ramp rollouts, stop experiments | Flag without owner or expiry; kill switch used |
| System health | Queue depth and lag by queue; worker health; webhook ingestion latency and failures; API error rates and latency by region; database and cache health; deployments and rollback; synthetic checks for the booking page and widget | Pause or drain queues, replay dead-letter items, trigger rollback, run synthetic checks | Any service-level target missed (section 17.3); dead-letter growth |
| Admin users and audit | Internal users, roles, last access, session list; audit of every admin action with reason and tenant | Invite, change role, revoke, review access quarterly | New admin created; privileged action without reason |

### 31.6 Insights catalog

These are the numbers the team needs on one set of definitions, available in dashboards and in the query tool. Every metric can be sliced by market, region, vertical or pack, plan, acquisition source, location count and cohort.

| Area | Metrics (definition) |
| --- | --- |
| Acquisition | Sign-ups; verified rate; sign-up to business-profile conversion; waitlist size by country; cost per acquired account by source |
| Activation | Time to first channel live; time to first AI reply; share reaching each milestone (section 6.4); share going live with a placeholder or Tier C setting |
| Engagement | Weekly active accounts (opened the app or approved something); approvals per account; share of conversations handled without a human (containment); active employees |
| Customer outcomes | Median first-response time before and after; bookings and revenue influenced by the AI; no-show rate; review count and rating change; leads recovered after hours |
| AI quality | Grounded-answer rate; handoff rate and reasons; correction rate (replies edited or rejected); wrong-answer reports per 1,000 conversations; disclosure shown rate; opt-out honored rate; eval pass rate |
| AI cost | Tokens and cost per conversation by model and language; cost per tenant; share of cost on Tier C languages; cache hit rate |
| Channels | WhatsApp templates sent by category and delivery rate; quality rating distribution; email delivery, bounce and complaint rates; calendar sync failure rate |
| Revenue | MRR, ARR, ARPA, trial-to-paid conversion, net revenue retention, logo churn, expansion, pass-through revenue, gross margin per tenant, plan and market |
| Compliance | Consent coverage of messaged contacts; opt-out rate; requests received, median time to complete, overdue count; retention job success; legal acceptance rate; incidents by severity |
| Reliability | Availability by surface and region; webhook acknowledgement latency; inbound-to-reply latency percentiles; queue lag; error budget burn |
| Support | Tickets per 100 accounts, first response and resolution time, CSAT, top issue categories, setup-assist requests |
| Packs | Installs, activation rate, edit rate of pack content, wrong-answer rate per pack version, time to go-live by pack |
| Markets | Live tenants, ARPA, cost to serve, support load, compliance incidents, template rejection rate per market |

### 31.7 Tenant health score

A daily score from 0 to 100 shown as Green (70 and above), Amber (40 to 69) or Red (below 40), with the top three reasons listed.

| Component | Weight | Signals |
| --- | --- | --- |
| Setup completeness | 20 | Go-live gates passed, knowledge coverage, pack items verified, compliance checklist |
| Channels healthy | 15 | WhatsApp connected with good quality, email verified, calendar synced |
| AI live and trusted | 15 | Employees live, autonomy level reached, correction rate low |
| Usage trend | 20 | Weekly active use, conversations and approvals trend over 4 weeks |
| Outcomes | 15 | Bookings, response time and reviews improving |
| Billing health | 5 | Payment on time, no dunning |
| Compliance gaps | 10 | Open blocking items, overdue requests, expired legal acceptance |

Triggers: Red for 7 days creates a success task; a falling score with a connection error creates a support task; high score with usage near the cap creates an upgrade opportunity. Weights are tuned from churn data after launch.

### 31.8 Operational alerts

Alerts route to the right persona by chat, email or pager with severity, runbook link and owner. Examples:

- WhatsApp quality rating drops to low for any tenant, or a market-wide template rejection spike.
- Cost per tenant above a set share of revenue for 3 days.
- Correction rate above threshold after a prompt or pack release (auto-rollback trigger).
- Opt-out rate spike after a campaign, or a tenant sending to contacts without consent.
- Request deadline within 3 days; retention job failed.
- Queue lag or webhook failures above target; provider outage.
- Sign-up risk spike or abuse reports on a tenant.

### 31.9 Admin security and privacy

- Single sign-on, two-factor, device and network restrictions; sessions expire after 8 hours.
- Least privilege by persona (section 31.1); sensitive actions (suspend, delete, plan override, legal hold, export) need a reason, and the highest-risk need a second approver.
- PII masked by default in every admin view; reveal is purpose-bound, time-limited and logged.
- Impersonation only with the owner's approval (FR-CP.13), read-only by default, with a visible banner for the owner and a full audit.
- Break-glass access for incidents: time-boxed, alerted to the security lead, reviewed afterwards.
- No production database access for daily work; queries go through the audited query tool.
- Quarterly access review and automatic revocation of inactive admins.

### 31.10 Requirements

- **FR-PA.1** Every module reads from the event stream and the metering pipeline, so numbers match what tenants see in their own reports.
- **FR-PA.2** The Tenant 360 page loads in under 3 seconds and shows data no older than 5 minutes.
- **FR-PA.3** Setup monitor thresholds and the health score weights are configuration, editable without a release.
- **FR-PA.4** Admin actions that change tenant state are idempotent, reversible where possible, and notify the tenant when it affects them.
- **FR-PA.5** Query tool: saved queries and charts over a curated analytics store with row-level masking; no raw personal data exports.
- **FR-PA.6** Reveal-PII flow requires a reason, expires, and appears in the tenant's support-access history (FR-CP.13).
- **FR-PA.7** Every module has its own permission set and every action is written to the admin audit log with actor, tenant, reason and before-and-after.
- **FR-PA.8** The console is available in the region of the data it shows, so regional data is not copied to a central store beyond anonymized aggregates.

## 32. Configuration Management: Market Packs and Industry Packs

Market packs (section 9) and industry packs (section 10) are the main levers that let one codebase serve many countries and verticals. This section specifies exactly what is configurable, how it is edited in the admin console, how it is reviewed and released, and how conflicts between layers are resolved.

### 32.1 Market pack schema

| Group | Fields | Validation and notes |
| --- | --- | --- |
| Identity | ISO country code, name, status (Disabled, Pilot, Live), launch date, owner, notes | Status changes follow the release workflow (32.2) |
| Localization | Default language, UI languages, AI languages each with tier A, B or C, currency list and default, number and date formats, week start, default timezones, holiday calendar source | At least one Tier A or B language before Pilot |
| Phone and address | Calling code, number validation rules, address fields and order, postal code format | Test numbers must pass validation |
| Channels | WhatsApp enabled, allowed template categories, provider route, SMS enabled and provider, voice enabled with provider and number types, email routing | Voice and SMS cannot be enabled without a recorded legal approval |
| Payments | Gateways offered, supported currencies, minimum amounts, test credentials reference | Gateway test payment must pass before Pilot |
| Compliance profile | Consent model per purpose, disclosure texts by language, recording rule (not allowed, one-party, all-party), calling hours window, do-not-contact registries, retention defaults per data type, request response period in days, breach notification hours, regulator registration and DPO flags, minors age threshold, restricted verticals | Each text reviewed by counsel; version and approver recorded |
| Data | Allowed regions, default region, transfer notes, sub-processor list reference | Region must exist and have the stack deployed |
| Legal documents | Terms, privacy notice, DPA, addenda by language and version | Must reference accepted, signed-off versions |
| Billing | Plan currencies and price books, tax display rules, invoice fields required, accepted payment methods | Price book effective-dated |
| Support | Hours, languages, escalation contacts, local holidays | Needed before Live |
| Feature flags | List of features with state in this market (Off, Pilot, On) | Includes outbound voice, SMS, bulk campaigns, health and finance verticals |
| Overrides allowed | Which settings an account can change (languages within the supported list, quiet hours only stricter, retention shorter only) | Prevents tenants from weakening compliance |

A sketch of how a pack is stored:

```json
{
  "country": "NG",
  "version": "2026.10.1",
  "status": "pilot",
  "localization": { "defaultLanguage": "en", "aiLanguages": [{"code": "en", "tier": "A"}, {"code": "pcm", "tier": "B"}, {"code": "yo", "tier": "C"}], "currencies": ["NGN", "USD"], "timezones": ["Africa/Lagos"] },
  "channels": { "whatsapp": true, "sms": false, "voice": false },
  "payments": { "gateways": ["paystack", "flutterwave"] },
  "compliance": { "recording": "counsel_review", "requestResponseDays": 30, "breachNotificationHours": 72, "disclosureRefs": { "en": "disc-ng-en-3" } },
  "data": { "allowedRegions": ["africa", "eu"], "defaultRegion": "africa" },
  "flags": { "outboundVoice": "off", "bulkCampaigns": "pilot" }
}
```

### 32.2 Market pack editor and release workflow

| Element | Specification |
| --- | --- |
| List | All countries with status, version, tenants live, last change, owner, open checklist items; filters by status and region |
| Editor | Sectioned form matching 32.1, inline validation, required-by-status markers, links to the legal document and template records |
| Preview | Simulates a new sign-up in this market and shows the effective settings: wizard defaults, disclosure wording per language, consent text, booking page language, quiet hours, enabled channels and flags |
| Diff | Side-by-side against the live version with a human-readable summary of what changes for tenants |
| Impact analysis | How many tenants, locations and employees are affected, and which of their settings would change or be blocked |
| Review | Required approvers by change type: compliance changes need the compliance officer; pricing changes need finance; channel and flag changes need the market manager |
| Release | Publish now or schedule; new versions apply to new tenants immediately and to existing tenants through a notice and, for compliance changes, a required acceptance |
| Rollback | One-click return to the previous version with its own audit entry |
| Status path | Draft → In review → Approved → Pilot (invite only) → Live. Disabled can be set from any state with a reason and a tenant message |
| Launch checklist | A country cannot move to Pilot or Live until each applicable item is ticked with evidence: counsel sign-off recorded, regulator registration done or documented as not needed, DPA and terms in the local language, WhatsApp templates approved in the launch languages, payment gateway tested end to end, support hours and language staffed, data region deployed, disclosure and consent tested in each language, pen test scope covers the region (section 8.5) |

### 32.3 Industry pack components

| Component | Fields | Validation | Owner can edit after install |
| --- | --- | --- | --- |
| Service item | Name, description, duration, buffer, price placeholder with currency, deposit rule, add-ons, roles allowed, capacity, translations | Duration and price type required; price marked placeholder until the owner sets it | Yes, all |
| Knowledge item | Title, answer, language versions, category, sensitivity (normal, medical, financial, legal), source, pinned-wording flag | Sensitive items must be pinned and flagged for review | Yes; status becomes Verified on confirmation |
| Interview question | Text, input type, which profile or knowledge field it fills, skip allowed | Must map to a field | No (owner answers) |
| Employee template | Persona preset, tone sliders, default tools and autonomy, escalation triggers, language defaults | Autonomy for money and bulk actions cannot exceed Approve | Yes, within the platform floor |
| Recipe | Workflow JSON, parameters with defaults and ranges, stop conditions, required connections | Must pass the workflow validator and a dry run | Parameters only (P2: structure) |
| Message template | Channel, category, language, body, variables with sample values, button definitions | Meets provider rules; submitted for approval on install | Yes; edits resubmit for approval |
| Form | Fields, validation, consent block reference, hidden fields, success action | Consent block comes from the market compliance profile | Yes |
| Pipeline | Stages, probabilities, stale-after days, won and lost reasons | At least a start and an end stage | Yes |
| Fields and tags | Custom field definitions, default tags | No fields that collect prohibited data (government IDs, card numbers) | Yes |
| Dashboard | KPI definitions, widgets, default date range | Each KPI maps to a defined metric | Layout only |
| Review taxonomy | Topic list with example phrases per language | At least 8 topics | Yes |
| Marketing library | Seasonal calendar entries, post and offer templates per language | Claims checked against a banned-claims list | Yes |
| Compliance overlay | Vertical rules: restricted topics, required disclaimers, retention overrides, minors rule, gating flags | Can tighten defaults only | No |
| Evaluation set | Scenarios with customer message, context, expected behavior and failure conditions, by language and market | At least 30 scenarios per supported language tier A | No |
| Demo data | Sample contacts, conversations, bookings flagged as demo | Never mixed with real data | Removable |

### 32.4 Pack studio (admin)

| Screen | Specification |
| --- | --- |
| Pack list | Packs with vertical, versions, markets and languages covered, status (Draft, In review, Pilot, Published, Deprecated), installs, health metrics |
| Editor | A tab per component (32.3) with form and bulk spreadsheet editing, validation messages, and an import and export of the whole pack as files for review in version control |
| Preview | Installs the pack into a sandbox account in a chosen market and language, then lets the author chat with the configured employee, view the booking page and read the Needs-your-input list |
| Eval runner | Runs the pack's evaluation set across languages and models; shows pass or fail per scenario, regressions against the previous version, and cost |
| Compare | Differences between versions by component, with the effect on already-installed tenants |
| Localization | Language coverage matrix per component; assign translators; machine draft then human edit; native-reviewer sign-off per language; Tier A requires sign-off |
| Release pipeline | Draft → eval pass → compliance review (for overlays and claims) → pilot with 3 to 5 tenants → publish. Each stage records who approved and when |
| Release notes and deprecation | Notes shown to tenants in the update diff; deprecation notice with end date and a migration suggestion |
| Analytics | Per pack and version: installs, activation, time to go-live, share of items edited, wrong-answer rate, template approval rate, retention |
| Access | Pack authors edit; compliance reviews overlays; AI quality lead owns eval sets; publishing needs two approvers |

### 32.5 Precedence and conflict rules

Settings resolve from the most protective layer outward. A lower layer can add detail but cannot weaken a higher one.

| Order | Layer | Examples |
| --- | --- | --- |
| 1 | Platform floor | AI disclosure, honoring opt-outs, no impersonation, business-scope lock, audit logging |
| 2 | Market pack | Consent model, recording rule, calling hours, retention minimums, allowed languages and channels |
| 3 | Industry pack overlay | Restricted topics, health and finance gating, minors rule, required disclaimers |
| 4 | Account settings | Languages within the market's list, quiet hours that are stricter, shorter retention, branding |
| 5 | Employee settings | Persona, tone, autonomy within caps, escalation rules |

| Conflict | Result |
| --- | --- |
| Market allows recording, account turns it off | Account setting wins (more protective) |
| Account sets longer retention than the market maximum | Market maximum applies |
| Pack sets Autopilot for discounts | Ignored; money actions are capped at Approve (floor) |
| Owner picks a Tier C language for Autopilot | Blocked; capped at Suggest (section 9.3) |
| Two layers set different quiet hours | The longer quiet window applies |

### 32.6 Versioning and distribution

- Packs and market packs are immutable, versioned snapshots. Tenants reference a version and are never changed silently.
- New versions are announced to affected tenants; owners apply pack updates selectively (FR-IP.3); market updates apply automatically, with acceptance for compliance changes.
- Emergency changes (for example a legal change or a harmful pack item) can be pushed as a hotfix with an audit entry, a tenant notice and a kill switch for the specific item.
- The effective configuration of any tenant can be viewed in the admin console as a resolved document showing which layer set each value.
- Export and import of packs as files supports review in version control and backups; every publish is also stored as a file snapshot.
- Caching is by version, so a publish takes effect across regions within minutes and a rollback is as fast.

### 32.7 Requirements

- **FR-CFG.1** Market packs and industry packs are validated against published schemas before any save, with clear error messages.
- **FR-CFG.2** No pack or market change reaches production without the required approvals for its change type, and every approval is recorded.
- **FR-CFG.3** Preview and sandbox installs never touch real tenant data or send real messages.
- **FR-CFG.4** The resolved-configuration view is available per tenant, per location and per employee, in the admin console and, in summary, in the tenant's Languages and market and Compliance pages.
- **FR-CFG.5** Rolling back a version restores prior behavior for new installs and offers affected tenants a one-click revert.
- **FR-CFG.6** Config analytics (section 31.6) are tied to version numbers so a regression can be traced to the version that caused it.
- **FR-CFG.7** Each pack and market pack has a named owner, a review date, and an alert when it has not been reviewed within 6 months.

## 33. Glossary

| Term | Meaning |
| --- | --- |
| Account | One business using the product; the unit of billing and tenancy |
| Contact | The person the business talks to: identity, consent and timeline. Not a deal |
| Lead | A potential buying relationship worth pursuing (source, status, owner, next follow-up) |
| Opportunity | A specific deal that could close, with value, probability and pipeline stage |
| Location | A branch of a business with its own market settings, hours, currency and numbers |
| Agency / sub-account | A reseller organization and the client accounts under it (later phase) |
| AI employee | A configured agent: role, persona, knowledge, channels, tools, autonomy and guardrails |
| Autonomy level | Suggest (AI drafts), Approve (AI acts after approval) or Autopilot (AI acts and reports) |
| Recipe | A prebuilt workflow template, stored as a JSON graph |
| Industry pack | Versioned bundle of services, knowledge, recipes, templates and rules for one vertical (section 10) |
| Market pack | Per-country configuration of rules, languages, currency and channels (section 9) |
| Snapshot | An export of a real account's setup that an agency imports into new clients |
| Data region | The geographic stack where an account's data is stored and processed |
| WABA | WhatsApp Business Account |
| Embedded Signup | Meta's flow that lets a business connect its own WhatsApp number inside our app |
| BSP | Business Solution Provider, a WhatsApp partner that offers API access |
| Consent ledger | The record of who agreed to what, when, through which wording |
| DPA | Data processing agreement between a business and us as its processor |
| DPIA | Data protection impact assessment |
| DPO | Data protection officer |
| NDPA / NDPC / GAID | Nigeria Data Protection Act 2023 / the Nigeria Data Protection Commission / the General Application and Implementation Directive 2025 |
| DSAR | Data subject access request: a person asking to see, correct or delete their data |
| TCPA | US Telephone Consumer Protection Act, covering calls and texts |
| PEWC | Prior express written consent |
| RLS | Row-level security in the database, used for tenant isolation |
| SLO | Service level objective, a measurable availability or latency target |
| Tenant 360 | The admin page showing one tenant's setup, usage, AI quality, channels, compliance and billing (section 31.3) |
| Health score | Daily 0 to 100 score of a tenant's setup, usage, outcomes and compliance (section 31.7) |
| Needs your input | The list of placeholders an owner must fill after installing a pack (section 10.3) |
| Compliance center | The tenant-facing screens for disclosure, consent, recording, data governance and requests (section 30) |
| Resolved configuration | The final settings of a tenant after the platform floor, market pack, industry pack, account and employee layers are applied (section 32.5) |
| Manual only (AI off) | Running an account, location, channel or conversation with no AI employee; every feature still works by hand (section 15.21) |
| Channel adapter | The code that connects one channel (WhatsApp, email, SMS, web chat and so on) to the common messaging interface (section 5.5) |
