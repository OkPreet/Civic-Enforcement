import { Input as InputPrimitive } from '@base-ui/react/input'
import { cn } from '@/lib/utils'

function Input({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof InputPrimitive>) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        'flex size-full items-center rounded-lg border border-border bg-transparent px-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:bg-input/30 dark:hover:bg-input/50',
        className
      )}
      {...props}
    />
  )
}

export { Input }