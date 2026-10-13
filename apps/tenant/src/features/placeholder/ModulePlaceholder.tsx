import { Link, useLocation } from '@tanstack/react-router'
import { Compass, Hammer, Sparkles } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { NAV_VISIBILITY, type Role } from '@deskhand/schemas'
import { Button, Card, EmptyState, NoPermissionState, PageContainer, PageHeader, toast } from '@deskhand/ui'
import { useSession } from '../../api/queries'
import { ALL_NAV_ITEMS, isNavItemVisible, navItemForPath, type NavItem } from '../../shell/nav'

const PRIVILEGE_ORDER: Role[] = ['readonly', 'staff', 'manager', 'admin', 'owner']

function resolveItem(path: string): NavItem | undefined {
  const direct = navItemForPath(path)
  if (direct) return direct
  const segment = path.split('/')[2]
  return ALL_NAV_ITEMS.find((item) => item.area === segment)
}

/** Screens owned by later slices render this honest placeholder inside the real shell and permission rules. */
export function ModulePlaceholder() {
  const { t } = useTranslation('common')
  const { pathname } = useLocation()
  const session = useSession()
  const item = resolveItem(pathname)

  if (!item) {
    return (
      <PageContainer>
        <EmptyState icon={Compass} title={t('states.notFound.title')} description={t('states.notFound.body')} />
      </PageContainer>
    )
  }

  const title = t(`nav.${item.label}`)
  const { role } = session.membership
  if (!isNavItemVisible(item, role, session.account.aiMode)) {
    if (item.aiOnly && session.account.aiMode === 'manual') {
      return (
        <PageContainer>
          <PageHeader title={title} />
          <EmptyState icon={Sparkles} title={t('modules.noAi.title')} description={t('modules.noAi.body')} />
        </PageContainer>
      )
    }
    const allowedRoles = item.roles ?? NAV_VISIBILITY[item.area]
    const needed = PRIVILEGE_ORDER.find((r) => allowedRoles.includes(r)) ?? 'owner'
    return (
      <PageContainer>
        <PageHeader title={title} />
        <NoPermissionState
          roleLabel={t(`roles.${needed}`)}
          onRequestAccess={() => toast.success(t('states.noPermission.requested'))}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader title={title} description={t(`modules.${item.id}`)} />
      <Card>
        <EmptyState
          icon={item.icon}
          title={t('modules.placeholderTitle', { module: title })}
          description={t('modules.placeholderBody', { slice: item.slice })}
          action={
            <Button asChild variant="outline">
              <Link to="/dev/states">
                <Hammer />
                {t('modules.seeFoundation')}
              </Link>
            </Button>
          }
        />
      </Card>
    </PageContainer>
  )
}
