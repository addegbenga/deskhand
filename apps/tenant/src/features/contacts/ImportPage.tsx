import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { Breadcrumbs, Button, Checkbox, Label, PageContainer, PageHeader, Textarea, toast } from '@deskhand/ui'
import { useImportPreview, useRunImport, useUndoImport } from '../../api/crm'

export function ImportPage() {
  const { t } = useTranslation('contacts')
  const [csv, setCsv] = useState('firstName,lastName,phone,email\nKemi,Adeyemi,+234 803 111 2222,kemi@example.com\n')
  const [attested, setAttested] = useState(false)
  const preview = useImportPreview()
  const run = useRunImport()
  const undo = useUndoImport()
  const job = run.data

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/contacts">{label}</Link> }, { label: t('importPage.title') }]} />}
        title={t('importPage.title')}
      />
      <ol className="mb-4 flex flex-wrap gap-3 text-sm">
        {[t('importPage.step1'), t('importPage.step2'), t('importPage.step3')].map((label, index) => {
          const current = job ? 3 : preview.data ? 2 : 1
          const active = current === index + 1
          return (
            <li key={label} className={active ? 'font-medium text-fg' : 'text-fg-muted'}>
              <span className={`me-1.5 inline-flex size-6 items-center justify-center rounded-full text-xs ${active ? 'bg-brand text-brand-fg' : 'bg-surface-2'}`}>
                {index + 1}
              </span>
              {label}
            </li>
          )
        })}
      </ol>
      <p className="mb-2 text-sm text-fg-muted">{t('importPage.hint')}</p>
      <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={8} className="font-mono text-xs" />
      <Button className="mt-3" variant="outline" onClick={() => void preview.mutateAsync(csv)}>
        {t('importPage.step2')}
      </Button>
      {preview.data && (
        <div className="mt-4 overflow-x-auto rounded-md border border-border text-sm">
          <table className="w-full">
            <tbody>
              {preview.data.rows.map((row) => (
                <tr key={row.line} className="border-t border-border">
                  <td className="p-2">{row.firstName}</td>
                  <td className="p-2">{row.lastName}</td>
                  <td className="p-2">{row.phone}</td>
                  <td className="p-2">{row.email}</td>
                  <td className="p-2 text-danger">{row.error}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.data.invalid > 0 && <p className="p-2 text-xs text-fg-muted">{t('importPage.errors', { count: preview.data.invalid })}</p>}
        </div>
      )}
      <div className="mt-4 flex items-start gap-2">
        <Checkbox id="att" checked={attested} onCheckedChange={(on) => setAttested(Boolean(on))} />
        <Label htmlFor="att" className="font-normal">
          {t('importPage.attestation')}
        </Label>
      </div>
      <Button
        className="mt-4"
        disabled={!attested || run.isPending}
        onClick={() => {
          if (!attested) {
            toast.error(t('importPage.needAttest'))
            return
          }
          void run.mutateAsync({ csv, attested: true }).then((result) => toast.success(t('importPage.done', { count: result.createdCount })))
        }}
      >
        {t('importPage.run')}
      </Button>
      {job && job.status === 'complete' && (
        <Button className="ms-2 mt-4" variant="outline" onClick={() => void undo.mutateAsync(job.id).then(() => toast.success(t('importPage.undone')))}>
          {t('importPage.undo')}
        </Button>
      )}
    </PageContainer>
  )
}
