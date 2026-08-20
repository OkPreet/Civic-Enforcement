import { ScanEye } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export function Brand({
  href = '/',
  className,
  showText = true,
}: {
  href?: string
  className?: string
  showText?: boolean
}) {
  return (
    <Link href={href} className={cn('flex items-center gap-2', className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <ScanEye className="size-5" />
      </span>
      {showText && (
        <span className="text-lg font-semibold tracking-tight">
          Sentinel<span className="text-primary">.</span>
        </span>
      )}
    </Link>
  )
}
