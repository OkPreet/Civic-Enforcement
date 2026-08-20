'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashboardShell } from '@/components/dashboard/shell'
import { ViolationsTable } from '@/components/dashboard/violations-table'
import { api, storage, type Report } from '@/lib/api'
import { mapReportsToViolations } from '@/lib/report-mapper'

export default function ViolationsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      setLoading(false)
      return
    }
    api
      .allReports(token)
      .then(setReports)
      .finally(() => setLoading(false))
  }, [])

  return (
    <DashboardShell>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Violation records</h1>
          <p className="text-sm text-muted-foreground">
            Every citizen-reported and auto-detected violation with evidence and enforcement status
          </p>
        </div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="mt-3 text-sm">Loading records…</p>
          </div>
        ) : (
          <ViolationsTable violations={mapReportsToViolations(reports)} />
        )}
      </div>
    </DashboardShell>
  )
}

