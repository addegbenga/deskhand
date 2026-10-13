import { http } from 'msw'
import {
  CampaignCheckSchema,
  CampaignListSchema,
  CampaignSchema,
  CampaignWriteSchema,
  FormListSchema,
  FormResponseListSchema,
  FormSchema,
  FormWriteSchema,
  PaymentLinkListSchema,
  PaymentLinkSchema,
  PaymentLinkWriteSchema,
  PaymentListSchema,
  PaymentsOverviewSchema,
  PlannerListSchema,
  PlannerPatchSchema,
  PlannerPostSchema,
  RecipeListSchema,
  RecipePackListSchema,
  RecipePatchSchema,
  RecipeSchema,
  RecipeTestResultSchema,
  RecipeTestSchema,
  RecipeWriteSchema,
  ReviewInsightsSchema,
  ReviewListSchema,
  ReviewRecordSchema,
  ReviewReplySchema,
  ReviewSettingsPatchSchema,
  ReviewSettingsSchema,
  TemplatePatchSchema,
  TemplateWriteSchema,
  TrackLinkListSchema,
  TrackLinkSchema,
  TrackLinkWriteSchema,
  WorkflowRunListSchema,
  canSeeArea,
  type Campaign,
  type FormDef,
  type PaymentLink,
  type PlannerPost,
  type Recipe,
  type ReviewRecord,
  type ReviewSettings,
  type Session,
  type TrackLink,
} from '@deskhand/schemas'
import { MessageTemplateSchema } from '@deskhand/schemas'
import { now } from '../clock'
import { channelConsent, checkCampaign, DEFAULT_REVIEW_SETTINGS, reviewSettingsHaveReward } from '../grow-rules'
import { json, MockHttpError, parseBody, requireCapability, route } from '../http'
import { RECIPE_PACKS } from '../recipe-packs'
import { activityByContact, applyContactFilters } from './contacts'
import { db, write } from '../store'
import { loadSession } from './tenant'

const API = '/api'

async function campaignAudience(listId: string | null | undefined) {
  const database = await db()
  const contacts = await database.contacts.toArray()
  if (!listId) return contacts
  const saved = await database.smartLists.get(listId)
  if (!saved) return contacts
  return applyContactFilters(contacts, saved.filters, await activityByContact())
}

function hydrateForm(form: FormDef): FormDef {
  return FormSchema.parse({
    ...form,
    thankYou: form.thankYou ?? 'Thanks — we will be in touch shortly.',
    redirectUrl: form.redirectUrl ?? null,
    successAction: form.successAction ?? 'message',
    allowedOrigins: form.allowedOrigins ?? [],
    notifyStaff: form.notifyStaff ?? true,
    spamProtection: form.spamProtection ?? true,
    fields: form.fields.map((field) => ({
      ...field,
      placeholder: field.placeholder ?? '',
      help: field.help ?? '',
    })),
  })
}

const DEFAULT_FORM_FIELDS = [
  { id: 'name', type: 'short_text' as const, label: 'Your name', required: true, options: [], showIf: null, placeholder: '', help: '' },
  {
    id: 'consent',
    type: 'consent' as const,
    label: 'You may contact me about this form',
    required: true,
    options: [],
    showIf: null,
    placeholder: '',
    help: '',
  },
]

function localId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}

function actor(session: Session) {
  return { kind: 'person' as const, id: session.user.id, name: session.user.name }
}

async function requireArea(session: Session, area: 'automations' | 'marketing' | 'reputation' | 'payments') {
  if (!canSeeArea(session.membership.role, area)) {
    throw new MockHttpError('forbidden', 'Your role cannot do this.')
  }
}

const PACK_BY_GOAL: Record<Recipe['goal'], Recipe['packKey']> = {
  respond: 'instant_lead',
  follow_up: 'noreply',
  book: 'book_slots',
  remind: 'remind',
  review: 'review',
  win_back: 'win_back',
}

function hydrateRecipe(row: Recipe): Recipe {
  return {
    ...row,
    packKey: row.packKey ?? PACK_BY_GOAL[row.goal] ?? 'instant_lead',
    stopOnBook: row.stopOnBook ?? true,
    stopOnConvert: row.stopOnConvert ?? true,
    stopOnOptOut: row.stopOnOptOut ?? true,
    onlyIfNoReply: row.onlyIfNoReply ?? false,
  }
}

async function loadSettings(database: Awaited<ReturnType<typeof db>>): Promise<ReviewSettings> {
  const row = await database.meta.get('reviewSettings')
  if (row?.value) return ReviewSettingsSchema.parse(row.value)
  return DEFAULT_REVIEW_SETTINGS
}

export const growHandlers = [
  http.get(
    `${API}/recipes`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      return json(RecipeListSchema, (await (await db()).recipes.toArray()).map(hydrateRecipe))
    }),
  ),

  http.get(
    `${API}/recipe-packs`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      return json(RecipePackListSchema, RECIPE_PACKS)
    }),
  ),

  http.post(
    `${API}/recipes`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      const body = await parseBody(request, RecipeWriteSchema)
      const pack = RECIPE_PACKS.find((item) => item.key === body.packKey)
      if (!pack) throw new MockHttpError('not_found', 'That pack recipe is not available.')
      return write(['recipes', 'templates', 'employees'], async (database) => {
        const templates = await database.templates.toArray()
        const channels = body.channels ?? pack.channels
        const template =
          (body.templateId ? templates.find((item) => item.id === body.templateId) : undefined) ??
          templates.find((item) => item.channel === channels[0] && item.status === 'approved') ??
          templates.find((item) => item.channel === channels[0])
        const employees = await database.employees.toArray()
        const row: Recipe = {
          id: localId('rec'),
          accountId: session.account.id,
          packKey: pack.key,
          goal: pack.goal,
          name: body.name?.trim() || pack.name,
          description: pack.description,
          expected: pack.expected,
          requiredConnections: pack.requiredConnections,
          enabled: false,
          enrolled: 0,
          completed: 0,
          replied: 0,
          converted: 0,
          lastRunAt: null,
          error: null,
          delayHours: pack.delayHours,
          channels,
          stopOnReply: pack.stopOnReply,
          stopOnBook: pack.stopOnBook,
          stopOnConvert: pack.stopOnConvert,
          stopOnOptOut: pack.stopOnOptOut,
          onlyIfNoReply: pack.onlyIfNoReply,
          quietHours: pack.quietHours,
          employeeId: body.employeeId === undefined ? (employees[0]?.id ?? null) : body.employeeId,
          templateId: template?.id ?? null,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.recipes.add(row)
        return json(RecipeSchema, row, 201)
      })
    }),
  ),

  http.get(
    `${API}/recipes/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      const recipe = await (await db()).recipes.get(String(params.id))
      if (!recipe) throw new MockHttpError('not_found', 'Recipe not found.')
      return json(RecipeSchema, hydrateRecipe(recipe))
    }),
  ),

  http.patch(
    `${API}/recipes/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      const patch = await parseBody(request, RecipePatchSchema)
      return write(['recipes'], async (database) => {
        const recipe = await database.recipes.get(String(params.id))
        if (!recipe) throw new MockHttpError('not_found', 'Recipe not found.')
        const updated: Recipe = { ...recipe, ...patch }
        await database.recipes.put(updated)
        return json(RecipeSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/recipes/:id/runs`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      const runs = (await (await db()).workflowRuns.toArray()).filter((run) => run.recipeId === String(params.id))
      return json(WorkflowRunListSchema, runs)
    }),
  ),

  http.post(
    `${API}/recipes/:id/test`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'automations')
      const { contactId } = await parseBody(request, RecipeTestSchema)
      return write(['recipes', 'workflowRuns', 'contacts'], async (database) => {
        const recipe = await database.recipes.get(String(params.id))
        const contact = await database.contacts.get(contactId)
        if (!recipe || !contact) throw new MockHttpError('not_found', 'Recipe or contact not found.')
        const channel = recipe.channels[0]
        if (!channel) throw new MockHttpError('validation_failed', 'This recipe has no channel.')
        const consent = channelConsent(contact, channel)
        if (consent !== 'ok') {
          throw new MockHttpError('validation_failed', 'This recipe cannot use a channel the contact has not agreed to.', {
            fieldErrors: { channel: [channel] },
          })
        }
        const stamp = now()
        const stops = [
          recipe.stopOnReply && 'reply',
          recipe.stopOnBook && 'book',
          recipe.stopOnConvert && 'convert',
          recipe.stopOnOptOut && 'opt-out',
        ].filter((item): item is string => Boolean(item))
        const steps = [
          { at: stamp.toISOString(), label: 'Enrolled (test)', result: 'ok' },
          ...(recipe.onlyIfNoReply
            ? [{ at: stamp.toISOString(), label: 'Condition: only if no reply', result: 'ok' }]
            : []),
          ...(recipe.quietHours ? [{ at: stamp.toISOString(), label: 'Quiet hours', result: 'would_respect' }] : []),
          ...recipe.delayHours.map((hours, index) => ({
            at: new Date(stamp.getTime() + hours * 60 * 60 * 1000).toISOString(),
            label: hours === 0 ? `${channel} would send now` : `${channel} would send after ${hours}h (step ${index + 1})`,
            result: 'skipped_test',
          })),
          {
            at: stamp.toISOString(),
            label: stops.length ? `Would stop on ${stops.join(', ')}` : 'No stop conditions',
            result: 'ok',
          },
        ]
        const run = {
          id: localId('run'),
          accountId: recipe.accountId,
          recipeId: recipe.id,
          contactId: contact.id,
          contactName: `${contact.firstName} ${contact.lastName}`,
          testMode: true,
          stoppedReason: null,
          steps,
          createdAt: stamp.toISOString(),
          createdBy: actor(session),
        }
        await database.workflowRuns.add(run)
        await database.recipes.update(recipe.id, { lastRunAt: run.createdAt, error: null })
        return json(RecipeTestResultSchema, { run, channel })
      })
    }),
  ),

  http.get(
    `${API}/planner`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      return json(PlannerListSchema, await (await db()).plannerPosts.toArray())
    }),
  ),

  http.post(
    `${API}/planner/:id/approve`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      requireCapability(session, 'publishing.approve')
      return write(['planner'], async (database) => {
        const post = await database.plannerPosts.get(String(params.id))
        if (!post) throw new MockHttpError('not_found', 'Post not found.')
        const updated: PlannerPost = { ...post, status: 'approved' }
        await database.plannerPosts.put(updated)
        return json(PlannerPostSchema, updated)
      })
    }),
  ),

  http.patch(
    `${API}/planner/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      requireCapability(session, 'publishing.approve')
      const patch = await parseBody(request, PlannerPatchSchema)
      return write(['planner'], async (database) => {
        const post = await database.plannerPosts.get(String(params.id))
        if (!post) throw new MockHttpError('not_found', 'Post not found.')
        const updated: PlannerPost = { ...post, ...patch }
        await database.plannerPosts.put(updated)
        return json(PlannerPostSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/campaigns`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      return json(CampaignListSchema, await (await db()).campaigns.toArray())
    }),
  ),

  http.post(
    `${API}/campaigns`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const body = await parseBody(request, CampaignWriteSchema)
      return write(['campaigns'], async (database) => {
        const contacts = await campaignAudience(body.listId)
        const campaign: Campaign = {
          id: localId('cmp'),
          accountId: session.account.id,
          name: body.name,
          channel: body.channel,
          templateId: body.templateId,
          listId: body.listId ?? null,
          status: 'draft',
          audienceSize: contacts.length,
          delivered: 0,
          replies: 0,
          bookings: 0,
          revenue: 0,
          optOuts: 0,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.campaigns.add(campaign)
        return json(CampaignSchema, campaign, 201)
      })
    }),
  ),

  http.post(
    `${API}/campaigns/:id/check`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const database = await db()
      const campaign = await database.campaigns.get(String(params.id))
      if (!campaign) throw new MockHttpError('not_found', 'Campaign not found.')
      const template = await database.templates.get(campaign.templateId)
      const contacts = await campaignAudience(campaign.listId)
      const check = checkCampaign(contacts, template, campaign.channel)
      await write(['campaigns'], (d) => d.campaigns.update(campaign.id, { status: check.canSend ? 'checked' : 'draft', audienceSize: check.audience }))
      return json(CampaignCheckSchema, check)
    }),
  ),

  http.post(
    `${API}/campaigns/:id/send`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      requireCapability(session, 'publishing.approve')
      return write(['campaigns'], async (database) => {
        const campaign = await database.campaigns.get(String(params.id))
        if (!campaign) throw new MockHttpError('not_found', 'Campaign not found.')
        const template = await database.templates.get(campaign.templateId)
        const contacts = await campaignAudience(campaign.listId)
        const check = checkCampaign(contacts, template, campaign.channel)
        if (!check.canSend) {
          throw new MockHttpError('validation_failed', 'Fix exclusions and template approval before sending.', {
            fieldErrors: { send: ['not_ready'] },
          })
        }
        const bookings = Math.max(1, Math.round(check.sendable * 0.06))
        const updated: Campaign = {
          ...campaign,
          status: 'sent',
          delivered: check.sendable,
          audienceSize: check.audience,
          replies: Math.round(check.sendable * 0.22),
          bookings,
          revenue: bookings * 25000,
          optOuts: check.excludedOptOut,
        }
        await database.campaigns.put(updated)
        if (template) {
          await database.templates.put({ ...template, usageCount: template.usageCount + 1 })
        }
        return json(CampaignSchema, updated)
      })
    }),
  ),

  http.post(
    `${API}/templates`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const body = await parseBody(request, TemplateWriteSchema)
      return write(['templates'], async (database) => {
        const footer =
          body.channel === 'email'
            ? `\n\n${session.account.name}\nUnsubscribe: http://localhost:5170/preferences/pref-${session.account.slug}`
            : ''
        const row = {
          id: localId('tpl'),
          accountId: session.account.id,
          name: body.name,
          language: body.language,
          body: `${body.body}${footer}`,
          status: 'draft' as const,
          channel: body.channel,
          rejectionReason: null,
          usageCount: 0,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.templates.add(row)
        return json(MessageTemplateSchema, row, 201)
      })
    }),
  ),

  http.patch(
    `${API}/templates/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const patch = await parseBody(request, TemplatePatchSchema)
      return write(['templates'], async (database) => {
        const template = await database.templates.get(String(params.id))
        if (!template) throw new MockHttpError('not_found', 'Template not found.')
        const updated = {
          ...template,
          ...patch,
          rejectionReason: patch.status === 'rejected' ? (template.rejectionReason ?? 'Rejected in review.') : patch.status === 'approved' ? null : template.rejectionReason,
        }
        await database.templates.put(updated)
        return json(MessageTemplateSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/links`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      return json(TrackLinkListSchema, await (await db()).trackLinks.toArray())
    }),
  ),

  http.post(
    `${API}/links`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const body = await parseBody(request, TrackLinkWriteSchema)
      return write(['links'], async (database) => {
        const code = localId('qr').replace('qr_', '').slice(0, 8).toUpperCase()
        const row: TrackLink = {
          id: localId('lnk'),
          accountId: session.account.id,
          label: body.label,
          href: `http://localhost:5170/l/${code}`,
          code,
          clicks: 0,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.trackLinks.add(row)
        return json(TrackLinkSchema, row, 201)
      })
    }),
  ),

  http.get(
    `${API}/reviews`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'reputation')
      const url = new URL(request.url)
      const rating = url.searchParams.get('rating')
      const topic = url.searchParams.get('topic')
      const status = url.searchParams.get('status')
      const source = url.searchParams.get('source')
      const locationId = url.searchParams.get('locationId')
      const reviews = (await (await db()).reviews.toArray()).filter((item) => {
        if (rating && item.rating !== Number(rating)) return false
        if (topic && !item.topics.includes(topic)) return false
        if (source && item.source !== source) return false
        if (locationId && item.locationId !== locationId) return false
        if (status === 'unanswered' && item.status === 'replied') return false
        if (status && status !== 'unanswered' && item.status !== status) return false
        return true
      })
      return json(ReviewListSchema, reviews)
    }),
  ),

  http.post(
    `${API}/reviews/:id/reply`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'reputation')
      requireCapability(session, 'publishing.approve')
      const body = await parseBody(request, ReviewReplySchema)
      return write(['reviews'], async (database) => {
        const review = await database.reviews.get(String(params.id))
        if (!review) throw new MockHttpError('not_found', 'Review not found.')
        const updated: ReviewRecord = { ...review, reply: body.reply, status: 'replied', repliedAt: now().toISOString() }
        await database.reviews.put(updated)
        return json(ReviewRecordSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/review-settings`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'reputation')
      return json(ReviewSettingsSchema, await loadSettings(await db()))
    }),
  ),

  http.patch(
    `${API}/review-settings`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'reputation')
      const patch = await parseBody(request, ReviewSettingsPatchSchema)
      if (patch.wording && reviewSettingsHaveReward(patch.wording)) {
        throw new MockHttpError('validation_failed', 'Request wording that offers a reward is blocked.', {
          fieldErrors: { wording: ['reward'] },
        })
      }
      return write(['reviews'], async (database) => {
        const current = await loadSettings(database)
        const next = { ...current, ...patch, wording: patch.wording ?? current.wording }
        await database.meta.put({ key: 'reviewSettings', value: next })
        return json(ReviewSettingsSchema, next)
      })
    }),
  ),

  http.get(
    `${API}/review-insights`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'reputation')
      const reviews = await (await db()).reviews.toArray()
      const average = reviews.length ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0
      const themes = Object.entries(
        reviews.reduce<Record<string, number>>((acc, item) => {
          for (const topic of item.topics) acc[topic] = (acc[topic] ?? 0) + 1
          return acc
        }, {}),
      ).map(([topic, count]) => ({ topic, count }))
      const group = (key: 'staffMention' | 'serviceMention') => {
        const acc = new Map<string, { count: number; sum: number }>()
        for (const item of reviews) {
          const name = item[key]
          if (!name) continue
          const row = acc.get(name) ?? { count: 0, sum: 0 }
          row.count += 1
          row.sum += item.rating
          acc.set(name, row)
        }
        return [...acc.entries()].map(([name, row]) => ({ name, count: row.count, average: row.sum / row.count }))
      }
      return json(ReviewInsightsSchema, {
        average,
        volume: reviews.length,
        unanswered: reviews.filter((item) => item.status !== 'replied').length,
        responseHours: 6,
        themes,
        staff: group('staffMention'),
        services: group('serviceMention'),
      })
    }),
  ),

  http.get(
    `${API}/payments`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'payments')
      return json(PaymentListSchema, await (await db()).payments.toArray())
    }),
  ),

  http.get(
    `${API}/payments/overview`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'payments')
      const database = await db()
      const payments = await database.payments.toArray()
      const gateway = (await database.connections.toArray()).find((item) => item.kind === 'payments')
      return json(PaymentsOverviewSchema, {
        gateway: gateway?.health ?? 'missing',
        pendingCount: payments.filter((item) => item.status === 'pending').length,
        paidCount: payments.filter((item) => item.status === 'paid').length,
        paidTotal: payments.filter((item) => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0),
      })
    }),
  ),

  http.get(
    `${API}/payment-links`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'payments')
      return json(PaymentLinkListSchema, await (await db()).paymentLinks.toArray())
    }),
  ),

  http.post(
    `${API}/payment-links`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'payments')
      requireCapability(session, 'connections.manage')
      const body = await parseBody(request, PaymentLinkWriteSchema)
      return write(['payments'], async (database) => {
        const gateway = (await database.connections.toArray()).find((item) => item.kind === 'payments')
        if (!gateway || gateway.health === 'broken') {
          throw new MockHttpError('validation_failed', 'Connect a payment gateway first.', { fieldErrors: { gateway: ['missing'] } })
        }
        const id = localId('plink')
        const row: PaymentLink = {
          id,
          accountId: session.account.id,
          contactId: null,
          contactName: body.contactName,
          amount: body.amount,
          currency: session.account.market === 'UK' ? 'GBP' : session.account.market === 'US' ? 'USD' : 'NGN',
          purpose: body.purpose,
          status: 'open',
          shareUrl: `http://localhost:5170/pay/${id}`,
          expiresAt: new Date(now().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.paymentLinks.add(row)
        return json(PaymentLinkSchema, row, 201)
      })
    }),
  ),

  http.get(
    `${API}/forms`,
    route(async () => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      return json(FormListSchema, (await (await db()).forms.toArray()).map(hydrateForm))
    }),
  ),

  http.get(
    `${API}/forms/:id`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const form = await (await db()).forms.get(String(params.id))
      if (!form) throw new MockHttpError('not_found', 'Form not found.')
      return json(FormSchema, hydrateForm(form))
    }),
  ),

  http.post(
    `${API}/forms`,
    route(async ({ request }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const body = await parseBody(request, FormWriteSchema)
      return write(['forms'], async (database) => {
        const form: FormDef = {
          id: localId('frm'),
          accountId: session.account.id,
          name: body.name,
          kind: body.kind ?? 'lead',
          status: 'draft',
          fields: body.fields ?? DEFAULT_FORM_FIELDS,
          submissions: 0,
          conversion: 0,
          thankYou: body.thankYou ?? 'Thanks — we will be in touch shortly.',
          redirectUrl: body.redirectUrl ?? null,
          successAction: body.successAction ?? 'message',
          allowedOrigins: body.allowedOrigins ?? [],
          notifyStaff: body.notifyStaff ?? true,
          spamProtection: body.spamProtection ?? true,
          createdAt: now().toISOString(),
          createdBy: actor(session),
        }
        await database.forms.add(hydrateForm(form))
        return json(FormSchema, hydrateForm(form), 201)
      })
    }),
  ),

  http.patch(
    `${API}/forms/:id`,
    route(async ({ request, params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const patch = await parseBody(request, FormWriteSchema.partial())
      return write(['forms'], async (database) => {
        const form = await database.forms.get(String(params.id))
        if (!form) throw new MockHttpError('not_found', 'Form not found.')
        const updated = hydrateForm({ ...form, ...patch })
        await database.forms.put(updated)
        return json(FormSchema, updated)
      })
    }),
  ),

  http.get(
    `${API}/forms/:id/responses`,
    route(async ({ params }) => {
      const session = await loadSession()
      await requireArea(session, 'marketing')
      const rows = (await (await db()).formResponses.toArray()).filter((row) => row.formId === String(params.id))
      return json(FormResponseListSchema, rows)
    }),
  ),
]
