import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { Avatar, Breadcrumbs, Button, EmptyState, ErrorState, PageContainer, PageHeader, Skeleton, toast } from '@deskhand/ui'
import { GitMerge } from 'lucide-react'
import { useDuplicates, useMergeContacts } from '../../api/crm'

export function DuplicatesPage() {
  const { t } = useTranslation('contacts')
  const query = useDuplicates()
  const merge = useMergeContacts()
  const [winner, setWinner] = useState<Record<string, string>>({})

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={<Breadcrumbs items={[{ label: t('title'), render: (label) => <Link to="/app/contacts">{label}</Link> }, { label: t('duplicatesPage.title') }]} />}
        title={t('duplicatesPage.title')}
        description={t('duplicatesPage.body')}
      />
      {query.isPending && <Skeleton className="h-40" />}
      {query.isError && <ErrorState onRetry={() => void query.refetch()} />}
      {query.data && query.data.length === 0 && <EmptyState icon={GitMerge} title={t('duplicatesPage.empty')} description={t('duplicatesPage.body')} />}
      <ul className="flex flex-col gap-4">
        {query.data?.map((group) => {
          const keep = winner[group.id] ?? group.contacts[0]!.id
          return (
            <li key={group.id} className="rounded-xl border border-border p-4">
              <p className="text-sm text-fg-muted">
                {t(`duplicatesPage.reason.${group.reason}`)} · {group.matchValue}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {group.contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    onClick={() => setWinner((cur) => ({ ...cur, [group.id]: contact.id }))}
                    className={`rounded-lg border p-3 text-start text-sm ${keep === contact.id ? 'border-brand bg-brand/5' : 'border-border hover:bg-surface-2'}`}
                  >
                    <p className="flex items-center gap-2 font-medium">
                      <Avatar name={`${contact.firstName} ${contact.lastName}`} className="size-8" />
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="mt-2 text-fg-muted">{contact.phone}</p>
                    <p className="text-fg-muted">{contact.email}</p>
                    {keep === contact.id && <p className="mt-2 text-xs font-medium text-brand">{t('duplicatesPage.keep')}</p>}
                  </button>
                ))}
              </div>
              {group.contacts.length > 1 && (
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => {
                    const loser = group.contacts.find((c) => c.id !== keep)!
                    void merge.mutateAsync({ winnerId: keep, loserId: loser.id }).then(() => {
                      toast.success(t('duplicatesPage.merged'))
                      void query.refetch()
                    })
                  }}
                >
                  {t('duplicatesPage.merge')}
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </PageContainer>
  )
}
