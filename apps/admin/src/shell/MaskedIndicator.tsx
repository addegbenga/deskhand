import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { isApiError } from '@deskhand/schemas'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
  Label,
  Textarea,
  toast,
  Tooltip,
} from '@deskhand/ui'
import { useAdminSession, useEndReveal, useRevealPii } from '../api/queries'

const MIN_REASON = 10

/** Masked-data indicator with reveal-with-reason (PRD 31.3, FR-PA.6). Reveals are time-limited and logged. */
export function MaskedIndicator() {
  const { t, i18n } = useTranslation('admin')
  const session = useAdminSession()
  const reveal = useRevealPii()
  const endReveal = useEndReveal()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [touched, setTouched] = useState(false)

  const tooShort = reason.trim().length < MIN_REASON
  const serverError = isApiError(reveal.error, 'validation_failed') ? t('masked.reasonTooShort') : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (tooShort) return
    reveal.mutate(
      { field: 'tenant_pii', reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(t('masked.revealed'))
          setOpen(false)
          setReason('')
          setTouched(false)
        },
      },
    )
  }

  if (session.piiRevealedUntil) {
    const until = formatDateTime(
      session.piiRevealedUntil,
      { locale: i18n.language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      { timeStyle: 'short' },
    )
    return (
      <div className="flex items-center gap-2">
        <Tooltip content={t('masked.until', { time: until })}>
          <Badge tone="attention" tabIndex={0}>
            <Eye aria-hidden />
            <span className="max-sm:sr-only">{t('masked.off')}</span>
          </Badge>
        </Tooltip>
        <Button size="sm" variant="ghost" disabled={endReveal.isPending} onClick={() => endReveal.mutate()}>
          <EyeOff />
          <span className="max-lg:sr-only">{t('masked.hide')}</span>
        </Button>
      </div>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reveal.reset()
      }}
    >
      <Tooltip content={t('masked.reveal')}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted hover:text-fg"
        >
          <ShieldCheck className="size-3.5" aria-hidden />
          <span className="max-sm:sr-only">{t('masked.on')}</span>
        </button>
      </Tooltip>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>{t('masked.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('masked.dialogBody')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="reveal-reason">{t('masked.reason')}</Label>
            <Textarea
              id="reveal-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t('masked.reasonPlaceholder')}
              aria-invalid={(touched && tooShort) || !!serverError}
              aria-describedby="reveal-reason-error"
              rows={3}
              autoFocus
            />
            {((touched && tooShort) || serverError) && (
              <FieldError id="reveal-reason-error">{serverError ?? t('masked.reasonTooShort')}</FieldError>
            )}
            {reveal.isError && !serverError && <FieldError>{t('common:states.error.body')}</FieldError>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={reveal.isPending}>
              <Eye />
              {t('masked.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
