import { http } from 'msw'
import {
  DigestPatchSchema,
  DigestSettingsSchema,
  PageVersionListSchema,
  PublicLandingSchema,
  PublishPageSchema,
  ReportExportSchema,
  ReportIdSchema,
  ReportRangeSchema,
  ReportViewSchema,
  SitePageListSchema,
  SitePageSchema,
  SitePageWriteSchema,
  canSeeArea,
  type DigestSettings,
  type Session,
  type SitePage,
} from '@deskhand/schemas'
import { now } from '../clock'
import { buildReportCards, pageClaimsBlocked, windowRows } from '../insight-rules'
import { json, MockHttpError, parseBody, route } from '../http'
import { db, write } from '../store'
import { loadSession } from './tenant'
import { SCENARIOS } from '../scenarios'
import { ensureSeeded } from '../store'
import { waHref } from '../public-account'
import type { Account } from '@deskhand/schemas'
import type { MockDb } from '../db'

const API = '/api'
const DEFAULT_DIGEST: DigestSettings = { enabled: false, channel: 'email', cadence: 'weekly' }

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function actor(session: Session) {
  return { kind: 'person' as const, id: session.user.id, name: session.user.name }
}

async function requireReports(session: Session) {
  if (!canSeeArea(session.membership.role, 'reports')) throw new MockHttpError('forbidden', 'Your role cannot do this.')
}

async function requirePages(session: Session) {
  if (!canSeeArea(session.membership.role, 'marketing')) throw new MockHttpError('forbidden', 'Your role cannot do this.')
}

function defaultBlocks(title: string, body: string): SitePage['blocks'] {
  return [
    { id: 'hero', type: 'hero', heading: title, body, cta: 'Book a slot' },
    { id: 'form', type: 'form', heading: 'Get in touch', body: 'We only use this to reply to you.', cta: 'Send' },
    { id: 'booking', type: 'booking', heading: 'Book', body: 'Pick a time that works.', cta: 'Open booking' },
    { id: 'footer', type: 'footer', heading: title, body: '', cta: '' },
  ]
}

export const insightHandlers = [
  http.get(
    `${API}/reports/digest`,
    route(async () => {
      const session = await loadSession()
      await requireReports(session)
      const row = await (await db()).meta.get('reportDigest')
      return json(DigestSettingsSchema, row?.value ? DigestSettingsSchema.parse(row.value) : DEFAULT_DIGEST)
    }),
  ),

  http.patch(
    `${API}/reports/digest`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireReports(session)
      if (!['owner', 'admin'].includes(session.membership.role)) throw new MockHttpError('forbidden', 'Your role cannot do this.')
      const patch = await parseBody(request, DigestPatchSchema)
      return write(['reports'], async (database) => {
        const current = DigestSettingsSchema.parse((await database.meta.get('reportDigest'))?.value ?? DEFAULT_DIGEST)
        const next = { ...current, ...patch }
        await database.meta.put({ key: 'reportDigest', value: next })
        return json(DigestSettingsSchema, next)
      })
    }),
  ),

  http.get(
    `${API}/reports/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireReports(session)
      const id = ReportIdSchema.parse(String(params.id))
      const url = new URL(request.url)
      const range = ReportRangeSchema.parse(url.searchParams.get('range') ?? '30d')
      const locationId = url.searchParams.get('locationId') || null
      const allowed = new Set(session.locations.map((item) => item.id))
      const database = await db()
      const rows = (await database.dailyMetrics.toArray()).filter(
        (row) => allowed.has(row.locationId) && (!locationId || row.locationId === locationId),
      )
      const endDay = now().toISOString().slice(0, 10)
      const { current, previous } = windowRows(rows, range, endDay)
      const staffScale = session.membership.role === 'staff' ? 0.4 : 1
      return json(ReportViewSchema, {
        id,
        range,
        locationId,
        generatedAt: now().toISOString(),
        freshnessMinutes: 4,
        cards: buildReportCards(id, current, previous, staffScale),
      })
    }),
  ),

  http.get(
    `${API}/reports/:id/export`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireReports(session)
      if (!['owner', 'admin', 'manager'].includes(session.membership.role)) {
        throw new MockHttpError('forbidden', 'Your role cannot do this.')
      }
      const id = ReportIdSchema.parse(String(params.id))
      const url = new URL(request.url)
      const range = ReportRangeSchema.parse(url.searchParams.get('range') ?? '30d')
      const locationId = url.searchParams.get('locationId') || null
      const allowed = new Set(session.locations.map((item) => item.id))
      const rows = (await (await db()).dailyMetrics.toArray()).filter(
        (row) => allowed.has(row.locationId) && (!locationId || row.locationId === locationId),
      )
      const { current, previous } = windowRows(rows, range, now().toISOString().slice(0, 10))
      const cards = buildReportCards(id, current, previous, 1)
      const csv = ['metric,value,previous', ...cards.map((card) => `${card.id},${card.value},${card.previous}`)].join('\n')
      return json(ReportExportSchema, { filename: `${id}-${range}.csv`, csv })
    }),
  ),

  http.get(
    `${API}/pages`,
    route(async () => {
      const session = await loadSession()
      await requirePages(session)
      return json(SitePageListSchema, await (await db()).sitePages.toArray())
    }),
  ),

  http.post(
    `${API}/pages`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requirePages(session)
      const body = await parseBody(request, SitePageWriteSchema)
      const prompt = body.prompt ?? ''
      if (pageClaimsBlocked(`${body.title ?? ''} ${prompt}`)) {
        throw new MockHttpError('validation_failed', 'That draft uses a claim we cannot publish.', { fieldErrors: { prompt: ['banned'] } })
      }
      return write(['pages'], async (database) => {
        const title = body.title ?? (prompt ? prompt.slice(0, 48) : 'Untitled page')
        const slug = (body.slug ?? title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || localId('page')
        const page: SitePage = {
          id: localId('pg'),
          accountId: session.account.id,
          title,
          slug,
          status: 'draft',
          template: body.template ?? 'salon',
          language: body.language ?? 'en',
          seoTitle: body.seoTitle ?? title,
          seoDescription: body.seoDescription ?? prompt.slice(0, 140),
          indexable: body.indexable ?? true,
          domain: body.domain ?? null,
          visits: 0,
          conversions: 0,
          blocks: body.blocks ?? defaultBlocks(title, prompt || 'Tell people what you offer and how to book.'),
          funnel: [
            { id: 's1', kind: 'landing', label: 'Landing', visits: 0, completed: 0 },
            { id: 's2', kind: 'form', label: 'Form', visits: 0, completed: 0 },
            { id: 's3', kind: 'booking', label: 'Booking', visits: 0, completed: 0 },
            { id: 's4', kind: 'payment', label: 'Deposit', visits: 0, completed: 0 },
          ],
          publishedAt: null,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.sitePages.add(page)
        return json(SitePageSchema, page, 201)
      })
    }),
  ),

  http.get(
    `${API}/pages/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requirePages(session)
      const page = await (await db()).sitePages.get(String(params.id))
      if (!page) throw new MockHttpError('not_found', 'Page not found.')
      return json(SitePageSchema, page)
    }),
  ),

  http.patch(
    `${API}/pages/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requirePages(session)
      const patch = await parseBody(request, SitePageWriteSchema)
      const { prompt, ...fields } = patch
      if (pageClaimsBlocked(`${fields.title ?? ''} ${prompt ?? ''} ${(fields.blocks ?? []).map((b) => b.body).join(' ')}`)) {
        throw new MockHttpError('validation_failed', 'That draft uses a claim we cannot publish.', { fieldErrors: { prompt: ['banned'] } })
      }
      return write(['pages'], async (database) => {
        const page = await database.sitePages.get(String(params.id))
        if (!page) throw new MockHttpError('not_found', 'Page not found.')
        const updated = { ...page, ...fields }
        await database.sitePages.put(updated)
        await database.pageVersions.add({
          id: localId('pv'),
          accountId: page.accountId,
          pageId: page.id,
          number: (await database.pageVersions.where('pageId').equals(page.id).count()) + 1,
          summary: 'Autosave',
          snapshot: updated,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        })
        return json(SitePageSchema, updated)
      })
    }),
  ),

  http.post(
    `${API}/pages/:id/publish`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requirePages(session)
      const seo = await parseBody(request, PublishPageSchema)
      return write(['pages'], async (database) => {
        const page = await database.sitePages.get(String(params.id))
        if (!page) throw new MockHttpError('not_found', 'Page not found.')
        const updated: SitePage = {
          ...page,
          ...seo,
          status: 'published',
          publishedAt: now().toISOString(),
        }
        await database.sitePages.put(updated)
        return json(SitePageSchema, updated)
      })
    }),
  ),

  http.post(
    `${API}/pages/:id/unpublish`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requirePages(session)
      return write(['pages'], async (database) => {
        const page = await database.sitePages.get(String(params.id))
        if (!page) throw new MockHttpError('not_found', 'Page not found.')
        const updated: SitePage = { ...page, status: 'draft', publishedAt: null }
        await database.sitePages.put(updated)
        return json(SitePageSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/pages/:id/versions`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requirePages(session)
      const rows = (await (await db()).pageVersions.toArray()).filter((row) => row.pageId === String(params.id))
      return json(PageVersionListSchema, rows)
    }),
  ),

  http.post(
    `${API}/pages/:id/restore/:versionId`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requirePages(session)
      return write(['pages'], async (database) => {
        const version = await database.pageVersions.get(String(params.versionId))
        if (!version || version.pageId !== String(params.id)) throw new MockHttpError('not_found', 'Version not found.')
        const restored = { ...version.snapshot, id: version.pageId, status: 'draft' as const, publishedAt: null }
        await database.sitePages.put(restored)
        return json(SitePageSchema, restored)
      })
    }),
  ),

  http.get(
    `${API}/public/pages/:slug`,
    route(async ({ params }) => {
      const slug = String(params.slug)
      let found: { database: MockDb; account: Account; page: SitePage } | null = null
      for (const scenario of Object.values(SCENARIOS).filter((item) => item.available)) {
        const database = await ensureSeeded(scenario.id)
        const page = (await database.sitePages.toArray()).find((item) => item.slug === slug && item.status === 'published')
        const account = await database.accounts.toCollection().first()
        if (page && account) {
          found = { database, account, page }
          break
        }
      }
      if (!found) throw new MockHttpError('not_found', 'This page does not exist.')
      const location = await found.database.locations.where('accountId').equals(found.account.id).first()
      const form = (await found.database.forms.toArray()).find((item) => item.status === 'live')
      return json(PublicLandingSchema, {
        page: found.page,
        business: found.account.name,
        brandColor: found.account.brandColor,
        showPoweredBy: found.account.showPoweredBy,
        bookingSlug: found.account.slug,
        privacyHref: `/privacy/${found.account.slug}`,
        languages: ['en', 'fr', 'ar'],
        city: location?.city ?? '',
        formId: form?.id ?? null,
        whatsappHref: waHref(location?.phone),
      })
    }),
  ),
]
