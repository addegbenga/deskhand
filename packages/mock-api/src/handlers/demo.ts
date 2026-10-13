import { http } from 'msw'
import { z } from 'zod'
import { ContactSchema, pageOf } from '@deskhand/schemas'
import { json, MockHttpError, requireCapability, route } from '../http'
import { db } from '../store'
import { loadSession } from './tenant'

/** Endpoints behind the S0 state-patterns demo page. */
export const demoHandlers = [
  http.get(
    '/api/demo/contacts',
    route(async ({ request }) => {
      const session = await loadSession()
      const mode = new URL(request.url).searchParams.get('mode') ?? 'ok'
      if (mode === 'error') throw new MockHttpError('server_error', 'Something went wrong on our side.')
      if (mode === 'forbidden') requireCapability(session, 'contacts.export')
      const database = await db()
      const items = mode === 'empty' ? [] : await database.contacts.orderBy('createdAt').reverse().limit(5).toArray()
      return json(pageOf(ContactSchema), { items, nextCursor: null, total: mode === 'empty' ? 0 : await database.contacts.count() })
    }),
  ),
  http.get(
    '/api/demo/ping',
    route(() => json(z.object({ ok: z.literal(true) }), { ok: true })),
  ),
]
