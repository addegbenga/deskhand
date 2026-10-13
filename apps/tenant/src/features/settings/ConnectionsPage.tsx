import { useTranslation } from '@deskhand/i18n'
import { canSeeArea } from '@deskhand/schemas'
import {
  Button,
  ConnectionTile,
  ErrorState,
  NoPermissionState,
  PageContainer,
  PageHeader,
  Skeleton,
  toast,
} from '@deskhand/ui'
import { useConnectionAction, useConnectionEvents, useConnections } from '../../api/settings'
import { useSession } from '../../api/queries'
import { WidgetSnippet } from './WidgetSnippet'

export function ConnectionsPage() {
  const { t } = useTranslation(['settings', 'common'])
  const session = useSession()
  const hub = useConnections()
  const events = useConnectionEvents(['owner', 'admin'].includes(session.membership.role))
  const action = useConnectionAction()

  if (!canSeeArea(session.membership.role, 'connections') && session.membership.role !== 'staff') {
    return (
      <PageContainer>
        <PageHeader title={t('connections.title')} />
        <NoPermissionState roleLabel={t('common:roles.admin')} />
      </PageContainer>
    )
  }
  if (hub.isPending) return <Skeleton className="h-40" />
  if (hub.isError) return <ErrorState onRetry={() => void hub.refetch()} />

  const run = (kind: string, next: 'connect' | 'test' | 'fix' | 'disconnect') => {
    void action.mutateAsync({ kind, action: next }).then(
      (result) => toast.success(result.detail),
      () => toast.error(t('common:actions.retry')),
    )
  }

  return (
    <PageContainer>
      <PageHeader title={t('connections.title')} />
      <div className="space-y-8">
        {hub.data?.groups.map((group) => (
          <section key={group.id}>
            <h2 className="mb-3 text-sm font-semibold">{t(`connections.groups.${group.id}`)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.cards.map((card) => (
                <ConnectionTile
                  key={card.kind}
                  card={card}
                  title={t(`connections.kinds.${card.kind}`)}
                  status={t(`connections.status.${card.status}`)}
                  model={t(card.ownerModel === 'we_manage' ? 'connections.weManage' : 'connections.youConnect')}
                  problem={card.problem ? t(`connections.problem.${card.problem}`) : null}
                  footer={
                    card.kind === 'webchat' ? <WidgetSnippet slug={session.account.slug} /> : undefined
                  }
                  actions={
                    <div className="flex flex-wrap gap-2">
                      {card.status === 'not_connected' && (
                        <Button size="sm" onClick={() => run(card.kind, 'connect')}>
                          {t('connections.connect')}
                        </Button>
                      )}
                      {card.status !== 'not_connected' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => run(card.kind, 'test')}>
                            {t('connections.test')}
                          </Button>
                          {card.status === 'needs_attention' && (
                            <Button size="sm" onClick={() => run(card.kind, 'fix')}>
                              {t('connections.fix')}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => run(card.kind, 'disconnect')}>
                            {t('connections.disconnect')}
                          </Button>
                        </>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          </section>
        ))}
        <section>
          <h2 className="mb-2 text-sm font-semibold">{t('connections.history')}</h2>
          <ul className="space-y-1 text-sm text-fg-muted">
            {events.data?.map((event) => (
              <li key={event.id}>
                {event.actorName} · {event.action} · {event.kind}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageContainer>
  )
}
