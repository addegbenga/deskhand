import { Command as CommandPrimitive } from 'cmdk'
import { Search } from 'lucide-react'
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui'
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { DialogOverlay, DialogPortal } from './dialog'

export const Command = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive
      ref={ref}
      className={cn('flex size-full flex-col overflow-hidden rounded-md bg-surface text-fg', className)}
      {...props}
    />
  ),
)
Command.displayName = 'Command'

export function CommandDialog({
  open,
  onOpenChange,
  title,
  children,
  shouldFilter,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  shouldFilter?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed start-1/2 top-[12dvh] z-50 w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-lg border border-border bg-surface shadow-xl ltr:-translate-x-1/2 rtl:translate-x-1/2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <Command shouldFilter={shouldFilter} loop>
            {children}
          </Command>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  )
}

export const CommandInput = forwardRef<
  HTMLInputElement,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & { wrapperClassName?: string }
>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn('flex items-center gap-2 border-b border-border px-3', wrapperClassName)}>
      <Search className="size-4 shrink-0 text-fg-muted" aria-hidden />
      <CommandPrimitive.Input
        ref={ref}
        className={cn(
          'flex h-12 w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  ),
)
CommandInput.displayName = 'CommandInput'

export const CommandList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.List ref={ref} className={cn('max-h-[min(24rem,60dvh)] overflow-y-auto p-1', className)} {...props} />
  ),
)
CommandList.displayName = 'CommandList'

export const CommandEmpty = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Empty ref={ref} className={cn('py-8 text-center text-sm text-fg-muted', className)} {...props} />
  ),
)
CommandEmpty.displayName = 'CommandEmpty'

export const CommandGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Group>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Group
      ref={ref}
      className={cn(
        'overflow-hidden p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-muted',
        className,
      )}
      {...props}
    />
  ),
)
CommandGroup.displayName = 'CommandGroup'

export const CommandItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Item>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-surface-2 data-[disabled=true]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-muted',
        className,
      )}
      {...props}
    />
  ),
)
CommandItem.displayName = 'CommandItem'

export const CommandSeparator = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>>(
  ({ className, ...props }, ref) => (
    <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />
  ),
)
CommandSeparator.displayName = 'CommandSeparator'

export const CommandLoading = CommandPrimitive.Loading
