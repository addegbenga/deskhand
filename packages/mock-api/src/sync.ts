export type ChangeTopic = string

export type ChangeEvent = {
  topics: ChangeTopic[]
  /** True when the change came from another tab. */
  remote: boolean
}

type Listener = (event: ChangeEvent) => void

const listeners = new Set<Listener>()
const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('deskhand-mock')
// Node (tests) keeps the process alive on an open channel; browsers have no unref.
;(channel as { unref?: () => void } | null)?.unref?.()

channel?.addEventListener('message', (message: MessageEvent<{ topics: ChangeTopic[] }>) => {
  for (const listener of listeners) listener({ topics: message.data.topics, remote: true })
})

/** Announces data changes to this tab and to other tabs (FE-DOC 8.6, BroadcastChannel). '*' means everything. */
export function notifyChange(topics: ChangeTopic[]) {
  for (const listener of listeners) listener({ topics, remote: false })
  channel?.postMessage({ topics })
}

export function onChange(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
