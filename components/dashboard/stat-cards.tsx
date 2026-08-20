import { Cctv, FileCheck2, Gauge, TrendingDown, TrendingUp, TriangleAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import type { Camera, ViolationStats } from '@/lib/api'
import { stats as mockStats } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

type Stat = {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  delta?: number
  tone: 'primary' | 'accent' | 'success' | 'destructive'
}

const toneClass: Record<Stat['tone'], string> = {
  primary: 'bg-primary/12 text-primary',
  accent: 'bg-accent/18 text-accent',
  success: 'bg-success/12 text-success',
  destructive: 'bg-destructive/12 text-destructive',
}

export function StatCards({
  stats,
  cameras,
}: {
  stats?: ViolationStats
  cameras?: Camera[]
}) {
  const online = cameras?.filter((c) => (c.status ?? 'online') === 'online').length
  const offline = cameras?.filter((c) => (c.status ?? 'online') !== 'online').length
  const challengers = stats ? stats.challan_issued : mockStats.challansIssued

  const items: Stat[] = [
    {
      label: 'Active violations',
      value: stats ? (stats.total - challengers).toLocaleString('en-IN') : mockStats.activeViolations.toLocaleString('en-IN'),
      sub: 'awaiting action',
      icon: TriangleAlert,
      delta: 6.2,
      tone: 'destructive',
    },
    {
      label: 'Reports received',
      value: (stats ? stats.total : mockStats.detectedToday).toLocaleString('en-IN'),
      sub: 'citizen + auto-captured',
      icon: Gauge,
      delta: 11.4,
      tone: 'accent',
    },
    {
      label: 'Challans issued',
      value: challengers.toLocaleString('en-IN'),
      sub: stats ? `${stats.verified} verified` : `₹${mockStats.revenueToday.toLocaleString('en-IN')} collected`,
      icon: FileCheck2,
      delta: 4.8,
      tone: 'success',
    },
    {
      label: 'Cameras online',
      value: cameras ? `${online ?? 0}/${cameras.length}` : `${mockStats.camerasOnline}/${mockStats.camerasTotal}`,
      sub: offline && offline > 0 ? `${offline} offline` : 'all systems nominal',
      icon: Cctv,
      tone: 'primary',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((s) => (
        <Card key={s.label} className="gap-0 p-5">
          <div className="flex items-center justify-between">
            <span className={cn('flex size-9 items-center justify-center rounded-lg', toneClass[s.tone])}>
              <s.icon className="size-[18px]" />
            </span>
            {s.delta !== undefined && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  s.delta >= 0 ? 'text-success' : 'text-destructive',
                )}
              >
                {s.delta >= 0 ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {Math.abs(s.delta)}%
              </span>
            )}
          </div>
          <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">{s.value}</p>
          <p className="mt-1 text-sm font-medium">{s.label}</p>
          <p className="text-xs text-muted-foreground">{s.sub}</p>
        </Card>
      ))}
    </div>
  )
}
