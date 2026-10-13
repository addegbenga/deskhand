import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronDown, ChevronUp, Workflow, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { canSeeArea, type ChannelKind, type Recipe, type RecipeGoal, type RecipePack } from '@deskhand/schemas'
import { isApiError } from '../../api/client'
import { useEmployees } from '../../api/ai'
import { useContacts, useTemplates } from '../../api/crm'
import {
  useCreateRecipe,
  usePatchRecipe,
  useRecipe,
  useRecipePacks,
  useRecipeRuns,
  useRecipes,
  useTestRecipe,
} from '../../api/grow'
import { useConnections } from '../../api/settings'
import { useSession } from '../../api/queries'
import { useLocaleContext, useSelectedLocation } from '../../lib/location'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  EmptyState,
  ErrorState,
  Input,
  Label,
  NoPermissionState,
  PageContainer,
  PageHeader,
  RecipeCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch,
  toast,
} from '@deskhand/ui'

const GOALS: RecipeGoal[] = ['respond', 'follow_up', 'book', 'remind', 'review', 'win_back']
const CHANNEL_OPTIONS: ChannelKind[] = ['whatsapp', 'email', 'sms']

function connectedKinds(groups: { cards: { kind: string; status: string }[] }[] | undefined) {
  const set = new Set<string>()
  for (const group of groups ?? []) {
    for (const card of group.cards) {
      if (card.status === 'connected') set.add(card.kind)
    }
  }
  return set
}

function missingFor(recipe: { requiredConnections: string[] }, connected: Set<string>) {
  return recipe.requiredConnections.filter((kind) => !connected.has(kind))
}

function formatWhen(iso: string | null | undefined, locale: string, timeZone: string) {
  if (!iso) return null
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(new Date(iso))
}

export function AutomationsPage() {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const list = useRecipes()
  const packs = useRecipePacks()
  const create = useCreateRecipe()
  const connections = useConnections()
  const templates = useTemplates()
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const [packKey, setPackKey] = useState<RecipePack['key']>('win_back')
  const [name, setName] = useState('')
  const connected = connectedKinds(connections.data?.groups)
  const byGoal = useMemo(() => {
    const groups = new Map<RecipeGoal, Recipe[]>()
    for (const goal of GOALS) groups.set(goal, [])
    for (const recipe of list.data ?? []) {
      groups.get(recipe.goal)?.push(recipe)
    }
    return GOALS.filter((goal) => (groups.get(goal) ?? []).length > 0).map((goal) => ({
      goal,
      recipes: groups.get(goal) ?? [],
    }))
  }, [list.data])

  const cardLabels = {
    on: t('automations.enabled'),
    off: t('automations.off'),
    enrolled: t('automations.enrolled'),
    completed: t('automations.completed'),
    replied: t('automations.replied'),
    converted: t('automations.converted'),
    lastRun: t('automations.lastRun'),
    never: t('automations.never'),
    needsConnection: t('automations.needsConnection'),
  }

  if (!canSeeArea(session.membership.role, 'automations')) {
    return (
      <PageContainer>
        <PageHeader title={t('automations.title')} />
        <NoPermissionState roleLabel={t('common:roles.admin')} />
      </PageContainer>
    )
  }

  const packList = packs.data ?? []
  const chosenPack = packList.find((item) => item.key === packKey) ?? packList[0]
  const approved = (templates.data ?? []).filter((item) => item.status === 'approved')

  return (
    <PageContainer>
      <PageHeader
        title={t('automations.title')}
        description={t('automations.subtitle')}
        action={<Button onClick={() => setCreating(true)}>{t('automations.newFromPack')}</Button>}
      />
      {list.isPending && <Skeleton className="h-40" />}
      {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
      {list.data?.length === 0 && (
        <EmptyState
          icon={Workflow}
          title={t('automations.empty.title')}
          description={t('automations.empty.body')}
          action={<Button onClick={() => setCreating(true)}>{t('automations.newFromPack')}</Button>}
        />
      )}
      <div className="space-y-8">
        {byGoal.map((group) => (
          <section key={group.goal}>
            <h2 className="mb-3 text-sm font-semibold text-fg">{t(`automations.goals.${group.goal}`)}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.recipes.map((recipe) => (
                <RecipeListCard key={recipe.id} recipe={recipe} labels={cardLabels} connected={connected} locale={ctx.locale} timeZone={ctx.timeZone} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogTitle>{t('automations.newFromPack')}</DialogTitle>
          <p className="text-sm text-fg-muted">{t('automations.createHint')}</p>
          <div className="space-y-3">
            <div>
              <Label>{t('automations.pack')}</Label>
              {chosenPack && (
                <Select
                  value={chosenPack.key}
                  onValueChange={(value) => {
                    setPackKey(value as RecipePack['key'])
                    setName('')
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {packList.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {chosenPack && <p className="text-sm text-fg-muted">{chosenPack.description}</p>}
            <div>
              <Label htmlFor="recipe-name">{t('automations.recipeName')}</Label>
              <Input
                id="recipe-name"
                className="mt-1"
                value={name}
                placeholder={chosenPack?.name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            {approved.length === 0 && <p className="text-sm text-fg-muted">{t('automations.needTemplate')}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              disabled={!chosenPack || create.isPending}
              onClick={() =>
                void create
                  .mutateAsync({
                    packKey: chosenPack!.key,
                    name: name.trim().length >= 2 ? name.trim() : undefined,
                    templateId: approved[0]?.id,
                  })
                  .then((row) => {
                    toast.success(t('automations.created'))
                    setCreating(false)
                    setName('')
                    void navigate({ to: '/app/automations/$recipeId', params: { recipeId: row.id } })
                  })
              }
            >
              {t('automations.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function RecipeListCard({
  recipe,
  labels,
  connected,
  locale,
  timeZone,
}: {
  recipe: Recipe
  labels: Parameters<typeof RecipeCard>[0]['labels']
  connected: Set<string>
  locale: string
  timeZone: string
}) {
  const { t } = useTranslation('grow')
  const patch = usePatchRecipe(recipe.id)
  return (
    <RecipeCard
      recipe={recipe}
      labels={labels}
      lastRunText={formatWhen(recipe.lastRunAt, locale, timeZone) ?? undefined}
      missingConnections={missingFor(recipe, connected)}
      toggle={
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={recipe.enabled} onCheckedChange={(enabled) => void patch.mutateAsync({ enabled })} />
          {recipe.enabled ? t('automations.enabled') : t('automations.off')}
        </label>
      }
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/app/automations/$recipeId" params={{ recipeId: recipe.id }}>
            {t('automations.open')}
          </Link>
        </Button>
      }
    />
  )
}

export function RecipeDetailPage({ recipeId }: { recipeId: string }) {
  const { t } = useTranslation(['grow', 'common'])
  const session = useSession()
  const ctx = useLocaleContext(session)
  const { locationId } = useSelectedLocation(session)
  const recipe = useRecipe(recipeId)
  const runs = useRecipeRuns(recipeId)
  const patch = usePatchRecipe(recipeId)
  const test = useTestRecipe(recipeId)
  const templates = useTemplates()
  const employees = useEmployees()
  const contacts = useContacts({ q: '', locationId })
  const connections = useConnections()
  const navigate = useNavigate()
  const people = contacts.data?.items ?? []
  const [contactId, setContactId] = useState(people[0]?.id ?? '')
  const [runQuery, setRunQuery] = useState('')
  const data = recipe.data
  const connected = connectedKinds(connections.data?.groups)

  if (!canSeeArea(session.membership.role, 'automations')) {
    return (
      <PageContainer>
        <PageHeader title={t('automations.title')} />
        <NoPermissionState roleLabel={t('common:roles.admin')} />
      </PageContainer>
    )
  }
  if (recipe.isPending || !data) {
    return (
      <PageContainer>
        <Skeleton className="h-40" />
      </PageContainer>
    )
  }
  if (recipe.isError) return <ErrorState onRetry={() => void recipe.refetch()} />

  const forChannel = (templates.data ?? []).filter((item) => data.channels.includes(item.channel))
  const pickedContact = contactId || people[0]?.id || ''
  const filteredRuns = (runs.data ?? []).filter((run) =>
    run.contactName.toLowerCase().includes(runQuery.trim().toLowerCase()),
  )
  const missing = missingFor(data, connected)

  return (
    <PageContainer>
      <PageHeader
        title={data.name}
        description={data.description}
        action={
          <Button variant="outline" onClick={() => void navigate({ to: '/app/automations' })}>
            {t('common:actions.close')}
          </Button>
        }
      />
      <div className="flex flex-col gap-6">
        <p className="text-sm text-fg-muted">{data.expected}</p>
        {missing.length > 0 && (
          <p className="text-sm text-attention">
            {t('automations.needsConnection')}: {missing.join(', ')}
          </p>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={data.enabled} onCheckedChange={(enabled) => void patch.mutateAsync({ enabled })} />
          {data.enabled ? t('automations.enabled') : t('automations.off')}
        </label>

        <div>
          <Label>{t('automations.delays')}</Label>
          <Input
            className="mt-1"
            defaultValue={data.delayHours.join(', ')}
            onBlur={(event) =>
              void patch.mutateAsync({
                delayHours: event.target.value
                  .split(',')
                  .map((part) => Number(part.trim()))
                  .filter((n) => !Number.isNaN(n)),
              })
            }
          />
        </div>

        <ChannelOrder
          value={data.channels}
          onChange={(channels) => void patch.mutateAsync({ channels })}
        />

        <div>
          <Label>{t('automations.template')}</Label>
          <Select
            value={data.templateId ?? '__none'}
            onValueChange={(value) => void patch.mutateAsync({ templateId: value === '__none' ? null : value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder={t('automations.needTemplate')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('automations.noTemplate')}</SelectItem>
              {forChannel.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name} ({item.language} · {item.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>{t('automations.employee')}</Label>
          <Select
            value={data.employeeId ?? '__none'}
            onValueChange={(value) => void patch.mutateAsync({ employeeId: value === '__none' ? null : value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">{t('automations.noEmployee')}</SelectItem>
              {(employees.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t('automations.stops')}</p>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.stopOnReply} onCheckedChange={(stopOnReply) => void patch.mutateAsync({ stopOnReply })} />
            {t('automations.stopOnReply')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.stopOnBook} onCheckedChange={(stopOnBook) => void patch.mutateAsync({ stopOnBook })} />
            {t('automations.stopOnBook')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.stopOnConvert} onCheckedChange={(stopOnConvert) => void patch.mutateAsync({ stopOnConvert })} />
            {t('automations.stopOnConvert')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.stopOnOptOut} onCheckedChange={(stopOnOptOut) => void patch.mutateAsync({ stopOnOptOut })} />
            {t('automations.stopOnOptOut')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.onlyIfNoReply} onCheckedChange={(onlyIfNoReply) => void patch.mutateAsync({ onlyIfNoReply })} />
            {t('automations.onlyIfNoReply')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={data.quietHours} onCheckedChange={(quietHours) => void patch.mutateAsync({ quietHours })} />
            {t('automations.quietHours')}
          </label>
        </div>

        <div className="rounded-lg border border-border p-4">
          <p className="font-medium">{t('automations.test')}</p>
          <Label className="mt-2">{t('automations.contact')}</Label>
          {people.length === 0 ? (
            <p className="mt-1 text-sm text-fg-muted">{t('automations.contactId')}</p>
          ) : (
            <Select value={pickedContact} onValueChange={setContactId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {people.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.firstName} {item.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            className="mt-3"
            disabled={!pickedContact || test.isPending}
            onClick={() =>
              void test.mutateAsync(pickedContact).then(
                () => toast.success(t('automations.testMode')),
                (error) => toast.error(isApiError(error) ? t('automations.blocked') : t('common:actions.retry')),
              )
            }
          >
            {t('automations.run')}
          </Button>
        </div>

        <div>
          <p className="mb-2 font-medium">{t('automations.runs')}</p>
          <Input
            value={runQuery}
            onChange={(event) => setRunQuery(event.target.value)}
            placeholder={t('automations.searchRuns')}
          />
          <ul className="mt-3 space-y-2 text-sm">
            {filteredRuns.map((run) => (
              <li key={run.id} className="rounded-md border border-border p-3">
                <p>
                  {run.contactName}
                  {run.testMode ? ` · ${t('automations.testMode')}` : ''}
                  {run.stoppedReason ? ` · ${run.stoppedReason}` : ''}
                </p>
                <p className="text-xs text-fg-muted">{formatWhen(run.createdAt, ctx.locale, ctx.timeZone)}</p>
                <ul className="mt-1 text-fg-muted">
                  {run.steps.map((step) => (
                    <li key={step.at + step.label}>
                      {formatWhen(step.at, ctx.locale, ctx.timeZone)} — {step.label} — {step.result}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </PageContainer>
  )
}

function ChannelOrder({ value, onChange }: { value: ChannelKind[]; onChange: (channels: ChannelKind[]) => void }) {
  const { t } = useTranslation(['grow', 'common'])
  const unused = CHANNEL_OPTIONS.filter((kind) => !value.includes(kind))
  return (
    <div>
      <Label>{t('automations.channels')}</Label>
      <ul className="mt-2 space-y-2">
        {value.map((kind, index) => (
          <li key={kind} className="flex items-center gap-2 rounded-md border border-border px-2 py-1">
            <span className="flex-1 text-sm">{t(`common:channels.${kind}`)}</span>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={index === 0}
              onClick={() => {
                const next = [...value]
                ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                onChange(next)
              }}
              aria-label={t('automations.moveUp')}
            >
              <ChevronUp />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={index === value.length - 1}
              onClick={() => {
                const next = [...value]
                ;[next[index + 1], next[index]] = [next[index]!, next[index + 1]!]
                onChange(next)
              }}
              aria-label={t('automations.moveDown')}
            >
              <ChevronDown />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={value.length === 1}
              onClick={() => onChange(value.filter((item) => item !== kind))}
              aria-label={t('common:actions.close')}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      {unused.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {unused.map((kind) => (
            <Button key={kind} size="sm" variant="outline" onClick={() => onChange([...value, kind])}>
              {t('automations.addChannel')}: {t(`common:channels.${kind}`)}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
