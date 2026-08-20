'use client'

import { ArrowUpRight, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { HourlyTrendChart, ViolationTypeChart } from '@/components/dashboard/charts'
import { MapPanel } from '@/components/dashboard/map-panel'
import { DashboardShell } from '@/components/dashboard/shell'
import { StatCards } from '@/components/dashboard/stat-cards'
import { ViolationFeed } from '@/components/dashboard/violation-feed'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  api,
  storage,
  subscribeEvents,
  type Camera,
  type HourlyTrendPoint,
  type Report,
  type TopZone,
  type TypeCount,
  type ViolationStats,
} from '@/lib/api'
import { mapReportsToViolations } from '@/lib/report-mapper'

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<ViolationStats | undefined>()
  const [trend, setTrend] = useState<HourlyTrendPoint[] | undefined>()
  const [byType, setByType] = useState<TypeCount[] | undefined>()
  const [topZones, setTopZones] = useState<TopZone[] | undefined>()
  const [cameras, setCameras] = useState<Camera[] | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      setError('You must be signed in as an authority to view this dashboard.')
      setLoading(false)
      return
    }

    const refreshReports = () =>
      api.allReports(token).then(setReports).catch(() => {})

    const es = subscribeEvents(token, (event) => {
      if (event === 'report.created' || event === 'report.reviewed' || event === 'challan.updated' || event === 'camera.detection') {
        refreshReports()
      }
    })

    Promise.allSettled([
      api.allReports(token),
      api.violationStats(token).catch(() => undefined),
      api.violationTrend(token).catch(() => undefined),
      api.violationByType(token).catch(() => undefined),
      api.topZones(token).catch(() => undefined),
      api.cameras(token).catch(() => undefined),
    ]).then(([r, s, t, b, z, c]) => {
      if (r.status === 'fulfilled') setReports(r.value)
      if (s.status === 'fulfilled') setStats(s.value)
      if (t.status === 'fulfilled') setTrend(t.value)
      if (b.status === 'fulfilled') setByType(b.value)
      if (z.status === 'fulfilled') setTopZones(z.value)
      if (c.status === 'fulfilled') setCameras(c.value)
      setLoading(false)
    })

    return () => es.close()
  }, [])

  const violations = mapReportsToViolations(reports)

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Enforcement overview</h1>
            <p className="text-sm text-muted-foreground">
              Live reports and violations across Ahmedabad · citizen + auto-detected
            </p>
          </div>
          <span className="font-mono text-xs text-muted-foreground">
            {loading ? 'Syncing…' : `Last sync: just now · ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="mt-3 text-sm">Loading enforcement data…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium">{error}</p>
            <Link href="/login" className="mt-4 text-sm font-medium text-primary hover:underline">
              Go to login
            </Link>
          </div>
        ) : (
          <>
            <StatCards stats={stats} cameras={cameras} />

            <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
              <MapPanel violations={violations} topZones={topZones} />

              <Card className="gap-0 p-0">
                <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
                  <div className="flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
                    </span>
                    <CardTitle>Live violation feed</CardTitle>
                  </div>
                  <Link
                    href="/violations"
                    data-icon="inline-end"
                    className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                  >
                    View all
                    <ArrowUpRight className="size-3.5" />
                  </Link>
                </CardHeader>
                <CardContent className="max-h-[560px] overflow-y-auto p-0">
                  {violations.length === 0 ? (
                    <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No reports yet. Violations will appear here as they are reported.
                    </p>
                  ) : (
                    <ViolationFeed violations={violations.slice(0, 9)} />
                  )}
                </CardContent>
              </Card>
            </div>

            <div id="predictive" className="grid gap-6 lg:grid-cols-2">
              <HourlyTrendChart data={trend} />
              <ViolationTypeChart data={byType} />
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  )
}
