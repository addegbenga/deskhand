import { Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { can } from '@deskhand/schemas'
import {
  Avatar,
  Breadcrumbs,
  Button,
  ErrorState,
  Input,
  Label,
  PageContainer,
  PageHeader,
  Skeleton,
  toast,
} from '@deskhand/ui'
import { useBulkCompanyContacts, useCompany, useDeleteCompany, usePatchCompany } from '../../api/crm'
import { useSession } from '../../api/queries'

export function CompanyDetailPage({ companyId }: { companyId: string }) {
  const { t } = useTranslation(['contacts', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const query = useCompany(companyId)
  const patch = usePatchCompany(companyId)
  const remove = useDeleteCompany()
  const unlink = useBulkCompanyContacts()
  const canEdit = can(session.membership.role, 'contacts.edit')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const company = query.data?.company
  const contacts = query.data?.contacts ?? []

  useEffect(() => {
    if (!company) return
    setName(company.name)
    setNotes(company.notes)
  }, [company])

  if (query.isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="mt-6 h-48 w-full" />
      </PageContainer>
    )
  }
  if (query.isError || !company) {
    return (
      <PageContainer>
        <ErrorState onRetry={() => void query.refetch()} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: t('title'), render: (label) => <Link to="/app/contacts">{label}</Link> },
              { label: t('companiesPage.title'), render: (label) => <Link to="/app/contacts/companies">{label}</Link> },
              { label: company.name },
            ]}
          />
        }
        title={company.name}
        action={
          canEdit ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => void patch.mutateAsync({ name, notes }).then(() => toast.success(t('companiesPage.saved')))}
                disabled={!name.trim() || patch.isPending}
              >
                {t('common:actions.save')}
              </Button>
              <Button
                size="sm"
                variant="danger-outline"
                onClick={() =>
                  void remove.mutateAsync(companyId).then(() => {
                    toast.success(t('companiesPage.deleted'))
                    void navigate({ to: '/app/contacts/companies' })
                  })
                }
              >
                {t('companiesPage.delete')}
              </Button>
            </div>
          ) : undefined
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="co-name">{t('companiesPage.name')}</Label>
          <Input id="co-name" className="mt-1" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div>
          <Label htmlFor="co-notes">{t('companiesPage.notes')}</Label>
          <Input id="co-notes" className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!canEdit} />
        </div>
      </div>
      <h2 className="mb-2 text-sm font-medium">{t('companiesPage.people')}</h2>
      {contacts.length === 0 ? (
        <p className="text-sm text-fg-muted">{t('companiesPage.noPeople')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-start text-sm">
            <tbody>
              {contacts.map((contact) => {
                const fullName = `${contact.firstName} ${contact.lastName}`
                return (
                  <tr key={contact.id} className="border-t border-border first:border-t-0">
                    <td className="p-3">
                      <Link to="/app/contacts/$contactId" params={{ contactId: contact.id }} className="flex items-center gap-2 font-medium hover:underline">
                        <Avatar name={fullName} className="size-7" />
                        {fullName}
                      </Link>
                    </td>
                    <td className="p-3 text-fg-muted">{contact.phone}</td>
                    <td className="p-3 text-fg-muted">{contact.email}</td>
                    {canEdit && (
                      <td className="p-3 text-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void unlink.mutateAsync({ ids: [contact.id], companyId: null }).then(() => void query.refetch())}
                        >
                          {t('companiesPage.unlink')}
                        </Button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  )
}
