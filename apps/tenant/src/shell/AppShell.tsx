import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet } from '@tanstack/react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import {
  OfflineBanner,
  PermissionProvider,
  Sidebar,
  SidebarButton,
  SidebarGroup,
  SidebarItem,
  StaleBanner,
  usePreferences,
  Wordmark,
} from '@deskhand/ui'
import { useNavSummary, useSession } from '../api/queries'
import { useConnectivity, useIsOffline } from '../lib/connectivity'
import { useSelectedLocation } from '../lib/location'
import { refreshStale } from '../lib/sync'
import { MobileNav } from './MobileNav'
import { visibleNavGroups } from './nav'
import { TopBar } from './TopBar'

export function AppShell() {
  const { t } = useTranslation('common')
  const session = useSession()
  const queryClient = useQueryClient()
  const { locationId } = useSelectedLocation(session)
  const { data: summary } = useNavSummary(locationId)
  const collapsed = usePreferences((s) => s.sidebarCollapsed)
  const setCollapsed = usePreferences((s) => s.setSidebarCollapsed)
  const offline = useIsOffline()
  const stale = useConnectivity((s) => s.stale)
  const groups = visibleNavGroups(session.membership.role, session.account.aiMode)

  const badgeFor = (badge?: 'unread' | 'approvals') =>
    badge === 'unread' ? (summary?.unreadConversations ?? 0) : badge === 'approvals' ? (summary?.approvalsWaiting ?? 0) : 0

  return (
    <PermissionProvider role={session.membership.role}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('app.skipToContent')}
      </a>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar collapsed={collapsed} className="max-md:hidden">
          <div className="flex h-14 items-center px-4 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:px-0">
            <Link to="/app/home" aria-label={t('nav.home')}>
              <Wordmark compact={collapsed} />
            </Link>
          </div>
          <nav aria-label={t('nav.primary')} className="flex-1 overflow-y-auto">
            {groups.map((group) => (
              <SidebarGroup key={group.id} label={group.label ? t(`nav.groups.${group.label}`) : undefined}>
                {group.items.map((item) => {
                  const count = badgeFor(item.badge)
                  return (
                    <SidebarItem
                      key={item.id}
                      asChild
                      icon={<item.icon aria-hidden />}
                      label={t(`nav.${item.label}`)}
                      badge={count}
                      badgeLabel={item.badge ? t(`nav.badges.${item.badge}`, { count }) : undefined}
                    >
                      <Link to={item.to} />
                    </SidebarItem>
                  )
                })}
              </SidebarGroup>
            ))}
          </nav>
          <div className="border-t border-sidebar-border p-2">
            <SidebarButton
              onClick={() => setCollapsed(!collapsed)}
              label={collapsed ? t('nav.expand') : t('nav.collapse')}
              icon={collapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />}
            />
          </div>
        </Sidebar>

        <div className="flex min-w-0 flex-1 flex-col">
          {offline && <OfflineBanner />}
          <TopBar />
          <main id="main" className="relative flex min-h-0 flex-1 flex-col overflow-hidden pb-20 md:pb-0">
            {stale && (
              <div className="px-4 pt-4 sm:px-6 lg:px-8">
                <StaleBanner onRefresh={() => refreshStale(queryClient)} className="mx-auto max-w-6xl" />
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>
      <MobileNav summary={summary} />
    </PermissionProvider>
  )
}
