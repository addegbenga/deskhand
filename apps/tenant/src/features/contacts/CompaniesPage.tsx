import { Link, useNavigate } from '@tanstack/react-router'
import { Building2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { can } from '@deskhand/schemas'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  PageContainer,
  PageHeader,
  Skeleton,
  toast,
} from '@deskhand/ui'
import { useCompanies, useCreateCompany } from '../../api/crm'
import { useSession } from '../../api/queries'

export function CompaniesPage() {
  const { t } = useTranslation(['contacts', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const list = useCompanies()
  const create = useCreateCompany()
  const canEdit = can(session.membership.role, 'contacts.edit')
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const items = list.data ?? []

  return (
    <PageContainer>
      <PageHeader
        title={t('companiesPage.title')}
        action={
          canEdit ? (
            <Button size="sm" onClick={() => setOpen(true)}>
              {t('companiesPage.add')}
            </Button>
          ) : undefined
        }
      />
      {list.isPending && <Skeleton className="h-48" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && (
        <EmptyState icon={Building2} title={t('companiesPage.empty')} description={t('companiesPage.emptyBody')} />
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-start text-sm">
            <thead className="bg-surface-2 text-xs text-fg-muted">
              <tr>
                <th className="p-3 font-medium">{t('companiesPage.name')}</th>
                <th className="p-3 font-medium">{t('companiesPage.people')}</th>
                <th className="p-3 font-medium">{t('companiesPage.notes')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((company) => (
                <tr key={company.id} className="border-t border-border hover:bg-surface-2/60">
                  <td className="p-3">
                    <Link to="/app/contacts/companies/$companyId" params={{ companyId: company.id }} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                  </td>
                  <td className="p-3 text-fg-muted">{company.contactCount}</td>
                  <td className="p-3 text-fg-muted">{company.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{t('companiesPage.add')}</DialogTitle>
          <DialogDescription>{t('companiesPage.emptyBody')}</DialogDescription>
          <Label htmlFor="co-name">{t('companiesPage.name')}</Label>
          <Input id="co-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          <Label htmlFor="co-notes" className="mt-3 block">
            {t('companiesPage.notes')}
          </Label>
          <Input id="co-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
          <Button
            className="mt-3"
            disabled={!name.trim() || create.isPending}
            onClick={() =>
              void create.mutateAsync({ name: name.trim(), notes }).then((company) => {
                toast.success(t('companiesPage.created'))
                setOpen(false)
                setName('')
                setNotes('')
                void navigate({ to: '/app/contacts/companies/$companyId', params: { companyId: company.id } })
              })
            }
          >
            {t('create.save')}
          </Button>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
