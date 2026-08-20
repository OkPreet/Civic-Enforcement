'use client'

import {
  ArrowLeft,
  Camera,
  CircleCheck,
  FileText,
  Loader2,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, storage, type Report } from '@/lib/api'
import { evidenceUrl } from '@/lib/report-mapper'
import { cn } from '@/lib/utils'

const statusLabels: Record<string, string> = {
  submitted: 'Submitted',
  'under-review': 'Under review',
  verified: 'Verified',
  'challan-issued': 'Challan issued',
  rejected: 'Rejected',
  'auto-detected': 'Auto-detected',
}

const statusVariant: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive'> = {
  submitted: 'warning',
  'under-review': 'warning',
  verified: 'secondary',
  'challan-issued': 'success',
  rejected: 'destructive',
  'auto-detected': 'default',
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', full && 'col-span-2')}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function ReportDetail({ publicId }: { publicId: string }) {
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [action, setAction] = useState<'confirmed' | 'rejected' | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [reviewError, setReviewError] = useState('')

  useEffect(() => {
    const token = storage.getToken()
    if (!token) {
      setError('Not signed in')
      setLoading(false)
      return
    }
    api
      .getReport(token, publicId)
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Report not found'))
      .finally(() => setLoading(false))
  }, [publicId])

  if (loading) {
    return (
      <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-3 p-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
        <p className="text-sm">Loading report…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center gap-3 p-24 text-center">
        <p className="text-lg font-medium">{error || 'Report not found'}</p>
        <Link href="/violations" className={cn(buttonVariants({ size: 'sm' }))}>
          Back to violations
        </Link>
      </div>
    )
  }

  const reviewable = ['submitted', 'under-review', 'verified'].includes(report.status)
  const evidence = evidenceUrl(report)
  const timestamps = [
    { label: 'Reported', value: new Date(report.reported_at).toLocaleString('en-IN') },
    { label: 'Reviewed', value: report.reviewed_at ? new Date(report.reviewed_at).toLocaleString('en-IN') : 'Pending' },
  ]

  const submitReview = async () => {
    if (!action) return
    const token = storage.getToken()
    if (!token) return
    setBusy(true)
    setReviewError('')
    try {
      const updated = await api.reviewReport(token, report.public_id, action, notes || undefined)
      setReport(updated)
      setAction(null)
      setNotes('')
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : 'Review failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/violations"
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to violations"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono text-2xl font-semibold tracking-wide">{report.plate}</h1>
              <Badge variant={statusVariant[report.status] || 'secondary'}>
                {statusLabels[report.status] || report.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {report.public_id} · {report.violation_type} · {report.source}
            </p>
          </div>
        </div>

        {reviewable && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setAction('rejected')}
              className={cn(
                buttonVariants({ variant: action === 'rejected' ? 'destructive' : 'outline', size: 'lg' }),
                'h-9 gap-1.5',
              )}
            >
              <X className="size-4" />
              Reject
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setAction('confirmed')}
              className={cn(
                buttonVariants({ variant: action === 'confirmed' ? 'default' : 'default', size: 'lg' }),
                'h-9 gap-1.5',
              )}
            >
              <CircleCheck className="size-4" />
              Confirm & issue challan
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Evidence */}
        <div className="flex flex-col gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <CardTitle className="text-base">Citizen-submitted evidence</CardTitle>
              </div>
              <span className="font-mono text-xs text-muted-foreground">source: {report.source}</span>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidence}
                alt={`Evidence of ${report.violation_type} by vehicle ${report.plate}`}
                className="aspect-video w-full object-cover"
              />
              <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-xs text-white backdrop-blur">
                {new Date(report.reported_at).toLocaleString('en-IN')}
              </div>
            </div>
            {report.evidence && report.evidence.split(',').length > 1 && (
              <div className="grid grid-cols-3 gap-px bg-border">
                {report.evidence.split(',').map((p, i) => (
                  <div key={i} className="relative aspect-video bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${api_base()}${p}`}
                      alt={`Evidence ${i + 1}`}
                      className="size-full object-cover opacity-80"
                    />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white">
                      frame {i + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Report details */}
          <Card className="gap-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" />
                <CardTitle className="text-base">Report details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Vehicle type" value={report.vehicle_type || '—'} />
              <Field label="Vehicle colour" value={report.vehicle_color || '—'} />
              <Field label="Violation type" value={report.violation_type} />
              <Field label="Status" value={statusLabels[report.status] || report.status} />
              <Field label="Fine amount" value={`₹${(report.fine_amount ?? 500).toLocaleString('en-IN')}`} />
              <Field label="Reviewer notes" value={report.reviewer_notes || '—'} />
              {report.description && (
                <Field label="Description" value={report.description} full />
              )}
              {timestamps.map((t) => (
                <Field key={t.label} label={t.label} value={t.value} />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <MapPin className="size-4 text-primary" />
              <CardTitle className="text-base">Location</CardTitle>
            </div>
            <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 p-5 text-sm">
              <Field label="Address" value={report.location} />
              <Field
                label="Coordinates"
                value={
                  report.lat != null && report.lng != null
                    ? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`
                    : 'Not provided'
                }
              />
            </CardContent>
          </Card>

          {/* Review actions */}
          {reviewable && (
            <Card className="gap-4">
              <CardHeader>
                <CardTitle className="text-base">Review decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {action && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="review-notes">Notes (visible to reporter)</Label>
                      <Input
                        id="review-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional note…"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setAction(null)}
                        className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-9')}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={submitReview}
                        className={cn(buttonVariants({ size: 'sm' }), 'h-9 gap-1.5')}
                      >
                        {busy && <Loader2 className="size-4 animate-spin" />}
                        {action === 'confirmed' ? 'Confirm & issue challan' : 'Reject report'}
                      </button>
                    </div>
                    {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
                  </>
                )}
                {!action && (
                  <p className="text-sm text-muted-foreground">
                    Select <strong>Confirm & issue challan</strong> or <strong>Reject</strong> above to
                    update this report.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4 text-primary" />
                Enforcement status
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {report.status === 'challan-issued' ? (
                <p>
                  A challan has been issued to the vehicle owner. Track payment and dispute status in the
                  challans module.
                </p>
              ) : report.status === 'rejected' ? (
                <p>This report was rejected during review. No further enforcement action will be taken.</p>
              ) : (
                <p>Awaiting authority review. Confirm the evidence to issue a challan automatically.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function api_base() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'
}
