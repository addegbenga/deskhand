import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { FormField, Recipe } from '@deskhand/schemas'
import { cn } from '../lib/cn'
import { Badge, Card } from './display'
import { Button } from './button'

export function RecipeCard({
  recipe,
  labels,
  lastRunText,
  missingConnections,
  toggle,
  action,
  className,
}: {
  recipe: Recipe
  labels: {
    on: string
    off: string
    enrolled: string
    completed: string
    replied: string
    converted: string
    lastRun: string
    never: string
    needsConnection: string
  }
  lastRunText?: string
  missingConnections?: string[]
  toggle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{recipe.name}</p>
          <p className="mt-1 text-sm text-fg-muted">{recipe.description}</p>
        </div>
        <Badge tone={recipe.enabled ? 'success' : 'neutral'}>{recipe.enabled ? labels.on : labels.off}</Badge>
      </div>
      <p className="text-xs text-fg-muted">{recipe.expected}</p>
      <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-fg-muted">{labels.enrolled}</dt>
          <dd className="tabular font-medium">{recipe.enrolled}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.completed}</dt>
          <dd className="tabular font-medium">{recipe.completed}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.replied}</dt>
          <dd className="tabular font-medium">{recipe.replied}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.converted}</dt>
          <dd className="tabular font-medium">{recipe.converted}</dd>
        </div>
      </dl>
      <p className="text-xs text-fg-muted">
        {labels.lastRun}: {lastRunText ?? labels.never}
      </p>
      {recipe.error && <p className="text-xs text-danger">{recipe.error}</p>}
      {missingConnections && missingConnections.length > 0 && (
        <p className="text-xs text-attention">{labels.needsConnection}: {missingConnections.join(', ')}</p>
      )}
      {(toggle || action) && (
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
          {toggle}
          {action}
        </div>
      )}
    </Card>
  )
}

export function CampaignCheckPanel({
  audience,
  sendable,
  excludedConsent,
  excludedOptOut,
  excludedQuietHours,
  templateOk,
  templateStatus,
  canSend,
  labels,
}: {
  audience: number
  sendable: number
  excludedConsent: number
  excludedOptOut: number
  excludedQuietHours: number
  templateOk: boolean
  templateStatus: string
  canSend: boolean
  labels: {
    audience: string
    sendable: string
    consent: string
    optOut: string
    quiet: string
    template: string
    ready: string
    blocked: string
  }
}) {
  return (
    <div className="rounded-lg border border-border p-4">
      <p className="font-medium">{canSend ? labels.ready : labels.blocked}</p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-fg-muted">{labels.audience}</dt>
          <dd className="tabular font-medium">{audience}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.sendable}</dt>
          <dd className="tabular font-medium">{sendable}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.consent}</dt>
          <dd className="tabular">{excludedConsent}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.optOut}</dt>
          <dd className="tabular">{excludedOptOut}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.quiet}</dt>
          <dd className="tabular">{excludedQuietHours}</dd>
        </div>
        <div>
          <dt className="text-fg-muted">{labels.template}</dt>
          <dd>{templateOk ? templateStatus : templateStatus}</dd>
        </div>
      </dl>
    </div>
  )
}

export function ReviewCard({
  name,
  rating,
  body,
  topics,
  draft,
  onUseDraft,
  useDraftLabel,
  className,
  meta,
  analysis,
}: {
  name: string
  rating: number
  body: string
  topics: string[]
  draft?: string
  onUseDraft?: () => void
  useDraftLabel?: string
  className?: string
  meta?: ReactNode
  analysis?: ReactNode
}) {
  return (
    <Card className={cn('flex flex-col gap-2 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{name}</p>
        <span className="inline-flex items-center gap-0.5 text-sm" aria-label={`${rating} / 5`}>
          {Array.from({ length: 5 }, (_, index) => (
            <Star key={index} className={cn('size-3.5', index < rating ? 'fill-attention text-attention' : 'text-border')} />
          ))}
        </span>
      </div>
      {meta}
      <p className="text-sm">{body}</p>
      <div className="flex flex-wrap gap-1">
        {topics.map((topic) => (
          <Badge key={topic} tone="neutral">
            {topic}
          </Badge>
        ))}
      </div>
      {analysis}
      {draft && (
        <div className="rounded-md border-s-2 border-ai bg-ai/6 p-3 text-sm">
          <p>{draft}</p>
          {onUseDraft && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={onUseDraft}>
              {useDraftLabel}
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

export function QrPoster({ href, title, subtitle }: { href: string; title: string; subtitle: string }) {
  const cells = Array.from({ length: 21 }, (_, row) =>
    Array.from({ length: 21 }, (_, col) => {
      const n = href.charCodeAt((row * 21 + col) % href.length) + row * 7 + col * 3
      return n % 3 !== 0
    }),
  )
  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-center print:border-0">
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>
      <svg viewBox="0 0 21 21" className="mx-auto mt-4 size-40" role="img" aria-label={href}>
        {cells.flatMap((row, y) =>
          row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} className="fill-fg" /> : null)),
        )}
      </svg>
      <p className="mt-3 break-all text-xs text-fg-muted">{href}</p>
    </div>
  )
}

export function FormPreview({
  fields,
  values,
  onChange,
}: {
  fields: FormField[]
  values: Record<string, string>
  onChange: (id: string, value: string) => void
}) {
  const visible = fields.filter((field) => {
    if (!field.showIf) return true
    const [id, expected] = field.showIf.split('=')
    return values[id ?? ''] === expected
  })
  return (
    <div className="flex flex-col gap-3">
      {visible.map((field) => (
        <label key={field.id} className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {field.label}
            {field.required ? ' *' : ''}
          </span>
          {field.help ? <span className="text-xs text-fg-muted">{field.help}</span> : null}
          {field.type === 'long_text' ? (
            <textarea
              className="min-h-20 rounded-md border border-border px-3 py-2"
              value={values[field.id] ?? ''}
              placeholder={field.placeholder || undefined}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          ) : field.type === 'dropdown' ? (
            <select
              className="h-10 rounded-md border border-border px-3"
              value={values[field.id] ?? ''}
              onChange={(event) => onChange(field.id, event.target.value)}
            >
              <option value="" />
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : field.type === 'consent' || field.type === 'checkbox' || field.type === 'yes_no' ? (
            <input type="checkbox" checked={values[field.id] === 'yes'} onChange={(event) => onChange(field.id, event.target.checked ? 'yes' : 'no')} />
          ) : (
            <input
              className="h-10 rounded-md border border-border px-3"
              value={values[field.id] ?? ''}
              placeholder={field.placeholder || undefined}
              onChange={(event) => onChange(field.id, event.target.value)}
            />
          )}
        </label>
      ))}
    </div>
  )
}
