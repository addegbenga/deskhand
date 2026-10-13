import { http } from 'msw'
import { PublicTenantSchema } from '@deskhand/schemas'
import { json, route } from '../http'
import { bySlug, publicTenantFor } from '../public-account'

export const publicHandlers = [
  http.get(
    '/api/public/tenants/:slug',
    route(async ({ params }) => {
      const { database, account } = await bySlug(String(params.slug))
      return json(PublicTenantSchema, await publicTenantFor(database, account))
    }),
  ),
]
