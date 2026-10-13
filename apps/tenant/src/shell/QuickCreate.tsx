import { useNavigate } from '@tanstack/react-router'
import { CalendarPlus, CreditCard, MessageSquare, Newspaper, Plus, SquareCheck, User } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { can, canSeeArea } from '@deskhand/schemas'
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@deskhand/ui'
import { useSession } from '../api/queries'

/** Contact, booking, message, payment link, post, task (PRD 28.2). Items follow the role matrix. */
export function QuickCreate() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const { membership } = useSession()
  const role = membership.role

  const items = [
    { id: 'contact', icon: User, to: '/app/contacts', allowed: can(role, 'contacts.edit') },
    { id: 'booking', icon: CalendarPlus, to: '/app/bookings', allowed: can(role, 'calendar.edit') },
    { id: 'message', icon: MessageSquare, to: '/app/inbox', allowed: can(role, 'messages.send') },
    { id: 'paymentLink', icon: CreditCard, to: '/app/payments', allowed: canSeeArea(role, 'payments') && role !== 'staff' },
    { id: 'post', icon: Newspaper, to: '/app/marketing', allowed: can(role, 'publishing.approve') },
    { id: 'task', icon: SquareCheck, to: '/app/tasks', allowed: canSeeArea(role, 'tasks') },
  ].filter((item) => item.allowed)

  if (items.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="gap-1.5 max-sm:size-9 max-sm:px-0" aria-label={t('topbar.quickCreate')}>
          <Plus />
          <span className="max-sm:sr-only">{t('topbar.create')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onSelect={() =>
              void (item.id === 'task'
                ? navigate({ to: '/app/tasks', search: { create: true } })
                : navigate({ to: item.to }))
            }
          >
            <item.icon />
            {t(`quickCreate.${item.id}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
