import type { ConnectionCard, ConnectionHub, JoinRequest, WorkspaceMember } from '@deskhand/schemas'
import { teamSetupItems } from './team-needs'

/** Channels that are broken, degraded, or flagged — they belong on Home setup blockers. */
export function connectionSetupItems(hub?: ConnectionHub): ConnectionCard[] {
  if (!hub) return []
  return hub.groups
    .flatMap((group) => group.cards)
    .filter((card) => card.status === 'needs_attention' || card.health === 'broken' || card.health === 'degraded')
}

export function extraBlockingCount(members: WorkspaceMember[], joins: JoinRequest[], hub?: ConnectionHub) {
  return teamSetupItems(members, joins).filter((item) => item.blocking).length + connectionSetupItems(hub).length
}
