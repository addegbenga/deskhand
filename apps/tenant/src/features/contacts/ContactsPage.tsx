import { Link, useNavigate } from '@tanstack/react-router'
import { ListFilter, Megaphone, Search, UserPlus, Users } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { can, canSeeArea, type SmartList, type SmartListFilters } from '@deskhand/schemas'
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Combobox,
  CreatedByChip,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
  usePermission,
} from '@deskhand/ui'
import {
  useBulkCompanyContacts,
  useBulkDeleteContacts,
  useBulkTagContacts,
  useCompanies,
  useContacts,
  useCreateContact,
  useCreateSmartList,
  useCustomFields,
  useDeleteSmartList,
  useExportContacts,
  useSmartLists,
} from '../../api/crm'
import { useSession } from '../../api/queries'
import { useSelectedLocation } from '../../lib/location'

const ALL = 'all'
const SOURCES = ['whatsapp', 'webchat', 'email', 'sms', 'instagram', 'form', 'booking_page', 'import', 'manual'] as const
const STAGES = ['New', 'Qualified', 'Booked', 'Deposit paid', 'Won']
const TAGS = ['VIP', 'New', 'Returning', 'Deposit paid', 'Referral', 'Instagram']

type FilterState = {
  tag: string
  source: string
  stage: string
  since: string
  fieldKey: string
  fieldValue: string
  companyId: string
}

const EMPTY: FilterState = {
  tag: ALL,
  source: ALL,
  stage: ALL,
  since: ALL,
  fieldKey: ALL,
  fieldValue: ALL,
  companyId: ALL,
}

function toFilters(state: FilterState): SmartListFilters {
  return {
    ...(state.tag !== ALL ? { tag: state.tag } : {}),
    ...(state.source !== ALL ? { source: state.source as NonNullable<SmartListFilters['source']> } : {}),
    ...(state.stage !== ALL ? { stage: state.stage } : {}),
    ...(state.since !== ALL ? { since: state.since as NonNullable<SmartListFilters['since']> } : {}),
    ...(state.fieldKey !== ALL ? { fieldKey: state.fieldKey } : {}),
    ...(state.fieldValue !== ALL ? { fieldValue: state.fieldValue } : {}),
    ...(state.companyId !== ALL ? { companyId: state.companyId } : {}),
  }
}

function countActive(state: FilterState) {
  return Object.values(state).filter((value) => value !== ALL).length
}

export function ContactsPage({ create }: { create?: boolean }) {
  const { t } = useTranslation(['contacts', 'common'])
  const session = useSession()
  const navigate = useNavigate()
  const { locationId } = useSelectedLocation(session)
  const access = usePermission('contacts.edit')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<FilterState>(EMPTY)
  const [listId, setListId] = useState(ALL)
  const [selected, setSelected] = useState<string[]>([])
  const [open, setOpen] = useState(Boolean(create))
  const [saveOpen, setSaveOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draft, setDraft] = useState<FilterState>(EMPTY)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [confirm, setConfirm] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const list = useContacts({
    q,
    locationId,
    tag: filters.tag === ALL ? undefined : filters.tag,
    source: filters.source === ALL ? undefined : filters.source,
    stage: filters.stage === ALL ? undefined : filters.stage,
    since: filters.since === ALL ? undefined : filters.since,
    fieldKey: filters.fieldKey === ALL ? undefined : filters.fieldKey,
    fieldValue: filters.fieldValue === ALL ? undefined : filters.fieldValue,
    companyId: filters.companyId === ALL ? undefined : filters.companyId,
    listId: listId === ALL ? undefined : listId,
  })
  const lists = useSmartLists()
  const companies = useCompanies()
  const fields = useCustomFields()
  const createContact = useCreateContact()
  const createList = useCreateSmartList()
  const deleteList = useDeleteSmartList()
  const bulkDelete = useBulkDeleteContacts()
  const bulkTag = useBulkTagContacts()
  const bulkCompany = useBulkCompanyContacts()
  const exportCsv = useExportContacts(locationId)
  const canEdit = access.allowed
  const canExport = can(session.membership.role, 'contacts.export')
  const canMarket = canSeeArea(session.membership.role, 'marketing')
  const items = list.data?.items ?? []
  const total = list.data?.total ?? 0
  const companyName = Object.fromEntries((companies.data ?? []).map((item) => [item.id, item.name]))
  const fieldDef = (fields.data ?? []).find((item) => item.key === filters.fieldKey)
  const draftField = (fields.data ?? []).find((item) => item.key === draft.fieldKey)
  const savedLists = lists.data ?? []
  const activeList = savedLists.find((item) => item.id === listId)
  const activeCount = countActive(filters)
  const setFilter = (patch: Partial<FilterState>) => {
    setListId(ALL)
    setFilters((cur) => ({ ...cur, ...patch }))
  }
  const applyList = (saved: SmartList) => {
    setListId(saved.id)
    setFilters({
      tag: saved.filters.tag ?? ALL,
      source: saved.filters.source ?? ALL,
      stage: saved.filters.stage ?? ALL,
      since: saved.filters.since ?? ALL,
      fieldKey: saved.filters.fieldKey ?? ALL,
      fieldValue: saved.filters.fieldValue ?? ALL,
      companyId: saved.filters.companyId ?? ALL,
    })
  }
  const summarize = (state: FilterState) => {
    const parts: string[] = []
    if (state.source !== ALL) parts.push(t(`source.${state.source}`))
    if (state.stage !== ALL) parts.push(state.stage)
    if (state.tag !== ALL) parts.push(state.tag)
    if (state.since !== ALL) parts.push(t(`since.${state.since}`))
    if (state.fieldKey !== ALL) {
      const field = (fields.data ?? []).find((item) => item.key === state.fieldKey)
      parts.push(state.fieldValue !== ALL ? `${field?.label ?? state.fieldKey}: ${state.fieldValue}` : (field?.label ?? state.fieldKey))
    }
    if (state.companyId !== ALL) parts.push(companyName[state.companyId] ?? t('columns.company'))
    return parts
  }
  const openCreateGroup = () => {
    setDraftName('')
    setDraft(filters)
    setSaveOpen(true)
  }

  if (!canSeeArea(session.membership.role, 'contacts')) {
    return (
      <PageContainer>
        <PageHeader title={t('title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/app/contacts/companies">{t('companies')}</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/app/contacts/duplicates">{t('duplicates')}</Link>
            </Button>
            {canEdit && (
              <Button asChild variant="outline" size="sm">
                <Link to="/app/contacts/import">{t('import')}</Link>
              </Button>
            )}
            {canExport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void exportCsv.mutateAsync().then((file) => {
                    const blob = new Blob([file.csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = 'contacts.csv'
                    a.click()
                    URL.revokeObjectURL(url)
                  })
                }
              >
                {t('export')}
              </Button>
            )}
            {canEdit && (
              <Button size="sm" onClick={() => setOpen(true)}>
                <UserPlus />
                {t('add')}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-fg-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} className="ps-9" />
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" aria-label={t('filters.button')}>
              <ListFilter />
              {t('filters.button')}
              {activeCount > 0 ? <Badge tone="brand">{activeCount}</Badge> : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{t('filters.title')}</p>
              {activeCount > 0 && (
                <Button size="sm" variant="ghost" onClick={() => { setListId(ALL); setFilters(EMPTY) }}>
                  {t('filters.clear')}
                </Button>
              )}
            </div>
            <FilterFields
              state={filters}
              onChange={setFilter}
              fields={fields.data ?? []}
              companies={companies.data ?? []}
              fieldDef={fieldDef}
              t={t}
            />
            {canEdit && (
              <Button size="sm" className="w-full" variant="secondary" onClick={openCreateGroup}>
                {t('groups.saveFromFilters')}
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-[16rem] flex-1 sm:max-w-sm">
          <Combobox
            value={listId}
            onChange={(value) => {
              if (value === ALL) {
                setListId(ALL)
                setFilters(EMPTY)
                return
              }
              const saved = savedLists.find((item) => item.id === value)
              if (saved) applyList(saved)
            }}
            placeholder={t('groups.placeholder')}
            searchPlaceholder={t('groups.search')}
            emptyText={t('groups.empty')}
            options={[
              { value: ALL, label: t('groups.all') },
              ...savedLists.map((item) => ({ value: item.id, label: item.name })),
            ]}
          />
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={openCreateGroup}>
            {t('groups.new')}
          </Button>
        )}
        {activeList && canMarket && (
          <Button
            size="sm"
            onClick={() => void navigate({ to: '/app/marketing/campaigns', search: { listId: activeList.id } })}
          >
            <Megaphone />
            {t('groups.send')}
          </Button>
        )}
        {canEdit && activeList && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void deleteList.mutateAsync(activeList.id).then(() => {
                setListId(ALL)
                setFilters(EMPTY)
                toast.success(t('groups.deleted'))
              })
            }
          >
            {t('groups.delete')}
          </Button>
        )}
      </div>

      {activeList ? (
        <p className="mb-3 text-sm text-fg-muted">
          {t('groups.selected', { name: activeList.name, count: total })}
          {summarize(filters).length > 0 ? ` · ${summarize(filters).join(' · ')}` : ''}
        </p>
      ) : (
        <p className="mb-3 text-sm text-fg-muted">{t('groups.hint')}</p>
      )}

      {selected.length > 0 && canEdit && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void bulkTag.mutateAsync({ ids: selected, tag: 'VIP' }).then(() => toast.success(t('bulk.tagged')))}>
            {t('bulk.tag')}
          </Button>
          {(companies.data ?? []).length > 0 && (
            <Select
              onValueChange={(id) =>
                void bulkCompany.mutateAsync({ ids: selected, companyId: id }).then(() => {
                  toast.success(t('bulk.assigned'))
                  setSelected([])
                })
              }
            >
              <SelectTrigger className="h-8 w-48">
                <SelectValue placeholder={t('bulk.company')} />
              </SelectTrigger>
              <SelectContent>
                {(companies.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canExport && (
            <Button size="sm" variant="danger-outline" onClick={() => setDeleteOpen(true)}>
              {t('bulk.delete')}
            </Button>
          )}
        </div>
      )}
      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data && items.length === 0 && (
        <EmptyState icon={Users} title={t('empty.title')} description={t('empty.body')} action={canEdit ? <Button onClick={() => setOpen(true)}>{t('add')}</Button> : undefined} />
      )}
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[44rem] text-start text-sm">
            <thead className="bg-surface-2 text-xs text-fg-muted">
              <tr>
                <th className="p-3">{canEdit && <span className="sr-only">{t('columns.name')}</span>}</th>
                <th className="p-3 font-medium">{t('columns.name')}</th>
                <th className="p-3 font-medium">{t('columns.phone')}</th>
                <th className="p-3 font-medium">{t('columns.email')}</th>
                <th className="p-3 font-medium">{t('columns.company')}</th>
                <th className="p-3 font-medium">{t('columns.tags')}</th>
                <th className="p-3 font-medium">{t('columns.stage')}</th>
                <th className="p-3 font-medium">{t('columns.language')}</th>
                <th className="p-3 font-medium">{t('columns.source')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((contact) => {
                const name = `${contact.firstName} ${contact.lastName}`
                return (
                  <tr key={contact.id} className="border-t border-border hover:bg-surface-2/60">
                    <td className="p-3">
                      {canEdit && (
                        <Checkbox
                          checked={selected.includes(contact.id)}
                          onCheckedChange={(on) => setSelected((cur) => (on ? [...cur, contact.id] : cur.filter((id) => id !== contact.id)))}
                          aria-label={name}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <Link to="/app/contacts/$contactId" params={{ contactId: contact.id }} className="flex items-center gap-2 font-medium hover:underline">
                        <Avatar name={name} className="size-7" />
                        {name}
                      </Link>
                    </td>
                    <td className="p-3 text-fg-muted">{contact.phone}</td>
                    <td className="p-3 text-fg-muted">{contact.email}</td>
                    <td className="p-3 text-fg-muted">
                      {contact.companyId ? (
                        <Link to="/app/contacts/companies/$companyId" params={{ companyId: contact.companyId }} className="hover:underline">
                          {companyName[contact.companyId] ?? contact.companyId}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map((item) => (
                          <Badge key={item}>{item}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-3">{contact.stage}</td>
                    <td className="p-3 text-fg-muted">{contact.language.toUpperCase()}</td>
                    <td className="p-3">
                      <CreatedByChip kind={contact.createdBy.kind} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>{t('create.title')}</DialogTitle>
          <DialogDescription>{t('empty.body')}</DialogDescription>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="fn">{t('create.firstName')}</Label>
              <Input id="fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ln">{t('create.lastName')}</Label>
              <Input id="ln" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="ph">{t('columns.phone')}</Label>
              <Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" />
            </div>
            <Button
              disabled={!firstName || !lastName || createContact.isPending}
              onClick={() =>
                void createContact.mutateAsync({ firstName, lastName, phone: phone || null }).then((contact) => {
                  toast.success(t('created'))
                  setOpen(false)
                  void navigate({ to: '/app/contacts/$contactId', params: { contactId: contact.id } })
                })
              }
            >
              {t('create.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-lg">
          <DialogTitle>{t('groups.createTitle')}</DialogTitle>
          <DialogDescription>{t('groups.createBody')}</DialogDescription>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="group-name">{t('groups.name')}</Label>
              <Input id="group-name" value={draftName} onChange={(e) => setDraftName(e.target.value)} className="mt-1" placeholder={t('groups.nameHint')} />
            </div>
            <FilterFields
              state={draft}
              onChange={(patch) => setDraft((cur) => ({ ...cur, ...patch }))}
              fields={fields.data ?? []}
              companies={companies.data ?? []}
              fieldDef={draftField}
              t={t}
            />
            <p className="text-sm text-fg-muted">
              {countActive(draft) === 0 ? t('groups.needRules') : t('groups.preview')}
            </p>
            <Button
              disabled={!draftName.trim() || countActive(draft) === 0 || createList.isPending}
              onClick={() =>
                void createList.mutateAsync({ name: draftName.trim(), filters: toFilters(draft) }).then((saved) => {
                  toast.success(t('groups.saved'))
                  setSaveOpen(false)
                  applyList(saved)
                })
              }
            >
              {t('groups.create')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogTitle>{t('bulk.confirmTitle', { count: selected.length })}</DialogTitle>
          <DialogDescription>{t('bulk.confirmBody')}</DialogDescription>
          <Label htmlFor="del">{t('bulk.confirmLabel')}</Label>
          <Input id="del" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
          <Button
            variant="danger"
            className="mt-3"
            disabled={confirm !== 'DELETE'}
            onClick={() =>
              void bulkDelete.mutateAsync({ ids: selected, confirm }).then(() => {
                toast.success(t('bulk.deleted'))
                setDeleteOpen(false)
                setSelected([])
                setConfirm('')
                void list.refetch()
              })
            }
          >
            {t('bulk.delete')}
          </Button>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function FilterFields({
  state,
  onChange,
  fields,
  companies,
  fieldDef,
  t,
}: {
  state: FilterState
  onChange: (patch: Partial<FilterState>) => void
  fields: { key: string; label: string; options: string[] }[]
  companies: { id: string; name: string }[]
  fieldDef?: { key: string; label: string; options: string[] }
  t: (key: string) => string
}) {
  return (
    <>
      <FilterSelect label={t('filters.source')} value={state.source} onChange={(source) => onChange({ source })}>
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        {SOURCES.map((item) => (
          <SelectItem key={item} value={item}>
            {t(`source.${item}`)}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label={t('filters.stage')} value={state.stage} onChange={(stage) => onChange({ stage })}>
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        {STAGES.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label={t('filters.tag')} value={state.tag} onChange={(tag) => onChange({ tag })}>
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        {TAGS.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </FilterSelect>
      <FilterSelect label={t('filters.since')} value={state.since} onChange={(since) => onChange({ since })}>
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        <SelectItem value="7d">{t('since.7d')}</SelectItem>
        <SelectItem value="30d">{t('since.30d')}</SelectItem>
        <SelectItem value="90d">{t('since.90d')}</SelectItem>
      </FilterSelect>
      <FilterSelect
        label={t('filters.field')}
        value={state.fieldKey}
        onChange={(fieldKey) => onChange({ fieldKey, fieldValue: ALL })}
      >
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        {fields.map((item) => (
          <SelectItem key={item.key} value={item.key}>
            {item.label}
          </SelectItem>
        ))}
      </FilterSelect>
      {fieldDef && (
        <FilterSelect label={fieldDef.label} value={state.fieldValue} onChange={(fieldValue) => onChange({ fieldValue })}>
          <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
          {fieldDef.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </FilterSelect>
      )}
      <FilterSelect label={t('columns.company')} value={state.companyId} onChange={(companyId) => onChange({ companyId })}>
        <SelectItem value={ALL}>{t('filters.all')}</SelectItem>
        {companies.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.name}
          </SelectItem>
        ))}
      </FilterSelect>
    </>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <Label className="text-xs text-fg-muted">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
