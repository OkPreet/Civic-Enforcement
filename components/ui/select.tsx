import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      data-slot="select"
      className={cn(
        'flex h-9 w-full items-center rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 [&>option]:px-2 [&>option]:py-1.5 [&>option]:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {}

function SelectContent({ className, children, ...props }: SelectContentProps) {
  return (
    <div
      data-slot="select-content"
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-background text-popover-foreground shadow-lg',
        className
      )}
      {...props}
    >
      <div className="overflow-y-auto p-1">{children}</div>
    </div>
  )
}

interface SelectItemProps extends React.HTMLAttributes<HTMLOptionElement> {
  value: string
}

function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <option
      data-slot="select-item"
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-3 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </option>
  )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

function SelectTrigger({ className, children, ...props }: SelectTriggerProps) {
  return (
    <button
      data-slot="select-trigger"
      type="button"
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1 [&>span]:truncate [&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {}

function SelectValue({ className, children, ...props }: SelectValueProps) {
  return (
    <span
      data-slot="select-value"
      className={cn('line-clamp-1 truncate', className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }