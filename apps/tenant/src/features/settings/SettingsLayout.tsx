import { Outlet } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { SETTINGS_PAGE_IDS } from '@deskhand/schemas'
import { PageContainer, PageHeader } from '@deskhand/ui'
import { GrowTabs } from '../grow/GrowTabs'

export function SettingsLayout() {
  const { t } = useTranslation('settings')
  return (
    <PageContainer>
      <PageHeader title={t('title')} />
      <GrowTabs items={SETTINGS_PAGE_IDS.map((id) => ({ to: `/app/settings/${id}`, label: t(`pages.${id}`) }))} />
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContainer>
  )
}
