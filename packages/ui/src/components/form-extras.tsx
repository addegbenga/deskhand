import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { RadioGroup as RadioPrimitive } from 'radix-ui'
import {
  forwardRef,
  useRef,
  useState,
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { useTranslation } from '@deskhand/i18n'
import { cn } from '../lib/cn'
import { Input } from './input'
import { toast } from './toast'

/** 0 to 4. Same rule as the server: length plus a mix of lower, upper, digits and symbols. */
export function passwordScore(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length
  if (password.length < 8) return 1
  if (classes < 2) return 1
  if (password.length >= 12 && classes >= 3) return 4
  return classes >= 3 ? 3 : 2
}

export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const { t } = useTranslation('common')
  const score = passwordScore(password)
  const levels = ['empty', 'weak', 'fair', 'good', 'strong'] as const
  const tone = ['bg-border', 'bg-danger', 'bg-attention', 'bg-success', 'bg-success'][score]
  return (
    <div id={id} className="mt-2">
      <div className="flex gap-1" aria-hidden>
        {[1, 2, 3, 4].map((bar) => (
          <span key={bar} className={cn('h-1 flex-1 rounded-full transition-colors', bar <= score ? tone : 'bg-border')} />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-fg-muted" aria-live="polite">
        {t(`password.${levels[score]}`)}
      </p>
    </div>
  )
}

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  ({ className, ...props }, ref) => {
    const { t } = useTranslation('common')
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <Input ref={ref} type={visible ? 'text' : 'password'} className={cn('pe-11', className)} {...props} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('password.hide') : t('password.show')}
          aria-pressed={visible}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-md text-fg-muted hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    )
  },
)
PasswordInput.displayName = 'PasswordInput'

/** Six boxes for a one-time code. Accepts paste, arrows and backspace; digits stay left to right in every language. */
export function CodeInput({
  value,
  onChange,
  length = 6,
  invalid,
  disabled,
  label,
  onComplete,
}: {
  value: string
  onChange: (value: string) => void
  length?: number
  invalid?: boolean
  disabled?: boolean
  label: string
  onComplete?: (value: string) => void
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  const update = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
    return clean
  }

  const onKeyDown = (index: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus()
      update(value.slice(0, index - 1) + value.slice(index))
      event.preventDefault()
    }
    if (event.key === 'ArrowLeft') refs.current[Math.max(0, index - 1)]?.focus()
    if (event.key === 'ArrowRight') refs.current[Math.min(length - 1, index + 1)]?.focus()
  }

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const clean = update(event.clipboardData.getData('text'))
    refs.current[Math.min(clean.length, length - 1)]?.focus()
  }

  return (
    <div role="group" aria-label={label} dir="ltr" className="flex gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          value={digit}
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          disabled={disabled}
          aria-label={`${label} ${index + 1}`}
          aria-invalid={invalid || undefined}
          onPaste={onPaste}
          onKeyDown={onKeyDown(index)}
          onChange={(event) => {
            const char = event.target.value.replace(/\D/g, '').slice(-1)
            if (!char) return
            const next = (value.slice(0, index) + char + value.slice(index + 1)).slice(0, length)
            update(next)
            refs.current[Math.min(index + 1, length - 1)]?.focus()
          }}
          className="tabular h-12 w-11 rounded-md border border-border bg-surface text-center text-lg font-semibold text-fg transition-colors focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-50 aria-invalid:border-danger sm:w-12"
        />
      ))}
    </div>
  )
}

/** Read-only value with a copy button: DNS records, embed snippets, links. */
export function CopyField({ value, label, multiline, className }: { value: string; label: string; multiline?: boolean; className?: string }) {
  const { t } = useTranslation('common')
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast.success(t('copy.done'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('copy.failed'))
    }
  }
  return (
    <div className={cn('flex items-start gap-2 rounded-md border border-border bg-surface-2 p-2 ps-3', className)}>
      <code dir="ltr" className={cn('min-w-0 flex-1 py-1 font-mono text-xs text-fg', multiline ? 'whitespace-pre-wrap break-all' : 'truncate')}>
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={t('copy.label', { label })}
        className="flex size-7 shrink-0 items-center justify-center rounded-sm text-fg-muted hover:bg-surface hover:text-fg focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

/** Large selectable card built on a radio group: plans, modes, options with a description. */
export const ChoiceCards = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadioPrimitive.Root>>(
  ({ className, ...props }, ref) => <RadioPrimitive.Root ref={ref} className={cn('grid gap-3', className)} {...props} />,
)
ChoiceCards.displayName = 'ChoiceCards'

export function ChoiceCard({
  value,
  title,
  description,
  icon,
  badge,
  children,
  disabled,
  className,
}: {
  value: string
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  children?: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <RadioPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        'group relative flex w-full gap-3 rounded-lg border border-border bg-surface p-4 text-start transition-colors outline-none hover:border-fg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-brand data-[state=checked]:bg-brand/5',
        className,
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 text-fg-muted group-data-[state=checked]:text-brand [&_svg]:size-5">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-fg">
          {title}
          {badge}
        </span>
        {description && <span className="mt-1 block text-[13px] text-fg-muted">{description}</span>}
        {children}
      </span>
      <span
        aria-hidden
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border group-data-[state=checked]:border-brand group-data-[state=checked]:bg-brand"
      >
        <span className="size-2 rounded-full bg-brand-fg opacity-0 group-data-[state=checked]:opacity-100" />
      </span>
    </RadioPrimitive.Item>
  )
}
