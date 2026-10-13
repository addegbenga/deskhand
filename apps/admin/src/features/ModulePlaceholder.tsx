import { Compass } from 'lucide-react'
import { useTranslation } from '@deskhand/i18n'
import { Card, EmptyState, PageContainer, PageHeader } from '@deskhand/ui'
import { adminItem } from '../shell/nav'
import { ModuleGate } from './ModuleGate'

/** Modules owned by later slices render inside the real shell and persona rules. */
export function ModulePlaceholder({ module }: { module: string }) {
  const { t } = useTranslation('admin')
  const item = adminItem(module)
  if (!item) {
    return (
      <PageContainer>
        <EmptyState icon={Compass} title={t('common:states.notFound.title')} description={t('common:states.notFound.body')} />
      </PageContainer>
    )
  }
  const title = t(`nav.${item.id}`)
  return (
    <ModuleGate module={item.id}>
      <PageContainer>
        <PageHeader title={title} description={t(`modules.${item.id}`)} />
        <Card>
          <EmptyState
            icon={item.icon}
            title={t('modules.placeholderTitle', { module: title })}
            description={t('modules.placeholderBody', { slice: item.slice })}
          />
        </Card>
      </PageContainer>
    </ModuleGate>
  )
}
