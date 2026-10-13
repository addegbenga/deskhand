import { Toaster as Sonner, toast } from 'sonner'
import { usePreferences } from '../lib/preferences'

export { toast }

export function Toaster() {
  const theme = usePreferences((s) => s.theme)
  const dir = typeof document === 'undefined' ? 'ltr' : (document.documentElement.dir as 'ltr' | 'rtl')
  return (
    <Sonner
      theme={theme}
      dir={dir}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'bg-surface! text-fg! border-border! rounded-md! shadow-lg!',
          description: 'text-fg-muted!',
          actionButton: 'bg-brand! text-brand-fg!',
        },
      }}
    />
  )
}
