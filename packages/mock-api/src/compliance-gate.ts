import { getMarketPack } from '@deskhand/config'
import type { MarketCode } from '@deskhand/schemas'
import { blockingIds, computeChecklist } from './compliance-rules'
import { MockHttpError } from './http'
import { db } from './store'

export async function assertNoBlockingCompliance(accountId: string, market: MarketCode, action: 'autopilot' | 'go_live') {
  const database = await db()
  const state = await database.complianceState.get(accountId)
  const dsars = await database.dsarRequests.toArray()
  const blocking = state ? blockingIds(computeChecklist(getMarketPack(market), state, dsars)) : ['disclosure']
  if (!blocking.length) return
  throw new MockHttpError(
    'validation_failed',
    action === 'go_live' ? 'A blocking compliance item prevents go-live.' : 'A blocking compliance item prevents Autopilot.',
    { fieldErrors: { compliance: blocking } },
  )
}
