import { BRAND_NAME, LEGAL_VERSIONS } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@deskhand/ui'

type Doc = 'terms' | 'privacy' | 'dpa'

/** Plain-language summary of a legal document with its version, opened from sign-up and compliance setup. */
export function LegalDialog({ doc, label }: { doc: Doc; label: string }) {
  const { t } = useTranslation('auth')
  const points = ['one', 'two', 'three', 'four'] as const
  const version = doc === 'dpa' ? LEGAL_VERSIONS.dpa : LEGAL_VERSIONS.terms
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="h-auto p-0 text-[13px] font-medium">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`legal.${doc}.title`, { brand: BRAND_NAME })}</DialogTitle>
          <DialogDescription>{t('legal.version', { version })}</DialogDescription>
        </DialogHeader>
        <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-fg-muted">
          {points.map((point) => (
            <li key={point}>{t(`legal.${doc}.${point}`, { brand: BRAND_NAME })}</li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
