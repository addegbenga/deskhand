import { useTranslation } from '@deskhand/i18n'
import { Button, CopyField } from '@deskhand/ui'
import { widgetConsentHook, widgetPreviewUrl, widgetScript } from '../../lib/embed-snippets'

export function WidgetSnippet({ slug }: { slug: string }) {
  const { t } = useTranslation('settings')
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">{t('channels.widgetHint')}</p>
      <CopyField label={t('channels.widget')} value={widgetScript(slug)} multiline />
      <p className="text-xs text-fg-muted">{t('channels.widgetConsent')}</p>
      <CopyField label={t('channels.widgetConsentHook')} value={widgetConsentHook()} />
      <Button size="sm" variant="outline" asChild>
        <a href={widgetPreviewUrl(slug)} target="_blank" rel="noreferrer">
          {t('channels.previewWidget')}
        </a>
      </Button>
    </div>
  )
}
