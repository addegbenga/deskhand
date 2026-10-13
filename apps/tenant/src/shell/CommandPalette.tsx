import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, CreditCard, Moon, Sun, User, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { can } from '@deskhand/schemas'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  usePreferences,
} from '@deskhand/ui'
import { useSearch, useSession } from '../api/queries'
import { useSelectedLocation } from '../lib/location'
import { visibleNavGroups } from './nav'

/** One box for contacts, pages and actions (PRD 28.2). */
export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const session = useSession()
  const { locationId } = useSelectedLocation(session)
  const [query, setQuery] = useState('')
  const search = useSearch(query, locationId)
  const theme = usePreferences((s) => s.theme)
  const setTheme = usePreferences((s) => s.setTheme)
  const { role } = session.membership

  const go = (to: string) => {
    onOpenChange(false)
    setQuery('')
    void navigate({ to })
  }

  const actions = [
    { id: 'contact', icon: User, label: t('quickCreate.contact'), to: '/app/contacts', allowed: can(role, 'contacts.edit') },
    { id: 'booking', icon: CalendarPlus, label: t('quickCreate.booking'), to: '/app/bookings', allowed: can(role, 'calendar.edit') },
    { id: 'payment', icon: CreditCard, label: t('quickCreate.paymentLink'), to: '/app/payments', allowed: can(role, 'messages.send') && role !== 'staff' },
    { id: 'invite', icon: UserPlus, label: t('search.actions.invite'), to: '/app/settings/team', allowed: can(role, 'team.manage') },
  ].filter((action) => action.allowed)

  return (
    <CommandDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setQuery('')
      }}
      title={t('search.title')}
    >
      <CommandInput value={query} onValueChange={setQuery} placeholder={t('search.placeholder')} />
      <CommandList>
        <CommandEmpty>{t('search.noResults')}</CommandEmpty>
        {search.isFetching && !search.data && <CommandLoading>{t('states.loading')}</CommandLoading>}
        {(search.data?.contacts.length ?? 0) > 0 && query.length >= 2 && (
          <CommandGroup heading={t('search.contacts')}>
            {search.data!.contacts.map((contact) => (
              <CommandItem
                key={contact.id}
                value={`contact-${contact.id}`}
                keywords={[contact.firstName, contact.lastName, contact.phone ?? '', contact.email ?? '', query]}
                onSelect={() => go(`/app/contacts/${contact.id}`)}
              >
                <User />
                <span className="flex-1 truncate">
                  {contact.firstName} {contact.lastName}
                </span>
                <span className="text-xs text-fg-muted" dir="ltr">
                  {contact.phone}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {actions.length > 0 && (
          <CommandGroup heading={t('search.actionsHeading')}>
            {actions.map((action) => (
              <CommandItem key={action.id} value={`action-${action.id}`} keywords={[action.label]} onSelect={() => go(action.to)}>
                <action.icon />
                {action.label}
              </CommandItem>
            ))}
            <CommandItem
              value="action-theme"
              keywords={[t('search.actions.theme')]}
              onSelect={() => {
                setTheme(theme === 'dark' ? 'light' : 'dark')
                onOpenChange(false)
              }}
            >
              {theme === 'dark' ? <Sun /> : <Moon />}
              {t('search.actions.theme')}
            </CommandItem>
          </CommandGroup>
        )}
        <CommandGroup heading={t('search.pages')}>
          {visibleNavGroups(role, session.account.aiMode)
            .flatMap((group) => group.items)
            .map((item) => (
              <CommandItem key={item.id} value={`page-${item.id}`} keywords={[t(`nav.${item.label}`)]} onSelect={() => go(item.to)}>
                <item.icon />
                {t(`nav.${item.label}`)}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
