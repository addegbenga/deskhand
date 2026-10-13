import { Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import type { AdminModule } from '@deskhand/schemas'
import { EmptyState, PageContainer, PageHeader } from '@deskhand/ui'
import { useAdminSession } from '../api/queries'
import { canOpenModule } from '../shell/nav'

/** Persona access check for every console module (PRD 31.1). Direct links to hidden modules land here. */
export function ModuleGate({ module, children }: { module: AdminModule; children: ReactNode }) {
  const { t } = useTranslation('admin')
  const session = useAdminSession()
  if (canOpenModule(session.persona, module)) return children
  const name = t(`nav.${module}`)
  return (
    <PageContainer>
      <PageHeader title={name} />
      <EmptyState icon={Lock} title={t('noAccess.title')} description={t('noAccess.body', { module: name })} />
    </PageContainer>
  )
}
