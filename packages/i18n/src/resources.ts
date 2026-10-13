import enCommon from './locales/en/common.json'
import enDevtools from './locales/en/devtools.json'
import enAdmin from './locales/en/admin.json'
import enPublic from './locales/en/public.json'
import enAuth from './locales/en/auth.json'
import enOnboarding from './locales/en/onboarding.json'
import enHome from './locales/en/home.json'
import enInbox from './locales/en/inbox.json'
import enContacts from './locales/en/contacts.json'
import enPipeline from './locales/en/pipeline.json'
import enCalendar from './locales/en/calendar.json'
import enTasks from './locales/en/tasks.json'
import enAi from './locales/en/ai.json'
import enGrow from './locales/en/grow.json'
import enInsight from './locales/en/insight.json'
import enSettings from './locales/en/settings.json'
import enGovernance from './locales/en/governance.json'
import frCommon from './locales/fr/common.json'
import frDevtools from './locales/fr/devtools.json'
import frAdmin from './locales/fr/admin.json'
import frPublic from './locales/fr/public.json'
import frAuth from './locales/fr/auth.json'
import frOnboarding from './locales/fr/onboarding.json'
import frHome from './locales/fr/home.json'
import frInbox from './locales/fr/inbox.json'
import frContacts from './locales/fr/contacts.json'
import frPipeline from './locales/fr/pipeline.json'
import frCalendar from './locales/fr/calendar.json'
import frTasks from './locales/fr/tasks.json'
import frAi from './locales/fr/ai.json'
import frGrow from './locales/fr/grow.json'
import frInsight from './locales/fr/insight.json'
import frSettings from './locales/fr/settings.json'
import frGovernance from './locales/fr/governance.json'
import arCommon from './locales/ar/common.json'
import arDevtools from './locales/ar/devtools.json'
import arAdmin from './locales/ar/admin.json'
import arPublic from './locales/ar/public.json'
import arAuth from './locales/ar/auth.json'
import arOnboarding from './locales/ar/onboarding.json'
import arHome from './locales/ar/home.json'
import arInbox from './locales/ar/inbox.json'
import arContacts from './locales/ar/contacts.json'
import arPipeline from './locales/ar/pipeline.json'
import arCalendar from './locales/ar/calendar.json'
import arTasks from './locales/ar/tasks.json'
import arAi from './locales/ar/ai.json'
import arGrow from './locales/ar/grow.json'
import arInsight from './locales/ar/insight.json'
import arSettings from './locales/ar/settings.json'
import arGovernance from './locales/ar/governance.json'

export const NAMESPACES = ['common', 'devtools', 'admin', 'public', 'auth', 'onboarding', 'home', 'inbox', 'contacts', 'pipeline', 'calendar', 'tasks', 'ai', 'grow', 'insight', 'settings', 'governance'] as const
export type Namespace = (typeof NAMESPACES)[number]

export const resources = {
  en: {
    common: enCommon,
    devtools: enDevtools,
    admin: enAdmin,
    public: enPublic,
    auth: enAuth,
    onboarding: enOnboarding,
    home: enHome,
    inbox: enInbox,
    contacts: enContacts,
    pipeline: enPipeline,
    calendar: enCalendar,
    tasks: enTasks,
    ai: enAi,
    grow: enGrow,
    insight: enInsight,
    settings: enSettings,
    governance: enGovernance,
  },
  fr: {
    common: frCommon,
    devtools: frDevtools,
    admin: frAdmin,
    public: frPublic,
    auth: frAuth,
    onboarding: frOnboarding,
    home: frHome,
    inbox: frInbox,
    contacts: frContacts,
    pipeline: frPipeline,
    calendar: frCalendar,
    tasks: frTasks,
    ai: frAi,
    grow: frGrow,
    insight: frInsight,
    settings: frSettings,
    governance: frGovernance,
  },
  ar: {
    common: arCommon,
    devtools: arDevtools,
    admin: arAdmin,
    public: arPublic,
    auth: arAuth,
    onboarding: arOnboarding,
    home: arHome,
    inbox: arInbox,
    contacts: arContacts,
    pipeline: arPipeline,
    calendar: arCalendar,
    tasks: arTasks,
    ai: arAi,
    grow: arGrow,
    insight: arInsight,
    settings: arSettings,
    governance: arGovernance,
  },
}
