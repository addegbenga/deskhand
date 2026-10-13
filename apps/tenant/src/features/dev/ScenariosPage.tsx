import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { resetScenario, SCENARIO_IDS, SCENARIOS, useDevSettings, type ScenarioId } from '@deskhand/mock-api'
import { switchScenario } from '@deskhand/mock-api/toolbar'
import { Badge, Button, Card, PageContainer, PageHeader, StatusChip, toast } from '@deskhand/ui'

/** /dev/scenarios: switch seed scenarios without a reload (FE-DOC 6, 8.2). */
export function ScenariosPage() {
  const { t } = useTranslation('devtools')
  const current = useDevSettings((s) => s.scenario)
  const [busy, setBusy] = useState<ScenarioId | null>(null)

  const choose = async (id: ScenarioId) => {
    setBusy(id)
    try {
      await switchScenario(id)
      toast.success(t('switched', { name: SCENARIOS[id].business }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('common:dev.scenariosTitle')}
        description={t('scenariosIntro')}
        action={
          <Button variant="outline" onClick={() => void resetScenario().then(() => toast.success(t('resetDone')))}>
            {t('reset')}
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {SCENARIO_IDS.map((id) => {
          const scenario = SCENARIOS[id]
          const active = id === current
          return (
            <Card key={id} className={active ? 'border-brand ring-1 ring-brand' : undefined}>
              <div className="flex h-full flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-fg-muted">{t('scenarioLabel', { id })}</p>
                    <h2 className="text-base font-semibold">{scenario.business}</h2>
                  </div>
                  {scenario.available ? <StatusChip domain="account" value={scenario.state} /> : <Badge>{t('later')}</Badge>}
                </div>
                <p className="text-sm text-fg-muted">{t(`scenarios.${id}.purpose`)}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge>{t(`markets.${scenario.market}`)}</Badge>
                  <Badge tone="ai">{t(`common:ai.status.${scenario.aiMode}`)}</Badge>
                  <Badge>{t(`industries.${scenario.industry}`)}</Badge>
                </div>
                <div className="mt-auto pt-2">
                  {active ? (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-brand">
                      <Check className="size-4" aria-hidden />
                      {t('current')}
                    </p>
                  ) : (
                    <Button variant="outline" size="sm" disabled={!scenario.available || busy !== null} onClick={() => void choose(id)}>
                      {busy === id ? t('switching') : t('switchTo')}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </PageContainer>
  )
}
