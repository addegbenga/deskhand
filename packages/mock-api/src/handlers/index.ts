import { adminHandlers } from './admin'
import { authHandlers } from './auth'
import { contactsHandlers } from './contacts'
import { demoHandlers } from './demo'
import { homeHandlers } from './home'
import { inboxHandlers } from './inbox'
import { onboardingHandlers } from './onboarding'
import { bookingPublicHandlers } from './booking-public'
import { calendarHandlers } from './calendar'
import { pipelineHandlers } from './pipeline'
import { publicHandlers } from './public'
import { publicSurfaceHandlers } from './public-surfaces'
import { tenantHandlers } from './tenant'
import { aiHandlers } from './ai'
import { growHandlers } from './grow'
import { insightHandlers } from './insight'
import { settingsHandlers } from './settings'
import { complianceHandlers } from './compliance'

export const handlers = [
  ...tenantHandlers,
  ...authHandlers,
  ...onboardingHandlers,
  ...homeHandlers,
  ...inboxHandlers,
  ...contactsHandlers,
  ...pipelineHandlers,
  ...calendarHandlers,
  ...aiHandlers,
  ...growHandlers,
  ...insightHandlers,
  ...settingsHandlers,
  ...complianceHandlers,
  ...adminHandlers,
  ...publicHandlers,
  ...publicSurfaceHandlers,
  ...bookingPublicHandlers,
  ...demoHandlers,
]
