import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import {
  Avatar,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  Input,
  Label,
} from '@deskhand/ui'

/** Simulated Google account chooser. A real build hands off to Google's own sign-in window. */
export function GoogleDialog({
  open,
  onOpenChange,
  onContinue,
  defaultEmail = '',
  pending,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContinue: (account: { email: string; name: string }) => void
  defaultEmail?: string
  pending?: boolean
  error?: string
}) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState(defaultEmail)
  const [name, setName] = useState('')
  const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('google.title')}</DialogTitle>
          <DialogDescription>{t('google.body')}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            if (valid) onContinue({ email: email.trim(), name: name.trim() })
          }}
        >
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <Avatar name={name || email || '?'} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-medium">{name || t('google.yourName')}</p>
              <p className="truncate text-fg-muted">{email || t('google.yourEmail')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-email">{t('fields.email')}</Label>
            <Input id="g-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="g-name">{t('fields.name')}</Label>
            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          {error && <FieldError>{error}</FieldError>}
          <DialogFooter>
            <Button type="submit" disabled={!valid || pending} className="w-full">
              {t('google.continue')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="currentColor" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.4a4.6 4.6 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.32 2.96-7.36Z" opacity=".9" />
      <path fill="currentColor" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.23-2.5c-.9.6-2.04.95-3.39.95-2.6 0-4.81-1.76-5.6-4.12H3.07v2.6A10 10 0 0 0 12 22Z" opacity=".7" />
      <path fill="currentColor" d="M6.4 13.93a6 6 0 0 1 0-3.86V7.47H3.07a10 10 0 0 0 0 9.06l3.33-2.6Z" opacity=".5" />
      <path fill="currentColor" d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.47l3.33 2.6C7.19 7.71 9.4 5.95 12 5.95Z" opacity=".8" />
    </svg>
  )
}
