import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

/**
 * Serves MSW's worker at the site root for every app, whatever its Vite base.
 * All apps share one origin through the dev gateway, so they share one worker and one IndexedDB.
 * @returns {import('vite').Plugin}
 */
export function mockServiceWorker() {
  const source = () => readFileSync(require.resolve('msw/mockServiceWorker.js'))
  return {
    name: 'deskhand-mock-service-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== '/mockServiceWorker.js') return next()
        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Service-Worker-Allowed', '/')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(source())
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'mockServiceWorker.js', source: source() })
    },
  }
}
