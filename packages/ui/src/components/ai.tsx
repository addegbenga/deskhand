import { OctagonX, Sparkles } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'
import { Popover, PopoverContent, PopoverTrigger } from './overlays'
import { Button } from './button'
import { Badge, Card } from './display'
import { Input } from './input'

/** Violet pill with a spark and the employee's name, used on every AI message, draft and action (FE-DOC 4.3). */
export function AIBadge({ name, className }: { name?: string; className?: string }) {
  const { t } = useTranslation('common')
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-ai/25 bg-ai/10 px-2 py-0.5 text-xs font-medium text-ai',
        className,
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {name ? t('ai.badgeNamed', { name }) : t('ai.badge')}
    </span>
  )
}

/** Three-level confidence meter for drafts and approvals. */
export function ConfidenceMeter({ level, className }: { level: 'high' | 'medium' | 'low'; className?: string }) {
  const { t } = useTranslation('common')
  const filled = { high: 3, medium: 2, low: 1 }[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-fg-muted', className)}>
      <span className="flex items-end gap-0.5" aria-hidden>
        {[1, 2, 3].map((bar) => (
          <span
            key={bar}
            className={cn('w-1 rounded-sm', bar <= filled ? 'bg-ai' : 'bg-border')}
            style={{ height: `${4 + bar * 3}px` }}
          />
        ))}
      </span>
      {t(`ai.confidence.${level}`)}
    </span>
  )
}

/** Container for AI-authored content: subtle violet tint with a start-side accent. */
export function AISurface({ className, drafting, ...props }: HTMLAttributes<HTMLDivElement> & { drafting?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-md border-s-2 border-ai bg-ai/6 p-3',
        drafting &&
          'animate-shimmer bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--ai)_12%,transparent),transparent)] bg-[length:200%_100%]',
        className,
      )}
      {...props}
    />
  )
}

/** Sources, rules and tools behind an AI reply (FE-DOC 4.3). */
export function WhyPopover({
  sources,
  rules,
  tools,
  children,
}: {
  sources: string[]
  rules: string[]
  tools: string[]
  children?: ReactNode
}) {
  const { t } = useTranslation('common')
  return (
    <Popover>
      <PopoverTrigger asChild>
        {children ?? (
          <Button variant="ghost" size="sm">
            {t('ai.why')}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 text-sm">
        <p className="font-medium">{t('ai.whyTitle')}</p>
        <section className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{t('ai.sources')}</p>
          <ul className="mt-1 list-disc ps-4">
            {sources.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{t('ai.rules')}</p>
          <ul className="mt-1 list-disc ps-4">
            {rules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{t('ai.tools')}</p>
          <ul className="mt-1 list-disc ps-4">
            {tools.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </PopoverContent>
    </Popover>
  )
}

export function LanguageTierBadge({ tier, className }: { tier: 'A' | 'B' | 'C'; className?: string }) {
  const { t } = useTranslation('common')
  const tone = tier === 'A' ? 'success' : tier === 'B' ? 'attention' : 'danger'
  return (
    <Badge tone={tone} className={className}>
      {t(`ai.tier.${tier}`)}
    </Badge>
  )
}

export function AutonomyChip({ level, className }: { level: 'suggest' | 'approve' | 'autopilot'; className?: string }) {
  const { t } = useTranslation('common')
  const tone = level === 'autopilot' ? 'ai' : level === 'approve' ? 'brand' : 'neutral'
  return (
    <Badge tone={tone} className={className}>
      {t(`ai.autonomy.${level}`)}
    </Badge>
  )
}

export function KillSwitchButton({ onClick, disabled, className }: { onClick: () => void; disabled?: boolean; className?: string }) {
  const { t } = useTranslation('common')
  return (
    <Button variant="danger" className={className} disabled={disabled} onClick={onClick}>
      <OctagonX className="size-4" aria-hidden />
      {t('ai.killEmployee')}
    </Button>
  )
}

export function EmployeeCard({
  name,
  meta,
  children,
  className,
}: {
  name: string
  meta?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold">{name}</p>
        <AIBadge name={name} />
      </div>
      {meta && <div className="flex flex-wrap gap-2 text-xs text-fg-muted">{meta}</div>}
      {children}
    </Card>
  )
}

export function SandboxChat({
  messages,
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
  sendLabel,
}: {
  messages: { id: string; role: 'user' | 'assistant'; text: string }[]
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled?: boolean
  placeholder: string
  sendLabel: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-80 min-h-40 space-y-2 overflow-y-auto rounded-md border border-border bg-surface-2 p-3">
        {messages.map((item) => (
          <div key={item.id} className={cn('max-w-[90%] rounded-md px-3 py-2 text-sm', item.role === 'user' ? 'ms-auto bg-brand/10' : 'bg-surface')}>
            {item.role === 'assistant' && <AIBadge className="mb-1" />}
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          className="min-w-0 flex-1"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSend()
          }}
        />
        <Button onClick={onSend} disabled={disabled || !value.trim()}>
          {sendLabel}
        </Button>
      </div>
    </div>
  )
}

export function EvalResultsTable({
  rows,
  languageLabel,
  suiteLabel,
  resultLabel,
}: {
  rows: { id: string; language: string; suite: string; passed: boolean; score: number }[]
  languageLabel: string
  suiteLabel: string
  resultLabel: string
}) {
  const { t } = useTranslation('common')
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-start text-sm">
        <thead>
          <tr className="border-b border-border text-fg-muted">
            <th className="py-2 pe-3 font-medium">{languageLabel}</th>
            <th className="py-2 pe-3 font-medium">{suiteLabel}</th>
            <th className="py-2 font-medium">{resultLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/70">
              <td className="py-2 pe-3">{row.language}</td>
              <td className="py-2 pe-3">{row.suite}</td>
              <td className="py-2">
                {row.passed ? t('ai.evalPass', { score: row.score }) : t('ai.evalFail', { score: row.score })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
