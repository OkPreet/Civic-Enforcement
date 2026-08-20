import { ChevronRight, MapPin } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import {
  formatTime,
  statusLabels,
  statusVariant,
  timeAgo,
  type Violation,
} from '@/lib/mock-data'

export function ViolationFeed({ violations }: { violations: Violation[] }) {
  return (
    <ul className="divide-y divide-border">
      {violations.map((v) => (
        <li key={v.id}>
          <Link
            href={`/violations/${v.id}`}
            className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.evidence} alt="" className="size-full object-cover" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold tracking-wide">{v.plate}</span>
                <Badge variant={statusVariant[v.status]} className="hidden sm:inline-flex">
                  {statusLabels[v.status]}
                </Badge>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">
                  {v.type} · {v.location}
                </span>
              </p>
            </div>

            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-xs font-medium">{formatTime(v.detectedAt)}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(v.detectedAt)}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
