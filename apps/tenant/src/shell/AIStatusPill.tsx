import { Link } from '@tanstack/react-router'
import { OctagonX, Play, Sparkles } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import type { AiMode } from '@deskhand/schemas'
import { Button, cn, Popover, PopoverContent, PopoverTrigger, toast, usePermission } from '@deskhand/ui'
import { usePatchAccount, useSession } from '../api/queries'

const DOT: Record<AiMode, string> = {
  on: 'bg-success',
  suggest_only: 'bg-info',
  off: 'bg-fg-muted',
  paused: 'bg-attention',
  manual: 'bg-fg-muted',
}

/** Live, Suggest-only, Paused or Manual; one click reaches the kill switch (PRD 28.2, FE-DOC 4.3). */
export function AIStatusPill({ className }: { className?: string }) {
  const { t } = useTranslation('common')
  const session = useSession()
  const patch = usePatchAccount()
  const { allowed: canManage, requiredRole } = usePermission('ai.manage')
  const mode = session.account.aiMode
  const running = mode === 'on' || mode === 'suggest_only'

  const setMode = (aiMode: AiMode, message: string) =>
    patch.mutate({ aiMode }, { onSuccess: () => toast.success(message), onError: () => toast.error(t('states.error.title')) })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-8 items-center gap-2 rounded-full border border-border bg-surface px-3 text-[13px] font-medium text-fg transition-colors hover:bg-surface-2',
            className,
          )}
        >
          <span className={cn('size-2 rounded-full', DOT[mode], mode === 'on' && 'animate-pulse')} aria-hidden />
          <Sparkles className="size-3.5 text-ai" aria-hidden />
          <span className="max-sm:sr-only">{t(`ai.status.${mode}`)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm font-semibold">{t(`ai.status.${mode}`)}</p>
            <p className="mt-1 text-sm text-fg-muted">{t(`ai.statusHint.${mode}`)}</p>
          </div>
          {mode === 'manual' && canManage && (
            <Button asChild variant="outline" size="sm">
              <Link to="/app/$" params={{ _splat: 'ai/employees' }}>{t('ai.setUp')}</Link>
            </Button>
          )}
          {running &&
            (canManage ? (
              <Button
                variant="danger-outline"
                size="sm"
                disabled={patch.isPending}
                onClick={() => setMode('paused', t('ai.pausedToast'))}
              >
                <OctagonX />
                {t('ai.killSwitch')}
              </Button>
            ) : (
              <p className="text-xs text-fg-muted">{t('ai.askToPause', { role: t(`roles.${requiredRole}`) })}</p>
            ))}
          {mode === 'paused' && canManage && (
            <Button size="sm" disabled={patch.isPending} onClick={() => setMode('on', t('ai.resumedToast'))}>
              <Play />
              {t('ai.resume')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
