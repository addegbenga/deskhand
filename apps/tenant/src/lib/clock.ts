import { now as mockNow } from '@deskhand/mock-api/runtime'

/** The app's clock. In mock mode it follows the dev toolbar's controllable clock; with a real API it is Date.now(). */
export const now: () => Date = import.meta.env.VITE_API_BASE_URL ? () => new Date() : mockNow
