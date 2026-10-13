import { useNavigate } from '@tanstack/react-router'
import { Mail } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { Badge, Button } from '@deskhand/ui'
import { useOutbox } from '../../api/auth'

const SHOW = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLBAR === 'true'

/**
 * Demo-only stand-in for the person's email inbox, so codes and links can be opened during a demo.
 * Hidden in production builds, like the dev toolbar.
 */
export function DemoMailbox({ email, kinds }: { email: string | undefined; kinds: ('verify_code' | 'reset_link' | 'magic_link')[] }) {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const outbox = useOutbox(email, SHOW)
  const message = outbox.data?.find((m) => (kinds as string[]).includes(m.kind))
  if (!SHOW || !message) return null
  return (
    <div className="mt-6 rounded-lg border border-dashed border-attention/50 bg-attention/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Mail className="size-4 text-attention" aria-hidden />
        {t('mailbox.title')}
        <Badge tone="attention" className="ms-auto">
          {t('mailbox.demo')}
        </Badge>
      </div>
      <p className="mt-2 text-[13px] text-fg-muted">{t(`mailbox.${message.kind}`, { email: message.to })}</p>
      {message.code && (
        <p dir="ltr" className="tabular mt-2 text-2xl font-semibold tracking-[0.3em]">
          {message.code}
        </p>
      )}
      {message.href && (
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void navigate({ href: message.href! })}>
          {t('mailbox.open')}
        </Button>
      )}
    </div>
  )
}
