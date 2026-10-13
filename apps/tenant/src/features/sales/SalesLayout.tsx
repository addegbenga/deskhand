import { Outlet } from '@tanstack/react-router'
import { useTranslation } from '@deskhand/i18n'
import { SALES_PAGE_IDS } from '@deskhand/schemas'
import { PageContainer, PageHeader } from '@deskhand/ui'
import { GrowTabs } from '../grow/GrowTabs'

export function SalesLayout() {
  const { t } = useTranslation('pipeline')
  return (
    <PageContainer className="flex max-w-none flex-col">
      <PageHeader title={t('salesTitle')} description={t('salesHint')} />
      <GrowTabs items={SALES_PAGE_IDS.map((id) => ({ to: `/app/sales/${id}`, label: t(`tabs.${id}`) }))} />
      <div className="mt-6 min-h-0 flex-1">
        <Outlet />
      </div>
    </PageContainer>
  )
}
