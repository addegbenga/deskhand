import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { startSimulators } from './simulators'
import { ensureSeeded } from './store'

export * from './runtime'
export { resetScenario } from './store'
export { handlers }
export { simulateInbound } from './simulators'

let started: Promise<void> | null = null

/** Starts the mock API in the browser. Real API mode is a base-URL change in the app's API client. */
export function startMockApi(): Promise<void> {
  started ??= (async () => {
    await ensureSeeded()
    const worker = setupWorker(...handlers)
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js', options: { scope: '/' } },
    })
    startSimulators()
  })()
  return started
}
