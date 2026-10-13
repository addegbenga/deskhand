import { Outlet } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { COMPLIANCE_PAGE_IDS } from '@deskhand/schemas'
import { PageContainer, PageHeader } from '@deskhand/ui'
import { GrowTabs } from '../grow/GrowTabs'

export function ComplianceLayout() {
  const { t } = useTranslation('governance')
  return (
    <PageContainer>
      <PageHeader title={t('title')} description={t('notAdvice')} />
      <GrowTabs items={COMPLIANCE_PAGE_IDS.map((id) => ({ to: `/app/compliance/${id}`, label: t(`pages.${id}`) }))} />
      <div className="mt-6">
        <Outlet />
      </div>
    </PageContainer>
  )
}
