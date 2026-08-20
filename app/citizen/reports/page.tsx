'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  XCircle,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { CitizenShell } from '@/components/citizen/shell'
import { buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { api, storage, API_BASE, type Report } from '@/lib/api'
import { cn } from '@/lib/utils'

type ReportStatus = Report['status']

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500',
  'under-review': 'bg-yellow-500',
  verified: 'bg-gray-500',
  'challan-issued': 'bg-green-500',
  rejected: 'bg-red-500',
  'auto-detected': 'bg-purple-500',
}

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  'under-review': 'Under Review',
  verified: 'Verified',
  'challan-issued': 'Challan Issued',
  rejected: 'Rejected',
  'auto-detected': 'Auto-Detected',
}

const statusFilters = [
  { value: 'all', label: 'All Status' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under-review', label: 'Under Review' },
  { value: 'verified', label: 'Verified' },
  { value: 'challan-issued', label: 'Challan Issued' },
  { value: 'rejected', label: 'Rejected' },
] as const

function splitEvidence(evidence?: string | null): string[] {
  if (!evidence) return []
  return evidence.split(',').filter(Boolean)
}

function evidenceUrl(path: string): string {
  return path.startsWith('http') ? path : `${API_BASE}${path}`
}

export default function ReportsPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      setError('You must be signed in to view your reports.')
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
        console.error('Failed to load reports:', err)
        setError(err instanceof Error ? err.message : 'Failed to load reports')
        setLoading(false)
      })
  }, [])

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter(r => r.status === filter)

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'submitted' || r.status === 'under-review').length,
    completed: reports.filter(r => r.status === 'verified' || r.status === 'challan-issued').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
  }

  return (
    <CitizenShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My Reports</h1>
            <p className="text-sm text-muted-foreground">
              Track the status of your submitted violations
            </p>
          </div>
          <Link
            href="/citizen/report"
            className={cn(buttonVariants({ size: 'lg' }), 'w-full sm:w-auto')}
          >
            <Camera className="size-4 mr-2" />
            Report New Violation
          </Link>
        </div>

        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <p className="text-xs text-muted-foreground">Action Taken</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={filter} onChange={e => setFilter(e.target.value)} className="w-[200px]">
            {statusFilters.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Reports List */}
        <Card>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="size-8 animate-spin" />
                <p className="mt-3 text-sm">Loading your reports...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertCircle className="size-10 text-destructive/60 mb-3" />
                <h3 className="text-lg font-medium">{error}</h3>
                <div className="flex gap-3 mt-4">
                  <Link
                    href="/login"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Go to login
                  </Link>
                  {error.includes('signed in') && (
                    <button
                      onClick={() => router.push('/login')}
                      className={cn(buttonVariants({ size: 'sm' }))}
                    >
                      Sign in
                    </button>
                  )}
                </div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="mx-auto mb-3 size-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">No reports found</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {filter === 'all' ? 'Start by reporting a violation' : `No reports with status "${filter}"`}
                </p>
                {filter !== 'all' && (
                  <button
                    onClick={() => setFilter('all')}
                    className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mt-3')}
                  >
                    Show all reports
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredReports.map((report) => (
                  <ReportCard
                    key={report.public_id}
                    report={report}
                    isExpanded={expandedId === report.public_id}
                    onToggle={() => setExpandedId(expandedId === report.public_id ? null : report.public_id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CitizenShell>
  )
}

function ReportCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: Report
  isExpanded: boolean
  onToggle: () => void
}) {
  const evidence = splitEvidence(report.evidence)
  const statusColor = statusColors[report.status] || 'bg-gray-500'

  return (
    <div className="transition-all duration-200">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex size-12 items-center justify-center rounded-lg bg-muted">
          <span className="text-sm font-mono font-medium text-muted-foreground">{report.plate}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium truncate">{report.violation_type}</h4>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                `bg-[${statusColor}]/10 text-[${statusColor}]`
              )}
            >
              {statusLabels[report.status] || report.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground truncate">{report.location}</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono">{new Date(report.reported_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <ChevronDown className={cn('size-4 transition-transform', isExpanded && 'rotate-180')} />
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30 px-4 pb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Report ID</p>
              <p className="font-mono text-sm">{report.public_id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Vehicle</p>
              <p className="text-sm">{report.vehicle_type || '—'} {report.vehicle_color ? `(${report.vehicle_color})` : ''}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Submitted</p>
              <p className="text-sm">{new Date(report.reported_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            {report.reviewed_at && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Reviewed</p>
                <p className="text-sm">{new Date(report.reviewed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            )}
            {report.fine_amount && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Fine Amount</p>
                <p className="text-sm font-medium text-green-600">₹{report.fine_amount.toLocaleString()}</p>
              </div>
            )}
          </div>

          {report.description && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground">Description</p>
              <p className="text-sm">{report.description}</p>
            </div>
          )}

          {report.reviewer_notes && (
            <div className="mt-4 space-y-1">
              <p className="text-xs text-muted-foreground">Authority Notes</p>
              <p className="text-sm bg-background p-3 rounded-lg border border-border">{report.reviewer_notes}</p>
            </div>
          )}

          {/* Evidence Images */}
          {evidence.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-muted-foreground">Evidence ({evidence.length})</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {evidence.map((img, index) => (
                  <a
                    key={index}
                    href={evidenceUrl(img)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex-shrink-0 aspect-square w-24 rounded-lg overflow-hidden bg-muted group"
                  >
                    <img src={evidenceUrl(img)} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye className="size-5 text-white" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Status Timeline</p>
            <div className="space-y-3">
              <TimelineItem
                label="Report Submitted"
                time={report.reported_at}
                icon={<FileText className="size-4" />}
                active
                completed
              />
              {['under-review', 'verified', 'challan-issued'].includes(report.status) && (
                <TimelineItem
                  label="Under Review"
                  time={report.reviewed_at || report.reported_at}
                  icon={<Clock className="size-4" />}
                  active={report.status !== 'submitted'}
                  completed={['verified', 'challan-issued'].includes(report.status)}
                />
              )}
              {['verified', 'challan-issued'].includes(report.status) && (
                <TimelineItem
                  label="Verified by Authority"
                  time={report.reviewed_at || undefined}
                  icon={<CheckCircle2 className="size-4" />}
                  active
                  completed
                />
              )}
              {report.status === 'challan-issued' && (
                <TimelineItem
                  label="Challan Issued"
                  time={report.reviewed_at || report.reported_at}
                  icon={<CheckCircle2 className="size-4 text-green-600" />}
                  active
                  completed
                  last
                />
              )}
              {report.status === 'rejected' && (
                <TimelineItem
                  label="Rejected"
                  time={report.reviewed_at || undefined}
                  icon={<XCircle className="size-4 text-red-600" />}
                  active
                  completed
                  last
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TimelineItem({
  label,
  time,
  icon,
  active,
  completed,
  last,
}: {
  label: string
  time?: string
  icon: React.ReactNode
  active: boolean
  completed: boolean
  last?: boolean
}) {
  return (
    <div className="relative flex gap-3">
      {!last && (
        <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-border" />
      )}
      <div className={cn('relative flex size-6 items-center justify-center rounded-full shrink-0', completed ? 'bg-green-600 text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
        {icon}
      </div>
      <div className="flex-1 pt-1">
        <p className={cn('font-medium text-sm', completed && 'text-green-600', active && !completed && 'text-primary')}>
          {label}
        </p>
        <p className="text-xs text-muted-foreground">
          {time ? new Date(time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
        </p>
      </div>
    </div>
  )
}