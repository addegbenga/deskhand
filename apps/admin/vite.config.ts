import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { mockServiceWorker } from '@deskhand/mock-api/vite-plugin'

/** Served under /admin/ on the shared dev origin (scripts/dev-gateway.mjs). */
export default defineConfig({
  base: '/admin/',
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss(), mockServiceWorker()],
  server: { port: 5174, strictPort: true },
})
