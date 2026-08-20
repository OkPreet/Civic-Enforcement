import { cn } from '@/lib/utils'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

function Label({ className, ...props }: LabelProps) {
  return (
    <label
      data-slot="label"
      className={cn(
        'flex items-center text-sm font-medium text-foreground',
        className
      )}
      {...props}
    />
  )
}

export { Label }