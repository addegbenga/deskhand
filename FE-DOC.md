# Frontend Build Spec: Mock-First UI

Companion to the PRD (v0.5) | Version 0.1 | October 11, 2026 | Owner: Dex

## 1. Purpose and how to use this document

- **Goal:** a clickable, realistic, fully mocked frontend that covers every screen and state in the PRD, so flows, design and copy can be validated before the backend exists, and real APIs can be wired in later without redesign.
- **What lives here:** frontend decisions only: stack, design system, routes, components, mock data, build slices and generation prompts. Product rules stay in the PRD and are referenced by section number (for example 'PRD 29.2 Inbox'). If this document and the PRD disagree, the PRD wins and this document gets fixed. The PRD is never edited from here.
- **How to generate:** build slice by slice (section 10). For each slice, give the tool the global rules (section 11.1), the slice card and the referenced PRD sections. Never ask a tool to build the whole app in one go.
- **Mock-first means:** no backend. Every network call hits a mock API with realistic latency and failure modes, so the UI cannot tell the difference between mock and real.

**Build rule: one slice at a time.** A slice is built in its own session or prompt, merged, and demoed before the next starts. The table below is the whole plan at a glance; section 10 has the full card for each slice.

| Slice | Name | Depends on | Demoable outcome | Relative size |
| --- | --- | --- | --- | --- |
| S0 | Foundation | none | Shells, tokens, dev toolbar, mock API running; every state pattern on a demo page | L |
| S1 | Registration, login, onboarding | S0 | A new account goes from sign-up to go-live | M |
| S2 | Home, Inbox, Contacts | S1 | Live inbox with simulated messages, composer, contact records | L |
| S3 | Sales, Bookings, public booking page | S2 | A customer books on the public page and it appears in Bookings | L |
| S4 | AI employees | S2 | Create, test, approve and supervise an AI employee | L |
| S5 | Automations, Marketing, Reputation, Payments | S3, S4 | Recipes, a campaign send, review replies, payment links | L |
| S6 | Reports, Pages and funnels | S3, S5 | Reports with real-looking numbers; a published landing page | M |
| S7 | Settings, Connections, Team, Billing | S1 | Invite a teammate, fix a broken connection, change plan | M |
| S8 | Compliance and governance center | S4, S7 | Market-aware checklist, consent ledger, request queue | M |
| S9 | Public surfaces | S3, S4 | Chat widget, forms, QR links, payment and review pages | M |
| S10 | Platform admin console | S0 | Tenant 360, setup monitor, insights, support flows | L |
| S11 | Configuration editors | S10 | Market pack editor, pack studio, precedence simulator | M |
| S12 | Hardening | all | Accessibility, right-to-left, performance, end-to-end tests | M |

**Parallel work.** After S2, S3 and S4 can be built side by side. S10 only needs S0, so the admin console can start in parallel with S5 to S9. Everything else follows the order above.

**What goes into each slice prompt:** the global rules (section 11.1), that slice's card (section 10), and only the PRD sections the card names. Never the whole PRD, and never more than one slice.

## 2. Scope

| Surface | What it contains | PRD sections |
| --- | --- | --- |
| Tenant app | Registration, onboarding, dashboard, every module, settings, compliance center | 6, 27, 28, 29, 30, 15 |
| Public surfaces | Booking page and manage-booking page, chat widget demo, forms, landing pages, payment page, review landing, link hub | 11, 15.20 |
| Admin console | Overview, tenants, Tenant 360, setup monitor, usage, AI ops, channels, compliance, billing, flags, system, insights | 31 |
| Config editors | Market pack editor, pack studio, resolved-configuration viewer, precedence simulator | 32, 9, 10 |

**Not in the mock:** real integrations (OAuth, Meta, payment gateways, email sending), real AI (replies are scripted), real payments, native mobile apps (the web app is fully responsive instead).

**Fidelity levels.** Level 1: clickable with seeded data. Level 2: stateful, so creating, editing and deleting persist for the session (persisted in the browser's IndexedDB). Level 3: simulated realtime. Target Level 2 everywhere and Level 3 in Inbox, Approvals, Home and the admin Overview.

## 3. Stack and architecture

Confirmed: shadcn/ui and TanStack Router. Other items are defaults that can be swapped, but keep the contract-first and mock-API rules.

| Concern | Choice | Notes |
| --- | --- | --- |
| Language and build | TypeScript (strict), Vite, pnpm workspaces | One monorepo |
| UI | React 18, Tailwind CSS driven by CSS-variable tokens, shadcn/ui on Radix primitives | Components copied into `packages/ui` |
| Routing | TanStack Router, file-based | Typed search params for filters and saved views |
| Server state | TanStack Query | Optimistic updates for approvals, drag and drop, inbox |
| Local state | Zustand, only where Query does not fit |  |
| Forms | react-hook-form with zod | Same zod schemas as the API contract |
| Mock API | MSW (service worker) with `@mswjs/data` in-memory database seeded from fixtures, `faker` with fixed seeds | Persisted in IndexedDB (section 8.6) |
| Realtime | Mock WebSocket or event emitter | Simulates incoming messages and AI actions |
| i18n | i18next or Lingui with ICU messages | Locales: en, fr (stub), ar (to test right-to-left) |
| Dates and numbers | `Intl` APIs and date-fns-tz | Per-location timezone and currency |
| Tables, charts, drag and drop | TanStack Table (virtualized), Recharts, dnd-kit |  |
| Calendar | FullCalendar or a custom week and day grid | Staff columns, drag to reschedule |
| Rich text | Tiptap for the composer and the page editor |  |
| Testing | Vitest and Testing Library, Playwright for core flows, axe for accessibility, Storybook for components |  |
| Quality gates | ESLint, Prettier, a lint rule that forbids raw colors and hard-coded strings | Tokens and i18n keys only |
| Persistence | IndexedDB through Dexie or idb | Mock database survives reloads; see section 8.6 |

**Monorepo layout**

- `apps/tenant`: owner and staff app
- `apps/admin`: platform admin console
- `apps/public`: booking page, widget host and demo, forms, pages, payment, review landing, link hub
- `packages/ui`: design system components
- `packages/schemas`: zod schemas shared by the UI and the mock API (later the real API contract)
- `packages/mock-api`: MSW handlers, seed data, simulators, dev toolbar
- `packages/config`: market pack and industry pack fixtures
- `packages/i18n`: translation files and helpers

**The admin console is a separate app.** `apps/admin` has its own router, build and deployment. It shares only `packages/ui`, `packages/schemas`, `packages/mock-api` and `packages/i18n` with the tenant app, uses its own internal sign-in mock, and keeps its distinct visual accent (section 5). The `/admin/...` routes in section 6 are that app's routes.

**Architecture rules**

1. Contract-first: the zod schemas are the API. Mock handlers validate against them, so swapping in the real backend is a base-URL change.
2. Feature folders: each module owns its routes, components, hooks and API client.
3. No business logic in components. Hooks and services hold it, with unit tests.
4. Every string comes from an i18n key and every color from a token.
5. A single `PermissionGate` component and `usePermission` hook enforce the role matrix (PRD 12.2). The UI hides what a role can never use and disables, with a reason, what could be unlocked.
6. Every list, detail and form implements all states in section 4.5.

## 4. Design system

### 4.1 Principles

1. **Calm and trustworthy.** Owners are time-poor and nervous about AI; the interface must feel steady.
2. **Outcome first.** Show numbers and the next action before settings.
3. **AI is visible, never loud.** Anything the AI wrote or did is always marked, with a way to see why.
4. **Mobile-first for daily work:** Home, Inbox, Approvals, Bookings.
5. **Dense where work happens** (inbox, tables) and **spacious where people learn** (onboarding).
6. **Accessible by default** and ready for right-to-left languages.

### 4.2 Tokens (starting values, adjustable)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | #FAFAF9 | #0C0A09 | App background |
| `--surface` | #FFFFFF | #1C1917 | Cards, panels |
| `--surface-2` | #F4F4F2 | #292524 | Subtle fills, table stripes |
| `--border` | #E5E5E0 | #44403C | Dividers |
| `--fg` | #1C1917 | #FAFAF9 | Primary text |
| `--fg-muted` | #57534E | #A8A29E | Secondary text |
| `--brand` | #0F766E | #2DD4BF | Primary actions, active nav |
| `--ai` | #7C3AED | #A78BFA | Everything authored or done by AI |
| `--attention` | #D97706 | #FBBF24 | Needs your attention |
| `--success` | #15803D | #4ADE80 | Healthy, done |
| `--danger` | #B91C1C | #F87171 | Errors, kill switch, destructive |
| `--info` | #1D4ED8 | #60A5FA | Neutral information |

- **Type:** Inter for UI with a system fallback; tabular numerals for metrics. Scale 12, 14, 16, 18, 20, 24, 30, 36 with comfortable line heights.
- **Spacing:** 4px grid. **Radius:** 6 (small), 10 (medium), 14 (large), full for chips and avatars. **Elevation:** three levels, borders preferred over shadows.
- **Motion:** 120, 200 and 300 ms ease-out; reduced motion honored everywhere.
- **Breakpoints:** 360, 640, 768, 1024, 1280, 1536.
- **Density:** comfortable and compact, a per-user toggle that changes row height and padding.
- **Dark mode:** supported from day one through the token pairs above.
- **Data visualization:** a 6-color palette that stays distinguishable for color-blind users, always paired with labels or patterns.

### 4.3 AI visual language

- **AI badge:** violet pill with a spark icon and the employee's name, used on every AI message, draft, action and suggestion.
- **AI-authored message:** subtle violet tint with a left accent. Human messages have no tint.
- **Drafting state:** shimmer on a draft while it is being written.
- **Confidence:** three levels (high, medium, low) shown as a small meter on drafts and approvals.
- **'Why this?' popover:** sources used (knowledge items, contact data), rules applied, and the tool calls made.
- **Created-by chips:** Person, AI employee, Recipe, Form, Booking page, Import, API (PRD 15.21).
- **Autonomy chips:** Suggest, Approve, Autopilot, each with its own icon and never color alone.
- **Language tier badges:** A, B, C with a tooltip explaining what the tier allows.
- **Kill switch:** a danger-outline button reachable from the AI status pill on every screen.

### 4.4 Status chip mapping

One `StatusChip` component with a fixed map, so the same state always looks the same:

- Account state (Trial, Active, Past due, Suspended, Cancelled)
- Connection health (green, amber, red) with the exact problem on hover
- WhatsApp template status (Draft, Pending, Approved, Rejected)
- Booking (Booked, Completed, No-show, Cancelled), Payment (Pending, Paid, Failed, Refunded)
- Review (New, Needs reply, Replied, Flagged), Consent (Granted, Withdrawn, Missing)
- Compliance item (Done, Needs attention, Blocking go-live)
- Employee lifecycle (Draft, Testing, Shadow, Live, Paused, Archived)

### 4.5 State patterns (required on every screen)

- **Empty:** one icon, one sentence on the value, one primary action.
- **Loading:** skeletons that match the final layout; no full-page spinners.
- **Error:** plain-language cause, Retry, and a support code.
- **No permission:** names the role that can do it and, where possible, a Request access action.
- **Offline and stale:** an offline banner, and a refresh prompt when data changed underneath.
- **Demo data:** a visible ribbon whenever sample data is shown (PRD FR-O.4).

### 4.6 Content rules

- Plain and short; no jargon. Say 'message' unless a rule is channel-specific.
- Money via `Intl` using the location's currency; dates relative within 7 days with the absolute date on hover; plurals through ICU.
- Use one name per concept: contact, conversation, booking, employee, recipe, approval.
- Destructive actions name what will happen and how many records.

### 4.7 Accessibility

WCAG AA, visible focus, full keyboard flows for inbox, calendar and the command palette, `aria-live` for realtime updates, 44px touch targets, reduced motion, and logical CSS properties so right-to-left works without rewrites.

### 4.8 Visual direction and fidelity

**Look and feel: modern, clean, intuitive.**

- Generous whitespace, clear hierarchy, one primary action per screen, borders over heavy shadows, and restrained color: brand for actions, violet only for AI, amber only for attention.
- Progressive disclosure: common settings first, advanced options collapsed under 'Advanced'. Defaults are sensible, so a first-time owner can finish most tasks without reading anything.
- Plain labels, sentence-case headings and consistent icons (Lucide). Every list behaves like every other list, and every wizard like every other wizard.
- Subtle motion for feedback only (hover, expand, toast). Nothing decorative.
- Avoid generic AI-tool aesthetics: no gradient blobs, no stock illustrations, no emoji used as icons.

**Real components, not placeholders.**

- Every screen is built from the actual shadcn/ui components (Button, Input, Select, Combobox, Command, Dialog, Sheet, Popover, Tabs, Table with TanStack Table, Calendar, Form, Badge, Avatar, Skeleton, Sonner toasts, Tooltip, Dropdown Menu, Accordion, Switch, Checkbox, Radio Group, Progress, Alert) wired to the mock API.
- No gray boxes, lorem ipsum, fake screenshots or static mockups. Names, phone numbers, prices (₦), dates and messages are realistic and localized; avatars use initials; charts use Recharts with seeded data.
- Every control works: forms validate and submit, tables sort, filter and paginate, drag and drop moves records, dialogs trap focus, toasts confirm, and loading and error states appear when the mock network is slow or failing.

**Intuitiveness checks.** Run on S2, S3 and S4 before moving on, with at least 3 real small-business owners using scenario A.

| Task | Target for a first-time user, without help |
| --- | --- |
| Understand what needs attention from Home | Within 10 seconds |
| Find and approve a pending AI draft | Under 15 seconds |
| Create a booking from the calendar | Under 30 seconds |
| Invite a teammate by email | Under 30 seconds |
| Pause the AI on one conversation | Under 10 seconds |
| Find where to connect a channel | Under 15 seconds |

Fix labels and layout before the next slice starts.

### 4.9 Brand direction (placeholder)

- **Working name:** Deskhand, a placeholder with no trademark or domain check yet. The name lives in one configuration constant (`BRAND_NAME`) and in translation strings, never hard-coded, so renaming is a one-line change.
- **Personality:** warm, practical and capable. Plain words, no hype, no jargon. The product feels like a dependable team member, not a robot.
- **Tagline (draft):** 'The team member who never misses a message.'
- **Logo (draft):** a simple lowercase wordmark in Inter semibold with a small teal square. The AI's spark icon is a separate mark used only for AI content (section 4.3).
- **Colors and type:** the tokens in section 4.2 stand until a proper brand pass.
- **AI employee names:** owners name their employee; the wizard suggests short, friendly names that fit the market (for example Ada, Tola or Kemi for Nigeria).

## 5. App shells and layout

**Tenant shell**

- **Sidebar:** collapsible, grouped as in PRD 28.1, with badges for unread conversations and approvals waiting.
- **Top bar:** location switcher, global search and command palette (keyboard shortcut), quick create (+), notification center, AI status pill, setup checklist pill, help, account menu.
- **Banner region** under the top bar for billing, connection and compliance notices, each with one fix button.
- **Page header:** title, breadcrumbs, one primary action, tabs.
- **Mobile:** bottom navigation (Home, Inbox, Bookings, Approvals, More) and a sheet for everything else.

**Admin shell**

- A distinct accent (ink and slate instead of teal) so staff never confuse it with the tenant app.
- Left navigation per PRD 31.2, a persistent tenant search, a region switch, a masked-data indicator with a reveal-with-reason dialog, and a red 'impersonating' banner during support sessions.

**Public shell**

- Minimal and branded with the tenant's tokens, language switcher, consent footer and a removable 'Powered by' badge.

**Layout primitives:** `PageHeader`, `SplitPane` (list and detail), `ThreePane` (inbox), `Drawer`, `WizardLayout` (stepper and sticky footer), `SettingsLayout` (secondary navigation), `DataPage` (filters, table and bulk-action bar).

## 6. Route map

| Route | Screen | PRD | Slice |
| --- | --- | --- | --- |
| `/signup`, `/verify`, `/login`, `/forgot`, `/invite/:token` | Registration, login, recovery, accept invite | 27, 12.4 | S1 |
| `/onboarding/:step` | Setup wizard and go-live gates | 6 | S1 |
| `/app/home` | Home | 29.1 | S2 |
| `/app/inbox`, `/app/inbox/:conversationId` | Inbox | 29.2 | S2 |
| `/app/contacts`, `/:id`, `/duplicates`, `/import` | Contacts | 29.3 | S2 |
| `/app/sales/leads`, `/app/sales/pipeline`, `/app/sales/opportunities` | Sales (leads, pipeline, opportunities) | 29.4 | S3 |
| `/app/bookings`, `/app/services`, `/app/staff`, `/app/booking-page` | Bookings | 29.5 | S3 |
| `/app/pages`, `/:id` | Pages and funnels | 29.6, 15.20 | S6 |
| `/app/ai/employees`, `/new/chat`, `/new/voice`, `/:id/:tab` | AI employees and wizards | 29.7, 7 | S4 |
| `/app/ai/knowledge`, `/approvals`, `/activity` | Knowledge, approvals, activity | 29.8, 29.9 | S4 |
| `/app/automations`, `/:id` | Automations | 29.10 | S5 |
| `/app/marketing/planner`, `/campaigns`, `/templates`, `/links` | Marketing | 29.11 | S5 |
| `/app/reputation/reviews`, `/requests`, `/insights` | Reputation | 29.12 | S5 |
| `/app/payments/links`, `/list` | Payments | 29.13 | S5 |
| `/app/reports/:report` | Reports | 29.14 | S6 |
| `/app/connections` | Connections hub | 29.16, 5 | S7 |
| `/app/settings/:page` | Settings, team, billing, usage | 29.15, 12.4, 13 | S7 |
| `/app/compliance/:page` | Compliance and governance center | 30 | S8 |
| `/b/:slug`, `/b/:slug/manage/:token` | Public booking page and manage booking | 11.2 | S3 |
| `/p/:slug`, `/pay/:id`, `/r/:slug`, `/l/:slug`, `/embed/demo`, `/f/:formId`, `/embed/form/:formId` | Landing pages, payment, review landing, link hub, widget, hosted/embed forms | 11, 15.20 | S6, S9 |
| `/admin`, `/admin/tenants`, `/admin/tenants/:id/:tab` | Admin overview, tenants, Tenant 360 | 31 | S10 |
| `/admin/onboarding`, `/usage`, `/ai`, `/channels`, `/compliance`, `/billing`, `/plans`, `/support`, `/safety`, `/flags`, `/system`, `/insights`, `/users` | Admin modules | 31 | S10 |
| `/admin/markets`, `/markets/:code`, `/packs`, `/packs/:id` | Market pack editor, pack studio | 32 | S11 |
| `/dev/scenarios` | Scenario switcher (dev only) | n/a | S0 |
| /app/marketing/forms, /:id, /:id/responses | Form and survey builder, responses | 15.4, 11.5 | S5 |
| /app/tasks | Tasks | 29.18 | S3 |
| /preferences/:token, /privacy/:slug | Preference center and privacy request page (public) | 11.9 | S9 |

## 7. Component inventory

Build these once in `packages/ui` (or the feature folder noted) and reuse everywhere. Each has a Storybook story covering all states.

| Group | Components |
| --- | --- |
| Foundation | `Button`, `IconButton`, `Input`, `Select`, `Combobox`, `Checkbox`, `Switch`, `RadioGroup`, `Textarea`, `DatePicker` and `TimePicker` (timezone-aware), `PhoneInput` (country-aware), `CurrencyInput`, `Tabs`, `Dialog`, `Drawer`, `Popover`, `Tooltip`, `Toast`, `Banner`, `Badge`, `Avatar`, `Skeleton`, `EmptyState`, `ErrorState`, `NoPermissionState` |
| Navigation and shell | `AppShell`, `Sidebar`, `TopBar`, `LocationSwitcher`, `WorkspaceSwitcher`, `CommandPalette`, `NotificationCenter`, `QuickCreate`, `SetupChecklistPill`, `AIStatusPill`, `HelpMenu`, `Breadcrumbs`, `PageHeader` |
| Data | `DataTable` (saved views, column picker, filters, bulk bar, virtualized), `FilterBar`, `SavedViews`, `KanbanBoard`, `CalendarGrid`, `Timeline`, `ActivityFeed`, `StatCard` with sparkline, `Chart` wrappers, `Stepper`, `Wizard`, `KeyValueList`, `DiffViewer`, `JsonViewer` |
| Messaging | `ConversationList`, `ConversationThread`, `MessageBubble` (human, AI, system, note), `Composer` (templates, saved replies, attachments, schedule send, translate preview, WhatsApp window indicator), `ContactPanel`, `ChannelIcon`, `DeliveryStatus`, `TemplatePicker`, `QuickReplies`, `ChatWidgetPreview` |
| AI | `AIBadge`, `ConfidenceMeter`, `WhyPopover`, `DraftCard`, `ApprovalCard`, `AutonomyMatrix`, `AutonomyChip`, `EmployeeCard`, `SandboxChat`, `KnowledgeItemEditor`, `GapPanel`, `NeedsTrainingList`, `KillSwitchButton`, `LanguageTierBadge`, `EvalResultsTable`, `VersionHistory` |
| Business | `ContactCard`, `OpportunityCard`, `BookingDrawer`, `ServiceEditor`, `AvailabilityEditor`, `SlotPicker`, `PaymentLinkForm`, `ReviewCard`, `TemplateStatusRow`, `CampaignBuilder`, `ConnectionCard`, `PlanUsageMeter`, `InviteMembersForm` |
| Compliance | `ComplianceChecklist`, `ConsentBadge`, `ConsentLedgerTable`, `DisclosurePreview`, `RetentionScheduleEditor`, `RequestQueue` with SLA timers, `AuditLogTable`, `LegalDocAcceptance` |
| Admin and config | `Tenant360Header`, `HealthScoreBadge`, `FunnelChart`, `StuckTenantsTable`, `CohortGrid`, `MetricCatalog`, `MaskedField` (reveal with reason), `ImpersonationBanner`, `FlagEditor`, `SchemaForm` (renders a form from a zod or JSON schema), `MarketPackEditor`, `PackStudioTabs`, `ResolvedConfigViewer` (shows which layer set each value), `PrecedenceSimulator`, `ReleaseChecklist` |
| Public surfaces | `BookingFlow` (service, staff, slot, details, deposit, confirmation), `ManageBooking`, `WidgetLauncher`, `WidgetPanel`, `FormRenderer`, `PageBlocks` (hero, services, testimonials, FAQ, form, booking embed, map), `PaymentPage`, `ReviewLanding`, `LinkHub`, `QRPoster` |
| Forms and surveys | FormBuilder (field palette, multi-step, conditional logic, consent block, survey question types such as rating, NPS and CSAT, preview, embed and share), FormRenderer, ResponsesTable, ResponseDetail |
| Tasks, email, calls and privacy pages | TaskList, TaskForm, EmailTemplateEditor (block-based, required unsubscribe footer), CallPlayer with transcript and summary, PreferenceCenter, PrivacyRequestForm |

## 8. Mock data layer

### 8.1 Entities

The mock database mirrors PRD 18.2: accounts, locations, users and memberships, roles, contacts and contact channels, tags, custom fields, consent records, pipelines, stages, opportunities, conversations, messages, services, staff, availability rules, appointments, forms, form submissions, workflows and runs, templates, campaigns, posts, reviews, payments, payment links, knowledge items, employees and versions, AI actions, approvals, evaluations, connections, integrations health, notifications, requests (DSAR), audit entries, legal documents, plans, subscriptions, usage aggregates, invoices, market packs, industry packs and installs, feature flags. Every record has `id`, `accountId`, `createdAt`, `createdBy` (person, AI employee, recipe, form, booking page, import, API) and, where relevant, `locationId`.

### 8.2 Seed scenarios

Switchable from the dev toolbar. Each scenario seeds roughly 150 contacts, 40 conversations, 60 bookings, 30 reviews and 90 days of metrics with fixed random seeds.

| Scenario | Business | Market and setup | Purpose |
| --- | --- | --- | --- |
| A. Amaka Braids | Salon, Lagos | Nigeria; WhatsApp, web chat, email; English and Pidgin; AI live in Approve mode; salon pack installed | The main demo and the golden path |
| B. Okoye Dental | Clinic, Abuja | Nigeria; email and web chat; manual only (AI off); health gating on | Proves manual parity and the clinic overlay |
| C. Brixton Barbers | Barber, London | UK; email, web chat, WhatsApp; EU-style compliance; AI in Suggest mode | Proves market differences and AI disclosure |
| D. Lone Star Realty | Real estate, Austin | US; SMS and email; strict consent; AI on a trial | Proves SMS, consent and trial states |
| E. Brand new account | Empty | Just signed up; onboarding step 2 | Onboarding and empty states |
| F. Troubled account | Salon | Past due, WhatsApp quality low, template rejected, calendar token expired, compliance blocking | Banners, degraded modes, fix flows |
| G. Agency (later) | Reseller with 5 sub-accounts | Agency owner | Workspace switcher |
| Admin dataset | 400 tenants across 6 markets | Mixed health, funnel, revenue, incidents | Admin console |

### 8.3 Dev toolbar (floating, hidden in production builds)

- Switch scenario, role (Owner, Admin, Manager, Staff, Read-only, and each admin persona), language (en, fr, ar), theme, density.
- Account state (Trial, Active, Past due, Suspended, Cancelled) and plan.
- Toggle AI on or off for the account, a channel or a conversation; set an employee's autonomy.
- Toggle connection problems (WhatsApp down, DNS unverified, token expired).
- Data volume: empty, light, full. Network: fast, slow, offline, 5% random failure.
- Move the clock, and set the market (re-applies market pack and compliance profile).
- Trigger simulators (section 8.4) on demand.

### 8.4 Simulators (Level 3 realism)

- **Inbound messages:** every 20 to 60 seconds a new customer message arrives on a random channel. Intents: price question, booking request, complaint, unknown question, Pidgin message, opt-out ('STOP'), photo attachment.
- **AI reply engine:** scripted by intent with short realistic delays. Known price: grounded reply with a 'Why this?' source. Booking: offers two slots then books. Complaint: hands off to a human. Unknown question: says it will check and adds an item to the Needs training list. Pidgin: replies in Pidgin and shows the tier badge. 'STOP': confirms opt-out and updates consent.
- **Approvals:** a draft or two per minute appears in the queue with confidence levels.
- **Webhooks:** payment succeeded or failed, review received, template status changed, calendar sync error, request received.
- **Admin series:** seeded time series for funnel, revenue, usage, AI quality and incidents, with a 'live' tick on the Overview.

### 8.5 Behaviors the mock API must reproduce

- Latency of 150 to 600 ms, and slow and failing modes from the toolbar.
- `403` by role (including masked fields in admin), `409` on double booking and on stale edits, `422` with field errors in the contract's error shape, `429` on rate limits.
- Pagination and cursor handling, idempotency keys on create, and optimistic update rollback.
- WhatsApp rules: a 24-hour window per contact, template-only outside it, delivery states that advance over time.
- Consent enforcement: sends blocked with a reason when consent is missing or the contact opted out.
- Time: a controllable clock, and every timestamp rendered in the location's timezone.

### 8.6 Persistence with IndexedDB

- The mock database persists in the browser's IndexedDB through a thin repository layer (Dexie or `idb`). MSW handlers read and write through the repositories, never directly, so the real API can replace them without touching the UI.
- One database per scenario, created and seeded on first load, with a schema version and migrations so a code change never corrupts saved demo data.
- Dev toolbar actions: Reset to seed, Save snapshot, Load snapshot, Export as JSON, Import JSON (for sharing a prepared demo with stakeholders).
- Multiple tabs stay in sync through `BroadcastChannel`, so a change in one tab appears in another (needed for the double-booking and live inbox demos).
- The controllable clock and simulator state persist, so a demo resumes where it stopped.
- Storage limits are handled gracefully (a warning and a cleanup action). Seed data stays around 5 to 10 MB per scenario.
- Only fake data is ever stored, and the 'Demo data' ribbon is always visible.

## 9. State and permission matrix

Because the product changes shape by role, account state, market, language and AI mode, every screen is reviewed against these dimensions. The dev toolbar flips each one.

| Dimension | Values | What must change on screen |
| --- | --- | --- |
| Role | Owner, Admin, Manager, Staff, Read-only (PRD 12.2) | Visible nav, actions, data scope (own versus all), disabled-with-reason controls |
| Account state | Trial, Trial expired, Active, Past due, Suspended, Paused, Cancelled (PRD 27.4) | Banners, read-only modes, AI behavior, billing prompts |
| AI mode | AI on, Suggest-only, Human only (per account, channel, conversation), Manual only (no employee) | AI badges, approvals queue, composer suggestions, onboarding path, AI-specific compliance items |
| Market | NG, GH, KE, ZA, UK, EU, US (PRD 9) | Channels offered, currency and number formats, consent wording, disclosure text, recording options, flags |
| Language | en, fr, ar (right-to-left), and long-string stress mode | No truncation or overflow, mirrored layouts, translated chips and dates |
| Language tier | A, B, C | Autonomy caps, warnings in wizards, tier badges |
| Connection health | Healthy, degraded, broken per connection | Banners, sends paused, fix flows |
| Data volume | Empty, light, full | Empty states, pagination, virtualization |
| Network | Fast, slow, offline, failing | Skeletons, retries, offline banner, optimistic rollback |
| Viewport | 360, 768, 1280, 1536 | Single-pane flows on phones, collapsed sidebar, no horizontal scroll |
| Theme and density | Light, dark, comfortable, compact | Token-only styling, row heights |

**Screen review checklist.** For each screen confirm: all four required states (empty, loading, error, no-permission) exist; the role matrix is respected; the AI-off variant works; every list has saved filters in the URL; every destructive action asks for confirmation and states the count; every string is a key; keyboard-only use works; the screen is usable at 360 px.

## 10. Build slices

Build in this order. Each slice ends in something demoable and is merged before the next starts. 'PRD' lists the sections the slice implements. 'Mock' lists the data and simulators it needs.

### S0. Foundation

- **Build:** monorepo, tokens, base components (section 7 Foundation), tenant, admin and public shells, router, i18n with en, fr and ar, mock API skeleton with MSW and the in-memory database, auth mock, `PermissionGate`, state components (empty, loading, error, no-permission), Storybook, and the dev toolbar with scenario, role, language, theme and network controls.
- **Mock:** scenario A seed and the scenario switcher.
- **Acceptance:** switching scenario, role, language and theme works without reload; the shell renders correctly for every role and viewport; a demo page shows every state pattern; lint blocks raw colors and hard-coded strings.

### S1. Registration, login and onboarding

- **PRD:** 27, 6, 5.5, 12.4 (accepting an invitation), 29.16 connect flows.
- **Build:**
  - Sign-up, verify (any six-digit code in mock; `123456` documented), login, forgot password, accept-invite page, resumable sign-up.
  - Onboarding wizard steps 2 to 9: business profile with a mock website and Instagram import that prefills fields and preselects an industry pack; goals; knowledge interview with a 'what the AI knows' preview; channel picker where any combination can be chosen, with simulated connect flows (WhatsApp embedded signup dialog, email DNS records with a verify button, web chat snippet); services and calendar; create-employee entry with a visible 'Manual only for now' option; compliance setup; test and go-live with the readiness checklist.
  - Go-live gates that block the final button, activation milestone tracking, setup checklist pill on every later screen.
- **Mock:** scenario E, a fake website parser, DNS and verification simulators.
- **Acceptance:** from sign-up to go-live in Suggest mode in under 5 minutes of clicking; every gate blocks until satisfied; the Manual only path reaches go-live without any AI step; leaving and resuming restores progress.

### S2. Home, Inbox, Contacts

- **PRD:** 29.1, 29.2, 29.3, 15.21.
- **Build:**
  - Home with attention cards, today's timeline, results with comparisons, AI activity, suggestions, and setup checklist.
  - Inbox three-pane with all views and filters, thread with AI, human, system and note messages, composer with templates, saved replies, attachments, schedule send and translate preview, WhatsApp window indicator, consent and opt-out blocking, AI controls (take over, hand back, accept or edit draft, 'Why this?', rate reply), collision indicators, keyboard shortcuts, bulk actions. Call conversations (voice employee, P2) render with an audio player, transcript and summary, stubbed.
  - Contacts list with saved views and bulk actions, contact detail tabs (including AI memory and Consent), duplicates and merge, import wizard with consent attestation, custom fields.
- **Mock:** inbound message and AI reply simulators, window and consent rules.
- **Acceptance:** a new simulated message appears live with an unread badge; replying outside the WhatsApp window offers only templates; replying to an opted-out contact is blocked with a reason; with the AI off, no AI UI appears and everything still works; the screens work at 360 px.

### S3. Sales, Bookings and the public booking page

- **PRD:** 29.4, 29.5, 11.2, 11.3.
- **Build:**
  - Sales area with All leads (default), Pipeline kanban of opportunities, and Opportunities table of the same deals. Qualify a lead to create an opportunity; do not auto-create on first inbound. Tasks screen with views, reminders and linked records (PRD 29.18).
  - Bookings: day, week and month diary with staff columns, drag to reschedule, booking drawer actions, create booking, services, staff and availability editors, booking page settings with live preview, waitlist and class capacity.
  - Public booking flow (service, staff, slot, details, deposit, confirmation) with slot holds that expire, timezone display, translated labels, abandonment capture, manage-booking page from a signed link, and embed demos (inline, popup, floating).
- **Mock:** availability engine, slot lock and `409` double-booking, deposit payment simulator.
- **Acceptance:** two browser tabs cannot book the same slot; a held slot releases after the timer; rescheduling in the calendar updates the public page; changing a location's timezone changes displayed times everywhere.

### S4. AI employees

- **PRD:** 29.7, 29.8, 29.9, 7, 8.4, 9.3, 9.4.
- **Build:**
  - Employee list and detail tabs (overview, persona and languages, knowledge, channels and hours, skills and tools, rules, test, versions, activity, compliance check).
  - Chat wizard (nine steps) and voice wizard (nine steps) with the market and language inheritance step, tier caps and blocking rules.
  - Knowledge base (collections, status Verified or Unverified or Needs review, import from URL or document, Needs training inbox, gaps panel, pinned wording per language).
  - Approvals queue (approve, edit then approve, reject with reason, bulk) and activity log, transcript review and sampling, sandbox chat with scripted adversarial scenarios, version history with rollback, kill switch.
- **Mock:** AI reply engine, approvals generator, eval results per language.
- **Acceptance:** a Tier C language cannot be set to Autopilot; an unverified price is never stated by the sandbox AI; raising autonomy asks for a reason and creates a new version; the kill switch pauses the employee everywhere within the UI immediately.

### S5. Automations, Marketing, Reputation, Payments

- **PRD:** 29.10 to 29.13, 15.6, 15.9, 15.10, 15.11.
- **Build:**
  - Recipe library, active workflows with performance counts, recipe parameter editor (delays, channel priority list, conditions, templates per language, stop conditions), per-contact run log, test mode.
  - Marketing: content planner calendar with AI drafts and approval, campaign builder with the pre-send compliance check (excluded contacts for missing consent, quiet hours, template approval), template manager with status and rejection reasons per language, links and QR with a printable poster.
  - Reputation: reviews list and detail with AI analysis and draft reply, request settings, insights, alerts.
  - Payments: payment link creation and tracking, payments list, deposits, gateway connection status. Forms: builder with field palette, multi-step and conditional logic, consent block, survey question types (rating, NPS, CSAT) in survey mode, preview, embed and share, and a responses table.
- **Mock:** template approval state machine, review arrival, payment webhooks.
- **Acceptance:** a campaign shows how many contacts were excluded and why before it can be sent; request wording that offers a reward is blocked; a recipe cannot use a channel the contact has not agreed to.

### S6. Reports, Pages and funnels

- **PRD:** 29.14, 29.6, 15.20, 15.12.
- **Build:** standard reports with filters, comparisons, metric definitions on hover, export and scheduled digest setup; page list, template picker, AI draft from a prompt, block editor with mobile preview and version history, funnel step view with drop-off, publish dialog with SEO and domain fields, and the public landing page at `/p/:slug`.
- **Mock:** 90 days of seeded metrics, page analytics.
- **Acceptance:** every report number has a definition; changing the date range or location updates all cards; a published page renders at its public URL with the consent block and booking embed.

### S7. Settings, Connections, Team, Billing

- **PRD:** 29.15, 29.16, 5, 12, 13.
- **Build:** every settings page in PRD 29.15; Connections hub with health, test and fix flows; team and roles with email invitations (single and bulk with per-address results), join links with approval, pending list, offboarding wizard; billing and plan, usage meters with caps and alerts, invoices, plan change, cancellation with export; security (two-factor, sessions); data export and account closure.
- **Mock:** connection failures, usage simulator, invoice generator, plan entitlements.
- **Acceptance:** an invited user can accept by email and see only what their role allows; bulk invite reports per-address results; hitting a plan limit shows an upgrade prompt; closing an account requires export choice and typed confirmation.

### S8. Compliance and governance center

- **PRD:** 30, 8.
- **Build:** overview checklist computed from the market pack, disclosure editor with per-language preview and a verification test, consent ledger explorer, wording versions, suppression list and re-consent campaign, recording and retention settings, data region and documents, data subject request queue with SLA timers and an export or delete preview, AI governance console, audit log, access review and support-access approvals, legal document acceptance.
- **Mock:** market packs for NG, UK and US, request generator with deadlines, audit entries.
- **Acceptance:** switching the market changes the checklist and wording without code changes; a Blocking item prevents go-live and Autopilot with a visible reason; a request nearing its deadline escalates visibly.

### S9. Public surfaces

- **PRD:** 11.4 to 11.8.
- **Build:** chat widget with launcher, pre-chat form, rich cards (slot picker, payment link), 'Continue on WhatsApp' handoff, offline mode, consent hook and a documented JavaScript API demo page; form renderer (inline, popup, hosted); Click-to-WhatsApp link and QR generator; hosted payment page; review landing; link hub; preference center and privacy request page (PRD 11.9).
- **Mock:** widget conversation backed by the AI reply engine, visitor identity merge.
- **Acceptance:** the widget works on the demo host page at 360 px; a visitor who gives a phone number becomes a contact; the review landing never filters by sentiment.

### S10. Platform admin console

- **PRD:** 31.
- **Build:** Overview, Tenants list with filters, Tenant 360 with every tab, onboarding and setup monitor (funnel, stuck tenants, failure leaderboard, cohorts), usage and cost with margin, AI operations (evals, incidents, rollout, debugger), channels and providers, compliance admin, billing and revenue, plans and entitlements, support and impersonation flow, trust and safety, feature flags, system health, insights catalog with a query view, admin users and audit, health score breakdown and operational alerts.
- **Mock:** the admin dataset (400 tenants) and live ticking metrics.
- **Acceptance:** a stuck tenant can be found, opened in Tenant 360, nudged and tracked; PII is masked until a reason is entered; impersonation shows the banner and logs the session.

### S11. Configuration editors

- **PRD:** 32, 9, 10.
- **Build:** market pack list and sectioned editor with inline validation, preview of a simulated sign-up, diff and impact analysis, approval and release workflow with checklist, rollback; pack studio with component tabs, sandbox preview, eval runner results, localization matrix, release pipeline and analytics; resolved-configuration viewer and precedence simulator.
- **Mock:** market pack and industry pack fixtures with schemas, simulated tenants for impact analysis.
- **Acceptance:** an invalid pack cannot be saved; changing a market flag updates the preview; the precedence simulator shows the stricter layer winning for each conflict in PRD 32.5.

### S12. Hardening

- Accessibility audit with axe on every route, keyboard-only walkthroughs, right-to-left pass in Arabic, long-string stress mode, performance budgets (PRD 11.8, 15.18), responsive pass at 360 px, copy review against the terminology list, Playwright tests for the golden paths (sign-up to go-live, inbound message to booking, approval, campaign send, invite a teammate, admin stuck-tenant fix), and a demo script for each scenario.

## 11. Prompts for generation tools

### 11.1 Global rules block (paste at the start of every slice prompt)

```text
You are building a mock-first frontend in a pnpm monorepo (React 18, TypeScript strict, Vite, Tailwind with CSS-variable tokens, shadcn/ui, TanStack Router and Query, react-hook-form with zod, MSW with @mswjs/data).
Rules:
1. The product rules live in the PRD sections I reference. Do not invent behavior; if something is unclear, state your assumption in a short note at the end.
2. Contract-first: define zod schemas in packages/schemas, mock handlers validate against them, the UI only talks to the API client.
3. No raw colors, no hard-coded strings: use design tokens and i18n keys.
4. Every screen implements loading, empty, error and no-permission states, and respects the role matrix through PermissionGate.
5. AI content is always marked with the AI badge and a Why-this popover; every AI action has a manual equivalent.
6. Everything works at 360px, in dark mode, and in right-to-left.
7. Use the dev toolbar to expose scenario, role, language, AI mode, account state, market, network and data volume.
8. Keep components small and reusable; add a Storybook story for each shared component.
9. Use the real shadcn/ui components with real behavior: no gray placeholder boxes, lorem ipsum or static mockups. The interface must look modern and clean and be intuitive to a first-time user: one primary action per screen, plain labels, advanced options collapsed.
```

### 11.2 Slice prompt template

```text
[Global rules block]
Slice: <S#: name>
PRD sections (attached): <list>
Frontend spec sections (attached): 4 Design system, 5 Shells, 7 Components, 8 Mock data, 9 State matrix, and the slice card below.
Slice card: <paste the slice card>
Deliver: routes, components, hooks, schemas, MSW handlers, seed data, simulators, stories, and a short README with how to demo the acceptance checks.
Do not touch other slices except to extend shared components; list any shared component you changed.
```

### 11.3 Tips for using the tools

- Attach only the PRD sections a slice names; the full PRD is too long to be followed reliably in one prompt.
- Build shared components first (S0), then reuse them: when a slice needs something new and shared, add it to `packages/ui` and note it.
- After each slice, run the acceptance checks, then the screen review checklist from section 9, and fix before moving on.
- Keep one scenario (A. Amaka Braids) working end to end at all times; other scenarios are variations of the same data.

## 12. Definition of done (per slice)

- All screens in the slice built at fidelity Level 2 (Level 3 where stated) and reachable from the navigation.
- Acceptance checks pass; the screen review checklist is complete for every route.
- No raw colors or hard-coded strings; lint, type check and unit tests green.
- Storybook stories exist for new shared components, with all states.
- Axe reports no serious or critical issues; keyboard-only use works; 360 px verified.
- Works with the AI off, in dark mode and in right-to-left.
- The slice's Playwright path passes.
- README updated with the demo steps.

## 13. Open decisions

1. Decided: shadcn/ui, TanStack Router and MSW (with a repository layer over IndexedDB, section 8.6) are confirmed. The other defaults in section 3 stand unless changed.
2. Decided as a placeholder: working name Deskhand (section 4.9). Still to do: trademark and domain check, a proper logo, and final brand colors.
3. Calendar component: FullCalendar or a custom grid.
4. Decided: mock data persists in IndexedDB (section 8.6).
5. Which generation tool(s) will build the slices (for example Claude Code in the repo, or another UI generator), since that changes how much of the monorepo structure to prescribe.
6. Decided: the admin console ships as a separate app in the monorepo (section 3).

## 14. PRD coverage and alignment

This table is the check that the PRD and this document match. When the PRD changes, update the row here in the same sitting.

| PRD section | Covered in slice | Notes |
| --- | --- | --- |
| 5 Account and integration model, 5.5 channels | S1, S7 | Channel picker in onboarding; Connections hub |
| 6 Onboarding and activation | S1 | Includes the Manual only path and go-live gates |
| 9 Markets, localization, regions | S0, S8, S11 | Market switch in the dev toolbar; market pack editor |
| 10 Industry packs | S1 (install), S11 (studio) | Needs-your-input list after install |
| 11 Public surfaces (booking, widget, forms, payment, review, link hub, preference center, privacy page) | S3, S6, S9 | Public app in `apps/public`. S9: 11.4–11.9 |
| 12 Team, roles, permissions, 12.4 email invitations | S0 (gate), S1 (accept), S7 (manage) | Role matrix enforced by `PermissionGate` |
| 13 Billing, plans, metering | S7 (tenant), S10 (admin) | Usage and invoice simulators |
| 15.1 to 15.14 core features | S2 to S7 | Mapped by the screen specs in PRD 29 |
| 15.15 Voice AI | S4 (wizard), S2 (call conversations, stubbed) | Real telephony is not mocked |
| 15.16 API and webhooks | S7 (keys and webhook log screens) | The API itself is not built in the mock |
| 15.17 Import, export, migration | S2 (contacts import), S7 (data export) |  |
| 15.18 Mobile | S12 | Responsive web only; no native app |
| 15.19 Admin console | S10 | Separate app |
| 15.20 Landing pages and funnels | S6 |  |
| 15.21 Manual operation and AI-optional mode | S1, S2, S4 and every slice | AI Off mode in the dev toolbar |
| 27 Registration and account lifecycle | S1 | Account states in the dev toolbar |
| 28 Information architecture | S0, S2 | Navigation, banners, notification matrix |
| 29.1 to 29.3 Home, Inbox, Contacts | S2 |  |
| 29.4, 29.5, 29.18 Sales, Bookings, Tasks | S3 |  |
| 29.6 Pages and funnels | S6 |  |
| 29.7 to 29.9 AI employees, knowledge, approvals | S4 |  |
| 29.10 to 29.13 Automations, marketing, reputation, payments | S5 |  |
| 29.14 Reports | S6 |  |
| 29.15, 29.16 Settings and Connections | S7 | Includes saved replies and templates |
| 29.17 Forms and surveys | S5 | Survey mode is P2 |
| 30 Compliance and governance center | S8 |  |
| 31 Platform admin console | S10 | Separate app |
| 32 Configuration management | S11 |  |

**Not mocked (backend or operations only):** architecture and data model (PRD 18), non-functional requirements (16), quality and release strategy (17), dependencies and lead times (19), pricing assumptions (20), go-to-market (21), roadmap, risks and release criteria (22 to 24), and the compliance obligations themselves (8). The mock shows their effects on screen but does not implement them.
