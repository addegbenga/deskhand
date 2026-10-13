import { useNavigate } from '@tanstack/react-router'
import { ArrowRight, Building2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  Popover,
  PopoverAnchor,
  PopoverContent,
  StatusChip,
} from '@deskhand/ui'
import { useTenantSearch } from '../api/queries'
import { useRegion } from '../lib/region'
import { useDebounced } from '../lib/use-debounced'

/** Persistent tenant search in the console header (FE-DOC 5). Tenant 360 arrives in S10; picks open the filtered list. */
export function TenantSearch() {
  const { t } = useTranslation('admin')
  const navigate = useNavigate()
  const region = useRegion((s) => s.region)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const debounced = useDebounced(q.trim())
  const { data, isFetching } = useTenantSearch({ q: debounced, region }, open)

  const go = (query: string) => {
    setOpen(false)
    setQ('')
    void navigate({ to: '/tenants', search: { q: query } })
  }

  return (
    <Command shouldFilter={false} loop className="w-full max-w-md bg-transparent" label={t('search.label')}>
      <Popover open={open && q.trim().length > 0} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef}>
            <CommandInput
              value={q}
              onValueChange={(value) => {
                setQ(value)
                setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
              }}
              placeholder={t('search.placeholder')}
              aria-label={t('search.label')}
              wrapperClassName="h-9 rounded-md border border-border bg-surface"
              className="h-9"
            />
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-72 p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (event.target instanceof Node && anchorRef.current?.contains(event.target)) event.preventDefault()
          }}
        >
          <CommandList>
            {isFetching && !data && <CommandLoading>{t('common:states.loading')}</CommandLoading>}
            {data && <CommandEmpty>{t('search.empty')}</CommandEmpty>}
            {data && data.items.length > 0 && (
              <CommandGroup heading={t('search.results', { count: data.total })}>
                {data.items.map((tenant) => (
                  <CommandItem key={tenant.id} value={tenant.id} onSelect={() => go(tenant.name)}>
                    <Building2 />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{tenant.name}</span>
                      <span className="block truncate text-xs text-fg-muted">
                        {tenant.ownerName} · {t(`devtools:markets.${tenant.market}`)}
                      </span>
                    </span>
                    <StatusChip domain="account" value={tenant.state} />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {data && data.items.length > 0 && (
              <CommandGroup>
                <CommandItem value="__all" onSelect={() => go(q.trim())}>
                  <ArrowRight className="rtl:rotate-180" />
                  {t('search.viewAll')}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </PopoverContent>
      </Popover>
    </Command>
  )
}
