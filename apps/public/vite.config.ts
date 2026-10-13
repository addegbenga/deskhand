import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockServiceWorker } from '@deskhand/mock-api/vite-plugin'

/**
 * Assets live under /_public/. On the shared dev origin the gateway rewrites customer paths
 * (/b/:slug, /p/:slug, /privacy/:slug and so on) to this app, so customers see clean URLs.
 */
export default defineConfig({
  base: '/_public/',
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), mockServiceWorker()],
  server: { port: 5175, strictPort: true },
})
