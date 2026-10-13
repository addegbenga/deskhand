import { Link, useNavigate } from '@tanstack/react-router'
import { Sparkles } from 'lucide-react'
import { formatMoney, useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import {
  AutonomyChip,
  Button,
  EmployeeCard,
  EmptyState,
  ErrorState,
  LanguageTierBadge,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Skeleton,
  StatusChip,
  toast,
  usePermission,
} from '@deskhand/ui'
import { useCreateEmployee, useDuplicateEmployee, useEmployees, useKillEmployee } from '../../api/ai'
import { useSession } from '../../api/queries'
import { useLocaleContext } from '../../lib/location'

export function EmployeeListPage() {
  const { t } = useTranslation(['ai', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const access = usePermission('ai.manage')
  const list = useEmployees()
  const create = useCreateEmployee()
  const dup = useDuplicateEmployee()
  const kill = useKillEmployee()
  const navigate = useNavigate()

  if (!canSeeArea(session.membership.role, 'ai') || !access.allowed) {
    return (
      <PageContainer>
        <PageHeader title={t('list.title')} />
        <NoPermissionState roleLabel={t(`common:roles.${access.requiredRole}`)} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('list.title')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void navigate({ to: '/app/ai/new/voice' })}>
              {t('list.voice')}
            </Button>
            <Button onClick={() => void navigate({ to: '/app/ai/new/chat' })}>{t('list.chat')}</Button>
          </div>
        }
      />
      {list.isPending && <Skeleton className="h-40" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          icon={Sparkles}
          title={t('list.empty.title')}
          description={t('list.empty.body')}
          action={
            <Button
              onClick={() =>
                void create.mutateAsync({ kind: 'chat', template: 'receptionist', name: 'Ada' }).then((emp) =>
                  navigate({ to: '/app/ai/employees/$employeeId/$tab', params: { employeeId: emp.id, tab: 'overview' } }),
                )
              }
            >
              {t('list.create')}
            </Button>
          }
        />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.map((employee) => (
          <EmployeeCard
            key={employee.id}
            name={employee.name}
            meta={
              <>
                <StatusChip domain="employee" value={employee.status} />
                {employee.languages.map((lang) => (
                  <span key={lang.code} className="inline-flex items-center gap-1">
                    {t(`common:languages.${lang.code}`, { defaultValue: lang.code })}
                    <LanguageTierBadge tier={lang.tier} />
                    <AutonomyChip level={lang.autonomy} />
                  </span>
                ))}
              </>
            }
          >
            <p className="text-sm text-fg-muted">
              {t('list.handled', { count: employee.conversationsThisMonth })} · {t('list.handoff', { rate: Math.round(employee.handoffRate * 100) })}
            </p>
            <p className="text-sm text-fg-muted">{t('list.cost', { amount: formatMoney(employee.costThisMonth, employee.currency, ctx.locale) })}</p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link to="/app/ai/employees/$employeeId/$tab" params={{ employeeId: employee.id, tab: 'overview' }}>
                  {t('list.open')}
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => void dup.mutateAsync(employee.id).then(() => void list.refetch())}>
                {t('list.duplicate')}
              </Button>
              {employee.status !== 'paused' && (
                <Button
                  size="sm"
                  variant="danger-outline"
                  onClick={() =>
                    void kill.mutateAsync(employee.id).then(() => {
                      toast.success(t('kill.paused'))
                      void list.refetch()
                    })
                  }
                >
                  {t('list.pause')}
                </Button>
              )}
            </div>
          </EmployeeCard>
        ))}
      </div>
    </PageContainer>
  )
}
