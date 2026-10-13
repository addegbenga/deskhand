import { Check, Circle } from 'lucide-react'
import { Checkbox as CheckboxPrimitive, RadioGroup as RadioPrimitive, Switch as SwitchPrimitive } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { cn } from '../lib/cn'

export const Checkbox = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-fg-muted/60 bg-surface data-[state=checked]:border-brand data-[state=checked]:bg-brand data-[state=checked]:text-brand-fg disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  ),
)
Checkbox.displayName = 'Checkbox'

export const Switch = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-border transition-colors duration-200 data-[state=checked]:bg-brand disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 rounded-full bg-surface shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4" />
    </SwitchPrimitive.Root>
  ),
)
Switch.displayName = 'Switch'

export const RadioGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadioPrimitive.Root>>(
  ({ className, ...props }, ref) => <RadioPrimitive.Root ref={ref} className={cn('grid gap-2', className)} {...props} />,
)
RadioGroup.displayName = 'RadioGroup'

export const RadioGroupItem = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof RadioPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <RadioPrimitive.Item
      ref={ref}
      className={cn(
        'aspect-square size-4 shrink-0 rounded-full border border-fg-muted/60 bg-surface text-brand data-[state=checked]:border-brand disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="size-2 fill-current" />
      </RadioPrimitive.Indicator>
    </RadioPrimitive.Item>
  ),
)
RadioGroupItem.displayName = 'RadioGroupItem'
