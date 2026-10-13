import { CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { MARKET_PACKS } from '@deskhand/config'
import { formatDateTime, useTranslation } from '@deskhand/i18n'
import type { MarketCode } from '@deskhand/schemas'
import { cn } from '../lib/cn'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './overlays'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select'

/** Calendar date in YYYY-MM-DD, independent of the browser timezone. */
export type CalendarDate = string

function toCalendarDate(date: Date): CalendarDate {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fromCalendarDate(value: CalendarDate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function DatePicker({
  value,
  onChange,
  locale,
  placeholder,
  weekStartsOn = 1,
  id,
  className,
}: {
  value: CalendarDate | null
  onChange: (value: CalendarDate) => void
  locale: string
  placeholder: string
  weekStartsOn?: 0 | 1 | 6
  id?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? fromCalendarDate(value) : undefined
  const label = selected
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(selected)
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn('w-full justify-start px-3 font-normal', !selected && 'text-fg-muted', className)}
        >
          <CalendarDays className="text-fg-muted" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <DayPicker
          mode="single"
          selected={selected}
          weekStartsOn={weekStartsOn}
          dir={document.documentElement.dir}
          onSelect={(date) => {
            if (!date) return
            onChange(toCalendarDate(date))
            setOpen(false)
          }}
          formatters={{
            formatCaption: (month) => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month),
            formatWeekdayName: (day) => new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(day),
          }}
          classNames={{
            root: 'text-sm',
            months: 'relative',
            month_caption: 'flex h-9 items-center justify-center font-medium',
            nav: 'absolute inset-x-0 top-0 flex h-9 items-center justify-between',
            button_previous: 'inline-flex size-8 items-center justify-center rounded-md hover:bg-surface-2 rtl:rotate-180',
            button_next: 'inline-flex size-8 items-center justify-center rounded-md hover:bg-surface-2 rtl:rotate-180',
            chevron: 'size-4 fill-fg-muted',
            weekday: 'size-9 text-xs font-normal text-fg-muted',
            day: 'p-0',
            day_button:
              'size-9 rounded-md text-sm hover:bg-surface-2 aria-selected:bg-brand aria-selected:text-brand-fg',
            today: 'font-semibold text-brand',
            outside: 'text-fg-muted/50',
            disabled: 'opacity-40',
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** Time slots formatted in the location's locale and hour cycle. Value is HH:mm in the location timezone. */
export function TimePicker({
  value,
  onChange,
  locale,
  hourCycle = 'h23',
  stepMinutes = 15,
  placeholder,
  id,
}: {
  value: string | null
  onChange: (value: string) => void
  locale: string
  hourCycle?: 'h12' | 'h23'
  stepMinutes?: number
  placeholder: string
  id?: string
}) {
  const slots = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hourCycle, timeZone: 'UTC' })
    const result: { value: string; label: string }[] = []
    for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
      const mm = String(minutes % 60).padStart(2, '0')
      result.push({ value: `${hh}:${mm}`, label: format.format(new Date(Date.UTC(2000, 0, 1, minutes / 60, minutes % 60))) })
    }
    return result
  }, [locale, hourCycle, stepMinutes])

  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {slots.map((slot) => (
          <SelectItem key={slot.value} value={slot.value}>
            {slot.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Shows a timestamp in a given timezone, e.g. for 'times shown in Lagos time'. */
export function ZonedTime({ value, locale, timeZone }: { value: string; locale: string; timeZone: string }) {
  return <time dateTime={value}>{formatDateTime(value, { locale, timeZone })}</time>
}

/** Country-aware phone input: dialing code from the market pack plus the national number. */
export function PhoneInput({
  market,
  onMarketChange,
  value,
  onChange,
  id,
  invalid,
}: {
  market: MarketCode
  onMarketChange?: (market: MarketCode) => void
  value: string
  onChange: (value: string) => void
  id?: string
  invalid?: boolean
}) {
  const { t } = useTranslation('common')
  const markets = Object.values(MARKET_PACKS)
  return (
    <div className="flex gap-2" dir="ltr">
      <Select value={market} onValueChange={(next) => onMarketChange?.(next as MarketCode)} disabled={!onMarketChange}>
        <SelectTrigger className="w-28 shrink-0" aria-label={t('fields.countryCode')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {markets.map((pack) => (
            <SelectItem key={pack.code} value={pack.code}>
              {pack.code} {pack.phoneCountryCode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        aria-invalid={invalid || undefined}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d\s-]/g, ''))}
      />
    </div>
  )
}

/** Amount input that shows the location's currency symbol and grouping. Value is in major units. */
export function CurrencyInput({
  value,
  onChange,
  currency,
  locale,
  id,
}: {
  value: number | null
  onChange: (value: number | null) => void
  currency: string
  locale: string
  id?: string
}) {
  const [focused, setFocused] = useState(false)
  const symbol = useMemo(
    () =>
      new Intl.NumberFormat(locale, { style: 'currency', currency })
        .formatToParts(0)
        .find((part) => part.type === 'currency')?.value ?? currency,
    [currency, locale],
  )
  const display =
    value === null ? '' : focused ? String(value) : new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)

  return (
    <div className="flex min-w-0" dir="ltr">
      <span className="inline-flex shrink-0 items-center rounded-s-md border border-e-0 border-border bg-surface-2 px-2.5 text-sm text-fg-muted">
        {symbol}
      </span>
      <Input
        id={id}
        inputMode="decimal"
        className="min-w-0 rounded-s-none tabular"
        value={display}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          const raw = event.target.value.replace(/[^\d.]/g, '')
          onChange(raw === '' ? null : Number(raw))
        }}
      />
    </div>
  )
}
