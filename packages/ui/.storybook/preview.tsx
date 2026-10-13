import type { Decorator, Preview } from '@storybook/react-vite'
import { useEffect, type ReactNode } from 'react'
import { directionFor, i18next, initI18n, LANGUAGES } from '@deskhand/i18n'
import { Toaster } from '../src/components/toast'
import { TooltipProvider } from '../src/components/overlays'
import '../src/styles/globals.css'

initI18n('common')

function StoryShell({ theme, locale, density, children }: { theme: string; locale: string; density: string; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.dataset.density = density
    void i18next.changeLanguage(locale)
    root.lang = locale
    root.dir = directionFor(locale)
  }, [theme, locale, density])
  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-bg p-6 text-fg">{children}</div>
      <Toaster />
    </TooltipProvider>
  )
}

/** Theme, language (with right-to-left) and density are toolbar switches, so every story is checked in each. */
const withShell: Decorator = (Story, context) => {
  const { theme, locale, density } = context.globals as { theme: string; locale: string; density: string }
  return (
    <StoryShell theme={theme} locale={locale} density={density}>
      <Story />
    </StoryShell>
  )
}

const preview: Preview = {
  decorators: [withShell],
  globalTypes: {
    theme: {
      description: 'Theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
    locale: {
      description: 'Language',
      toolbar: { icon: 'globe', items: [...LANGUAGES], dynamicTitle: true },
    },
    density: {
      description: 'Density',
      toolbar: { icon: 'component', items: ['comfortable', 'compact'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light', locale: 'en', density: 'comfortable' },
  parameters: {
    layout: 'fullscreen',
    controls: { expanded: true },
    viewport: {
      options: {
        phone: { name: 'Phone 360', styles: { width: '360px', height: '740px' } },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' } },
      },
    },
  },
}

export default preview
