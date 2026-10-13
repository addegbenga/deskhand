import { Eye, LogOut } from 'lucide-react'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import { Button, toast } from '@deskhand/ui'
import { useAdminSession, useEndImpersonation } from '../api/queries'

/** Red, unmissable banner for support sessions (FE-DOC 5, FR-AD.3). */
export function ImpersonationBanner() {
  const { t, i18n } = useTranslation('admin')
  const { impersonation } = useAdminSession()
  const end = useEndImpersonation()
  if (!impersonation) return null

  const ends = formatDateTime(
    impersonation.endsAt,
    { locale: i18n.language, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { timeStyle: 'short' },
  )

  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-danger px-4 py-2 text-sm text-danger-fg">
      <Eye className="size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 font-medium">{t('impersonation.banner', { tenant: impersonation.tenantName })}</p>
      <span className="text-xs opacity-90">
        {impersonation.readOnly && `${t('impersonation.readOnly')} · `}
        {t('impersonation.ends', { time: ends })}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="border-danger-fg/40 bg-transparent text-danger-fg hover:bg-danger-fg/10"
        disabled={end.isPending}
        onClick={() => end.mutate(undefined, { onSuccess: () => toast.success(t('impersonation.ended')) })}
      >
        <LogOut className="rtl:rotate-180" />
        {t('impersonation.end')}
      </Button>
    </div>
  )
}
