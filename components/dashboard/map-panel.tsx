'use client'

import { Flame, MapPin } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Card } from '@/components/ui/card'
import type { TopZone } from '@/lib/api'
import { hotspots, type Violation } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const ViolationMap = dynamic(() => import('@/components/dashboard/violation-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
})

const legend = [
  { label: 'Auto-detected', color: '#e8a53a' },
  { label: 'Pending', color: '#e0b13a' },
  { label: 'Verified', color: '#7b7bff' },
  { label: 'Challan issued', color: '#3fbf7f' },
]

export function MapPanel({
  violations,
  topZones,
}: {
  violations: Violation[]
  topZones?: TopZone[]
}) {
  const [heat, setHeat] = useState(true)
  const [incidents, setIncidents] = useState(true)
  const zones = topZones && topZones.length > 0 ? topZones : hotspots.slice(0, 4)
  const isMock = !topZones || topZones.length === 0

  return (
    <Card id="map" className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
            <MapPin className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Live violation map</p>
            <p className="text-xs text-muted-foreground">Ahmedabad · real-time GIS</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ToggleChip active={incidents} onClick={() => setIncidents((v) => !v)}>
            <MapPin className="size-3.5" />
            Incidents
          </ToggleChip>
          <ToggleChip active={heat} onClick={() => setHeat((v) => !v)}>
            <Flame className="size-3.5" />
            Heatmap
          </ToggleChip>
        </div>
      </div>

      <div className="relative h-[420px] w-full">
        <ViolationMap violations={violations} showHeat={heat} showIncidents={incidents} />

        <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-lg border border-border bg-card/90 px-3 py-2 backdrop-blur">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </p>
          <div className="flex flex-col gap-1">
            {legend.map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-[11px]">
                <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
        {zones.map((z, i) => (
          <div key={z.name} className="bg-card px-4 py-3">
            <p className="truncate text-xs text-muted-foreground">{z.name}</p>
            <p className="text-lg font-semibold tabular-nums">{z.count}</p>
            <p
              className={cn(
                'text-[11px] font-medium',
                (z as any).trend >= 0 ? 'text-destructive' : 'text-success',
              )}
            >
              {isMock ? `${(z as any).trend >= 0 ? '+' : ''}${(z as any).trend}% vs last week` : `${(z as any).trend >= 0 ? '+' : ''}${(z as any).trend}% vs yesterday`}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary/40 bg-primary/12 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
