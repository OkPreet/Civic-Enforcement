'use client'

import { Download, ListFilter, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  formatTime,
  statusLabels,
  statusVariant,
  type Violation,
  type ViolationStatus,
  violations as mockViolations,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const filters: { label: string; value: ViolationStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Auto-Detected', value: 'auto-detected' },
  { label: 'Pending', value: 'pending' },
  { label: 'Verified', value: 'verified' },
  { label: 'Challan Issued', value: 'challan-issued' },
  { label: 'Dismissed', value: 'dismissed' },
]

export function ViolationsTable({ violations }: { violations?: Violation[] }) {
  const [status, setStatus] = useState<ViolationStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const data = violations && violations.length > 0 ? violations : mockViolations

  const rows = useMemo(() => {
    return data.filter((v) => {
      const matchStatus = status === 'all' || v.status === status
      const q = query.trim().toLowerCase()
      const matchQuery =
        !q ||
        v.plate.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.id.toLowerCase().includes(q) ||
        v.type.toLowerCase().includes(q)
      return matchStatus && matchQuery
    })
  }, [status, query])

  return (
    <Card className="gap-0 overflow-hidden p-0">
      {/* Controls */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search plate, location, ID…"
              className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:bg-background"
            />
          </div>
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ListFilter className="size-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                status === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">Vehicle</th>
              <th className="px-5 py-3 font-medium">Violation</th>
              <th className="px-5 py-3 font-medium">Location</th>
              <th className="px-5 py-3 font-medium">Detected</th>
              <th className="px-5 py-3 font-medium">Duration</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Fine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((v) => (
              <tr key={v.id} className="group transition-colors hover:bg-muted/40">
                <td className="px-5 py-3">
                  <Link href={`/violations/${v.id}`} className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={v.evidence} alt="" className="size-full object-cover" />
                    </span>
                    <span>
                      <span className="block font-mono font-semibold tracking-wide group-hover:text-primary">
                        {v.plate}
                      </span>
                      <span className="block text-xs text-muted-foreground">{v.vehicleType}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-3">{v.type}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.location}</td>
                <td className="whitespace-nowrap px-5 py-3 text-muted-foreground">
                  {formatTime(v.detectedAt)}
                </td>
                <td className="px-5 py-3 tabular-nums text-muted-foreground">{v.durationMin} min</td>
                <td className="px-5 py-3">
                  <Badge variant={statusVariant[v.status]}>{statusLabels[v.status]}</Badge>
                </td>
                <td className="px-5 py-3 font-medium tabular-nums">
                  ₹{v.fineAmount.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                  No violations match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
        <span>
          Showing {rows.length} of {data.length} records
        </span>
        <span>Page 1 of 1</span>
      </div>
    </Card>
  )
}
