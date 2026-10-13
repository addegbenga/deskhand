import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import { BRAND_NAME } from '@deskhand/config'
import { useTranslation } from '@deskhand/i18n'
import {
  Badge,
  Drawer,
  DrawerContent,
  DrawerTitle,
  IconButton,
  OfflineBanner,
  Sidebar,
  SidebarButton,
  SidebarGroup,
  SidebarItem,
  usePreferences,
  Wordmark,
} from '@deskhand/ui'
import { useAdminSession } from '../api/queries'
import { useIsOffline } from '../lib/connectivity'
import { AdminAccountMenu } from './AdminAccountMenu'
import { ImpersonationBanner } from './ImpersonationBanner'
import { MaskedIndicator } from './MaskedIndicator'
import { visibleAdminNav, type AdminNavItem } from './nav'
import { RegionSwitch } from './RegionSwitch'
import { TenantSearch } from './TenantSearch'

function NavLink({ item, onNavigate }: { item: AdminNavItem; onNavigate?: () => void }) {
  const { t } = useTranslation('admin')
  const icon = <item.icon aria-hidden />
  const label = t(`nav.${item.id}`)
  if (item.id === 'overview') {
    return (
      <SidebarItem asChild icon={icon} label={label}>
        <Link to="/" activeOptions={{ exact: true }} onClick={onNavigate} />
      </SidebarItem>
    )
  }
  if (item.id === 'tenants') {
    return (
      <SidebarItem asChild icon={icon} label={label}>
        <Link to="/tenants" onClick={onNavigate} />
      </SidebarItem>
    )
  }
  return (
    <SidebarItem asChild icon={icon} label={label}>
      <Link to="/$module" params={{ module: item.id }} onClick={onNavigate} />
    </SidebarItem>
  )
}

function NavGroups({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('admin')
  const session = useAdminSession()
  return (
    <nav aria-label={t('nav.label')} className="flex-1 overflow-y-auto">
      {visibleAdminNav(session.persona).map((group) => (
        <SidebarGroup key={group.id} label={group.label ? t(`nav.groups.${group.label}`) : undefined}>
          {group.items.map((item) => (
            <NavLink key={item.id} item={item} onNavigate={onNavigate} />
          ))}
        </SidebarGroup>
      ))}
    </nav>
  )
}

/** Admin shell (FE-DOC 5): slate accent, PRD 31.2 navigation, persistent tenant search, region, masking, impersonation. */
export function AdminShell() {
  const { t } = useTranslation('admin')
  const collapsed = usePreferences((s) => s.sidebarCollapsed)
  const setCollapsed = usePreferences((s) => s.setSidebarCollapsed)
  const offline = useIsOffline()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMobileOpen(false), [pathname])

  const brand = (
    <Link to="/" aria-label={t('consoleName', { brand: BRAND_NAME })} className="text-sidebar-fg">
      <Wordmark compact={collapsed} suffix={t('internal')} />
    </Link>
  )

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        {t('common:app.skipToContent')}
      </a>
      <div className="flex h-dvh flex-col overflow-hidden">
        <ImpersonationBanner />
        <div className="flex min-h-0 flex-1">
          <Sidebar collapsed={collapsed} className="max-md:hidden">
            <div className="flex h-14 items-center px-4 group-data-[collapsed]/sidebar:justify-center group-data-[collapsed]/sidebar:px-0">
              {brand}
            </div>
            <NavGroups />
            <div className="border-t border-sidebar-border p-2">
              <SidebarButton
                onClick={() => setCollapsed(!collapsed)}
                label={collapsed ? t('common:nav.expand') : t('common:nav.collapse')}
                icon={collapsed ? <PanelLeftOpen className="rtl:rotate-180" /> : <PanelLeftClose className="rtl:rotate-180" />}
              />
            </div>
          </Sidebar>

          <div className="flex min-w-0 flex-1 flex-col">
            {offline && <OfflineBanner />}
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 sm:gap-3 sm:px-4">
              <IconButton label={t('nav.label')} variant="ghost" className="md:hidden" onClick={() => setMobileOpen(true)}>
                <Menu />
              </IconButton>
              <TenantSearch />
              <div className="ms-auto flex items-center gap-2 sm:gap-3">
                <Badge tone="neutral" className="max-lg:hidden">
                  {t('internal')}
                </Badge>
                <MaskedIndicator />
                <RegionSwitch />
                <AdminAccountMenu />
              </div>
            </header>
            <main id="main" className="min-h-0 flex-1 overflow-y-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </div>

      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent side="start" className="w-72 gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-fg" aria-describedby={undefined}>
          <DrawerTitle className="sr-only">{t('nav.label')}</DrawerTitle>
          <div className="group/sidebar flex h-full flex-col">
            <div className="flex h-14 items-center px-4">{brand}</div>
            <NavGroups onNavigate={() => setMobileOpen(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
