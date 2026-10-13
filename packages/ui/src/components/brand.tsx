import { BRAND_NAME } from '@deskhand/config'
import { cn } from '../lib/cn'

/** Draft wordmark: lowercase name in Inter semibold with a small square in the app accent (FE-DOC 4.9). */
export function Wordmark({ className, compact, suffix }: { className?: string; compact?: boolean; suffix?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight text-current', className)}>
      <span aria-hidden className="size-3 rounded-[3px] bg-brand ring-1 ring-current/20" />
      <span className={cn(compact && 'sr-only')}>
        {BRAND_NAME.toLowerCase()}
        {suffix && <span className="ms-1.5 font-normal opacity-70">{suffix}</span>}
      </span>
    </span>
  )
}
