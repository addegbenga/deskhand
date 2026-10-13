# Deskhand

Mock-first frontend for the product described in [`PRD.md`](./PRD.md), built slice by slice from [`FE-DOC.md`](./FE-DOC.md). The PRD wins on any conflict. "Deskhand" is the working brand name (`BRAND_NAME` in `packages/config`).

Current state: **S0–S9** are done (foundation through public surfaces). S10 (platform admin) has not started.

## Run it

Requirements: Node 22+, pnpm 11.

```bash
pnpm install
pnpm dev            # all three apps behind one gateway
```

| App | URL |
| --- | --- |
| Tenant app | http://localhost:5170/ |
| Admin console | http://localhost:5170/admin/ |
| Public pages | http://localhost:5170/b/amaka-braids (index at `/_public/`) |

All apps share one origin through `scripts/dev-gateway.mjs`, so they share one mock service worker and one IndexedDB. A change made in one app (or another tab) shows up in the others. You can still run a single app on its own port with `pnpm dev:tenant`, `pnpm dev:admin` or `pnpm dev:public`.

Other scripts: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:vercel`, `pnpm storybook` (port 6006).

## Deploy on Vercel

One Vercel project serves all three apps on a single origin (same as the local gateway), so they share the mock API worker and IndexedDB.

1. Push this repo to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com/new), **Import** the repo.
3. Leave **Root Directory** as the repository root. Framework preset stays **Other** — `vercel.json` already sets install, build and output.
4. Deploy. Node 22 and pnpm 11 come from `.nvmrc` and `packageManager`.

After it is live:

| Surface | Path |
| --- | --- |
| Tenant app | `/` |
| Admin console | `/admin/` |
| Public booking demo | `/b/amaka-braids` |

Do not set `VITE_API_BASE_URL` unless a real backend exists; without it the mock API runs in the browser. Demo data lives in that browser’s IndexedDB, not on the server.

Local check of the same artifact: `pnpm build:vercel` then `npx serve dist`.

## Demo the S0 acceptance criteria

Open the wrench button (bottom corner) for the dev toolbar.

1. **Scenario, role, language and theme switch without a reload.** In the toolbar, change scenario (A Lagos salon, B manual-mode clinic, C London barber, D US realtor on trial, E brand-new account, F account in trouble). Then change role, language (English, French, Arabic in right-to-left) and theme. Navigation, badges, banners and permissions update in place.
2. **The shell renders for every role and viewport.** Switch roles and watch the sidebar follow PRD 28.1 (for example, Staff loses Automations, Compliance and Connections; Read-only keeps Reports but loses Inbox). Narrow the window to 360px for the bottom navigation and the "More" sheet.
3. **A demo page shows every state pattern.** Go to **Building blocks** (`/dev/states`). It has live empty, loading, error and no-permission states, plus offline, stale, PermissionGate, banners, every status chip, AI language and form controls.
4. **Lint blocks raw colors and hard-coded strings.** Run `pnpm lint`. `tests/lint.test.ts` proves the rules fire on hex colors, Tailwind palette and arbitrary colors, JSX text, and user-visible attributes.

Things worth trying:

- Set **Network** to Offline, Slow or 5% failures. Offline shows the offline banner, failures show error states with support codes and retries.
- Scenario **F** shows the banner region: past due, low WhatsApp quality, rejected template, expired calendar access, blocking compliance. Each banner has one fix button, shown only to roles that can fix it.
- Open the tenant app in two tabs and change account state in one. The other shows a "changed since you opened it" prompt instead of silently swapping data.
- In the admin console, switch **persona** to see navigation follow PRD 31.1. Click **Personal data masked** to reveal with a reason (the server masks the data until then). Turn on **Support session** in the toolbar to see the red impersonation banner.

## Demo S1: sign-up to go-live

Open http://localhost:5170/signup. Sign-up **replaces scenario E**. Reset E in the toolbar to restore the seeded Ife Cakes business at onboarding step 2.

1. **Create an account.** Use a real-looking email (not a disposable domain). Password needs 8+ characters and two character classes. Tick terms and “18+ / business”. Country without a live market pack (for example Canada) goes to the waitlist.
2. **Verify.** Any six-digit code works except `000000` (wrong code). The documented demo code is `123456`. A **Demo inbox** card shows the code. Resend is blocked for 60 seconds.
3. **Finish sign-up.** About you → business (try `ifecakes.ng` to prefill later) → plan (Starter, no card) → booking slug. Creating the workspace lands you on onboarding.
4. **AI path.** Profile (Read my page on `ifecakes.ng`) → goals → teach the AI (confirm prices and FAQs) → connect a channel (WhatsApp templates wait ~20s, or use **Approve WhatsApp templates** in the toolbar) → services → create Ada (or another name) → compliance → sandbox (run tests, mark right; unknown price, angry and off-topic are required) → handoff test → **Go live in Suggest mode**. Gates stay red until each is satisfied.
5. **Manual only path.** On Teach the AI, choose **Skip, run manually**, or pick **Manual only for now** on the AI employee step. Knowledge, sandbox and handoff drop out. Go-live still needs a channel and compliance.
6. **Resume.** Save and exit mid-wizard, then open `/` or the setup pill. Progress comes back. Sign-up itself also resumes if you leave before the workspace exists.
7. **Login and recovery.** Seeded people (for example `amaka.obi@amakabraids.com`) accept any password. Forgot-password and magic-link emails appear in the demo inbox. Invite tokens: `/invite/join-amaka-braids` (pending), `/invite/expired-invite`, `/invite/revoked-invite`.

## Demo S2: Home, Inbox, Contacts

Open scenario **A** (Amaka Braids) at http://localhost:5170/app/home. Reset A in the toolbar if you have been exploring.

1. **Home.** Attention cards, today’s bookings and tasks, results with sparklines, Ada’s activity and dismissible suggestions. Switch the toolbar to **Manual only** (or scenario B) — AI activity and suggestions disappear; inbox and contacts still work.
2. **Live inbox.** Open Inbox. Use **Simulate inbound message** in the toolbar (or wait 20–60s). Unread badge updates. Open a thread: AI, human, notes and system events share one timeline. Take over / hand back. Accept or edit a suggested reply on the first Amaka thread when AI is on.
3. **WhatsApp window.** Open the conversation whose list row does not show an open window (seeded as conversation 2 on WhatsApp). The composer offers **templates only**. Sending free text is blocked until you pick an approved template.
4. **Opt-out.** Find the opted-out contact (third seeded contact, conversation 3). Sending is blocked with a reason. Internal notes still work.
5. **AI off.** Scenario B or toolbar AI mode **Manual only**: no AI badges, drafts or take-over. Composer, assignment, snooze and close still work. Read-only can open threads but cannot send.
6. **Contacts.** List, add, bulk tag, export (Owner/Admin). Open a contact for Consent and AI memory tabs. **Duplicates** merges by phone (undo window is 30 days in the mock). **Import** a CSV with the consent box ticked; Undo import for 7 days.
7. **360px.** Home, Inbox (list then thread) and Contacts stay usable. Keyboard in Inbox: `j`/`k` next/previous, `e` assign to me, `s` snooze, `c` close, `/` composer.

## Demo S3: Sales, Bookings, public booking

Open scenario **A** (Amaka Braids). Reset A in the toolbar if needed.

1. **Sales.** `/app/sales/leads` — table of potential customers. **Create deal** on a working lead. `/app/sales/pipeline` is the kanban of those deals only. `/app/sales/opportunities` is the same records as a value table. A price enquiry is a lead, not a deal.
2. **Bookings.** `/app/bookings` — day grid with staff columns. Drag a booking to another hour to reschedule. Open a chip for complete / no-show / cancel. **New booking** picks a live slot. Change **location timezone** in the dropdown; times on this screen and on the public page follow it.
3. **Services / staff / page.** `/app/services`, `/app/staff`, `/app/booking-page`. Toggle visibility. Open the public link.
4. **Public book.** http://localhost:5170/b/amaka-braids — service → staff → slot (5-minute hold with countdown) → details → deposit if the service needs one → confirmation and manage link. Open the same slot in a second tab after holding: it should fail with a clash. Wait out the hold (or jump the toolbar clock) and the slot comes back.
5. **Double book.** Two tabs, same slot, two holds: the second gets a conflict. After the hold expires, the slot is free again.
6. **Tasks.** `/app/tasks` — My / Team / Today / Overdue. Create and complete. AI-created tasks show a Why this? when AI is on.
7. **Embeds.** From booking page settings, Inline / Popup / Floating demos.

## Demo S4: AI employees

Open scenario **A** (Amaka Braids). Reset A in the toolbar if needed.

1. **List.** `/app/ai/employees` — Ada (live chat) and Ada Voice (draft). Open Ada.
2. **Tier C.** Persona tab: Yoruba is Tier C. On Skills, try Autopilot for a language or go-live with Autopilot in the chat wizard — it is blocked.
3. **Unverified price.** Test tab → **Unverified price**. The sandbox must not say ₦35,000 for knotless braids (that item is unverified). Cornrows at ₦15,000 is verified and may be quoted.
4. **Autonomy.** Raise Book appointments to Autopilot: the form asks for a reason and the Versions tab gains a new entry.
5. **Kill switch.** Pause this employee — the banner appears immediately and the sandbox says it is paused. Resume.
6. **Knowledge.** `/app/ai/knowledge` — verify the placeholder price, or add a Needs training answer.
7. **Approvals.** `/app/ai/approvals` — approve, edit then approve, or reject with a reason. Bulk-approve works.
8. **Activity.** `/app/ai/activity` — log plus transcript sample ratings.
9. **Wizards.** `/app/ai/new/chat` (9 steps) and `/app/ai/new/voice` (outbound options hidden for Nigeria).

## Demo S5: Automations, marketing, reputation, payments

Open scenario **A**. Reset A if the seed is stale (this slice is seed version 6).

1. **Recipes.** `/app/automations` — Instant lead response. Open it. Test with `con_A_1` (allowed) then `con_A_6` (no WhatsApp consent — blocked).
2. **Campaign check.** `/app/marketing/campaigns` — open Saturday fill → **Check before send**. The panel lists excluded counts (consent, opt-out, quiet hours) and why.
3. **Templates.** `/app/marketing/templates` — pending Weekend promo; toolbar **Resolve pending message templates** approves or rejects it.
4. **Review reward.** `/app/reputation/requests` — wording that offers a gift/voucher is rejected. Honest wording saves.
5. **Reviews.** `/app/reputation/reviews` — 2-star needs a reply; use the AI draft. Toolbar **Simulate a new review**.
6. **Payments.** `/app/payments/links` — create a deposit link (Owner). `/app/payments/list` then toolbar **Simulate a payment webhook**.
7. **Forms.** `/app/marketing/forms` — palette, preview, consent field, responses.

## Demo S6: Reports and pages

Open scenario **A**. Reset A (seed version 7).

1. **Overview.** `/app/reports/overview` — every number has an info tooltip with its definition.
2. **Filters.** Change **Last 7 days** / **Last 90 days**. Switch location in the top bar. Every card updates.
3. **Export / digest.** Export CSV. Owner can save a weekly email digest.
4. **Pages.** `/app/pages` — open the published bridal offer. Funnel shows drop-off. Publish dialog has SEO fields.
5. **Public.** http://localhost:5170/p/amaka-braids-offer — consent checkbox, booking embed, Powered by footer. A prompt with “guaranteed cheapest” is blocked.

## Demo S7: Settings, connections, team, billing

Open scenario **A**. Reset A (seed version 8).

1. **Invite.** `/app/settings/team` — send `ada.okonkwo@gmail.com, x@mailinator.com, not-an-email`. Results: sent / blocked / invalid. Open the mailbox for Ada and accept at `/invite/{token}` as staff.
2. **Join requests.** Approve Ifeoma. Bulk extra addresses after filling seats show **No seats left** and the upgrade prompt.
3. **Connections.** `/app/connections` — Email needs DNS. **Fix** turns it green. **Test** on WhatsApp.
4. **Usage.** `/app/settings/usage` — emails at the cap; **Simulate hitting a limit** then upgrade from Billing.
5. **Close.** `/app/settings/data` — export first, then type `Amaka Braids` to close.

## Demo S8: Compliance and governance

Open scenario **A**. Reset A (seed version 9).

1. **Overview.** `/app/compliance/overview` — checklist comes from the NG market pack (includes NDPC registration). Preview **UK** then **US** in the selector: UK adds marketing opt-in, US adds all-party recording, and the consent wording / DSR days change without a code change.
2. **Blocking Autopilot.** Unverify disclosure (edit the wording, which clears verification). Overview shows **Blocking go-live**. On `/app/ai/employees` raising Book to Autopilot is refused with that reason. Run **Run a verification test** then Autopilot works again.
3. **SLA.** `/app/compliance/requests` — one request is due in hours (**Escalated**), one is overdue.

Scenario **F** seeds a blocking disclosure from the start.

## Demo S9: Public surfaces

Open scenario **A**. Reset A (seed version 11).

1. **Widget.** http://localhost:5170/embed/demo — open the bubble, leave a name and phone, ask about braids. **Create deal** is not this screen; a phone number becomes a contact. Try `Widget.open()` / `Widget.identify()` (also `DeskhandWidget`). Narrow to 360px: chat is full screen.
2. **Form.** http://localhost:5170/f/frm_A_lead — submit with consent. Popup copy lives on the demo page.
3. **Pay.** http://localhost:5170/pay/plink_A_1 — pay the deposit, then see a receipt.
4. **Review.** http://localhost:5170/r/amaka-braids — one Google button, no star filter.
5. **Hub and QR.** http://localhost:5170/l/amaka-braids — Book / WhatsApp / Call. http://localhost:5170/l/BIO records a click and opens WhatsApp. Print a poster from `/app/marketing/links`.
6. **Preferences.** http://localhost:5170/preferences/pref-amaka-braids — toggles write the consent ledger; **Unsubscribe from all**.
7. **Privacy.** http://localhost:5170/privacy/amaka-braids — submit, then code `123456`. The request appears on `/app/compliance/requests`.

## Layout

```
apps/
  tenant/        customer workspace (port 5173)
  admin/         internal console, base /admin/ (port 5174)
  public/        booking pages and other public surfaces, base /_public/ (port 5175)
packages/
  schemas/       zod contracts, permission matrix, nav visibility, typed API client
  config/        brand name, market packs
  i18n/          i18next + ICU, en/fr/ar resources, locale-aware formatters
  ui/            tokens, Tailwind theme, components, Storybook
  mock-api/      MSW handlers over IndexedDB (Dexie), seed scenarios, dev toolbar
scripts/dev-gateway.mjs
tests/           cross-package tests (lint guardrails)
```

Swapping the mock for a real backend is a base-URL change: set `VITE_API_BASE_URL` and the apps skip MSW.

## Decisions and deviations

- **Light `--attention` is `#b45309`** instead of the FE-DOC starting value, to reach AA contrast for text on light surfaces.
- **Dexie over IndexedDB** backs the mock instead of `@mswjs/data`. It gives per-scenario databases, snapshots, export and import, and cross-tab change events through BroadcastChannel.
- **Single-origin dev gateway** so the three apps share the MSW worker (served at `/mockServiceWorker.js` with scope `/`) and the mock database.
- **Admin PII masking happens in the mock server.** Masked values never reach the browser until a logged, time-limited reveal.
- **Public pages resolve any demo business** by slug, not only the scenario selected in the toolbar.
- Pinned majors: React 18.3, TypeScript 5.9, Vite 7, TanStack Router/Query, Zod 4, MSW 2, Tailwind 4, i18next 25, Storybook 9.

## Open items

- Arabic uses the system font fallback (Inter has no Arabic glyphs). Add an Arabic face such as Noto Sans Arabic before shipping Arabic.
- French and Arabic copy is a first pass for layout and right-to-left testing, not a reviewed translation.
- Scenario G (agency workspace switcher) is defined but disabled until the workspace switcher is built.
