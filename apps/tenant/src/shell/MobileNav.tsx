import { Link } from '@tanstack/react-router'
import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import type { NavSummary } from '@deskhand/schemas'
import { BottomNav, BottomNavItem, Drawer, DrawerContent, DrawerTitle, SidebarGroup, SidebarItem } from '@deskhand/ui'
import { useSession } from '../api/queries'
import { bottomNavItems, visibleNavGroups } from './nav'

export function MobileNav({ summary }: { summary?: NavSummary }) {
  const { t } = useTranslation('common')
  const session = useSession()
  const [moreOpen, setMoreOpen] = useState(false)
  const { role } = session.membership
  const { aiMode } = session.account
  const primary = bottomNavItems(role, aiMode)
  const primaryIds = new Set(primary.map((item) => item.id))
  const rest = visibleNavGroups(role, aiMode)
    .map((group) => ({ ...group, items: group.items.filter((item) => !primaryIds.has(item.id)) }))
    .filter((group) => group.items.length > 0)

  const badgeFor = (badge?: 'unread' | 'approvals') =>
    badge === 'unread' ? (summary?.unreadConversations ?? 0) : badge === 'approvals' ? (summary?.approvalsWaiting ?? 0) : 0

  return (
    <>
      <BottomNav label={t('nav.primary')}>
        {primary.map((item) => (
          <BottomNavItem key={item.id} asChild icon={<item.icon aria-hidden />} label={t(`nav.${item.label}`)} badge={badgeFor(item.badge)}>
            <Link to={item.to} />
          </BottomNavItem>
        ))}
        <BottomNavItem asChild icon={<Ellipsis aria-hidden />} label={t('nav.more')}>
          <button type="button" onClick={() => setMoreOpen(true)} />
        </BottomNavItem>
      </BottomNav>
      <Drawer open={moreOpen} onOpenChange={setMoreOpen}>
        <DrawerContent side="bottom" className="gap-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]" aria-describedby={undefined}>
          <DrawerTitle className="px-4 pt-4 text-base">{t('nav.more')}</DrawerTitle>
          <nav aria-label={t('nav.more')} className="py-2">
            {rest.map((group) => (
              <SidebarGroup key={group.id} label={group.label ? t(`nav.groups.${group.label}`) : undefined}>
                {group.items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    asChild
                    icon={<item.icon aria-hidden />}
                    label={t(`nav.${item.label}`)}
                    badge={badgeFor(item.badge)}
                    className="h-11"
                  >
                    <Link to={item.to} onClick={() => setMoreOpen(false)} />
                  </SidebarItem>
                ))}
              </SidebarGroup>
            ))}
          </nav>
        </DrawerContent>
      </Drawer>
    </>
  )
}
