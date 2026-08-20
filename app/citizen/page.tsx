'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, CheckCircle, Clock, FileText, Loader2, XCircle, AlertCircle } from 'lucide-react'
import { CitizenShell } from '@/components/citizen/shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { api, storage, type Report } from '@/lib/api'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500',
  'under-review': 'bg-yellow-500',
  verified: 'bg-gray-500',
  'challan-issued': 'bg-green-500',
  rejected: 'bg-red-500',
}

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  'under-review': 'Under Review',
  verified: 'Verified',
  'challan-issued': 'Challan Issued',
  rejected: 'Rejected',
}

export default function CitizenDashboardPage() {
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      setError('You must be signed in to view your dashboard.')
      setLoading(false)
      return
    }
    api
      .myReports(token)
      .then(data => {
        setReports(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load reports')
        setLoading(false)
      })
  }, [])

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'submitted' || r.status === 'under-review').length,
    verified: reports.filter(r => r.status === 'verified' || r.status === 'challan-issued').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  }

  return (
    <CitizenShell>
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Citizen Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Report violations, track your submissions, and help keep Ahmedabad's streets clear
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
            <p className="mt-3 text-sm">Loading your dashboard...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="size-10 text-destructive/60 mb-3" />
            <h3 className="text-lg font-medium">{error}</h3>
            <Link href="/login" className={cn(buttonVariants({ size: 'sm' }), 'mt-4')}>
              Go to login
            </Link>
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground">All time submissions</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting verification</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified & Challaned</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
                  <p className="text-xs text-muted-foreground">Action taken</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <p className="text-xs text-muted-foreground">Insufficient evidence</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/citizen/report" className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'h-32 flex flex-col items-start justify-center gap-2')}>
                <div className="flex items-center justify-center rounded-xl bg-primary/10 p-3">
                  <Camera className="size-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Report New Violation</p>
                  <p className="text-sm text-muted-foreground">Take a photo & submit challan</p>
                </div>
              </Link>
              <Link href="/citizen/reports" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-32 flex flex-col items-start justify-center gap-2')}>
                <div className="flex items-center justify-center rounded-xl bg-muted p-3">
                  <FileText className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">View My Reports</p>
                  <p className="text-sm text-muted-foreground">Track status & history</p>
                </div>
              </Link>
            </div>

            {/* Recent Reports */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Reports</CardTitle>
                  <p className="text-sm text-muted-foreground">Your latest submissions</p>
                </div>
                <Link href="/citizen/reports" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {reports.slice(0, 5).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="mx-auto mb-2 size-8 opacity-50" />
                    <p className="font-medium">No reports yet</p>
                    <p className="text-sm">Start by reporting a violation</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reports.slice(0, 5).map((report) => (
                      <Link
                        key={report.public_id}
                        href="/citizen/reports"
                        className="flex items-center gap-4 rounded-lg p-3 hover:bg-muted transition-colors"
                      >
                        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
                          <span className="text-sm font-mono text-muted-foreground">{report.plate}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{report.violation_type}</p>
                          <p className="text-sm text-muted-foreground truncate">{report.location}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                              `bg-[${statusColors[report.status]}]/10 text-[${statusColors[report.status]}]`
                            )}
                          >
                            {statusLabels[report.status] || report.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(report.reported_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Guidelines */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Camera className="size-5" />
              Reporting Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="font-medium">For best results, ensure your photo shows:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Clear vehicle license plate</li>
              <li>Violation context (signage, road markings, footpath)</li>
              <li>Date/time visible (auto-captured from EXIF)</li>
              <li>Location enabled for GPS coordinates</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              False reports may result in account restrictions. All submissions are reviewed by traffic authorities.
            </p>
          </CardContent>
        </Card>
      </div>
    </CitizenShell>
  )
}