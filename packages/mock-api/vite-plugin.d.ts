import type { Plugin } from 'vite'

/** Serves the MSW worker at /mockServiceWorker.js (scope /) so every app on the dev origin shares it. */
export function mockServiceWorker(): Plugin
