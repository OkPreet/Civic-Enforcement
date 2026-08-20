'use client'

import {
  ArrowLeft,
  Camera,
  CircleCheck,
  Clock,
  Download,
  FileText,
  MapPin,
  ScanText,
  ShieldCheck,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatTime,
  statusLabels,
  statusVariant,
  type Violation,
} from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const MiniMap = dynamic(() => import('@/components/dashboard/mini-map'), {
  ssr: false,
  loading: () => <div className="size-full bg-muted" />,
})

export function ViolationDetail({ violation: v }: { violation: Violation }) {
  const timeline = [
    { icon: Camera, label: 'Vehicle detected in restricted zone', time: v.detectedAt, done: true },
    { icon: ScanText, label: `Plate recognised · ${v.confidence}% confidence`, time: v.detectedAt, done: true },
    { icon: Clock, label: `Duration threshold exceeded (${v.durationMin} min)`, time: v.detectedAt, done: true },
    { icon: ShieldCheck, label: 'Evidence captured & record created', time: v.detectedAt, done: true },
    {
      icon: FileText,
      label: v.status === 'challan-issued' ? 'Challan issued to owner' : 'Awaiting challan',
      time: v.detectedAt,
      done: v.status === 'challan-issued',
    },
  ]

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
              <h1 className="font-mono text-2xl font-semibold tracking-wide">{v.plate}</h1>
              <Badge variant={statusVariant[v.status]}>{statusLabels[v.status]}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {v.id} · {v.type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: 'destructive', size: 'lg' }), 'h-9 gap-1.5')}
          >
            <X className="size-4" />
            Dismiss
          </button>
          <button type="button" className={cn(buttonVariants({ size: 'lg' }), 'h-9 gap-1.5')}>
            <CircleCheck className="size-4" />
            Issue challan
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Evidence + ANPR */}
        <div className="flex flex-col gap-6">
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Camera className="size-4 text-primary" />
                <CardTitle className="text-base">Photographic evidence</CardTitle>
              </div>
              <span className="font-mono text-xs text-muted-foreground">{v.camera}</span>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.evidence || '/placeholder.svg'}
                alt={`Evidence of ${v.type} by vehicle ${v.plate}`}
                className="aspect-video w-full object-cover"
              />
              <div className="absolute left-[26%] top-[40%] h-[36%] w-[48%] rounded-md border-2 border-accent">
                <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground">
                  {v.vehicleType.toUpperCase()} {v.confidence}%
                </span>
              </div>
              <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 font-mono text-xs text-white backdrop-blur">
                {formatTime(v.detectedAt)} IST
              </div>
            </div>
            <div className="grid grid-cols-3 gap-px bg-border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="relative aspect-video bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.evidence || '/placeholder.svg'}
                    alt={`Evidence frame ${i + 1}`}
                    className="size-full object-cover opacity-80"
                  />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 font-mono text-[9px] text-white">
                    frame {i + 1}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* ANPR panel */}
          <Card className="gap-4">
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <ScanText className="size-4 text-primary" />
                <CardTitle className="text-base">ANPR recognition</CardTitle>
              </div>
              <Badge variant="success">{v.confidence}% match</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 py-6">
                <span className="rounded-md bg-background px-4 py-2 font-mono text-2xl font-bold tracking-[0.35em] shadow-sm">
                  {v.plate}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Field label="Vehicle type" value={v.vehicleType} />
                <Field label="Model / colour" value={v.vehicleModel} />
                <Field label="Confidence" value={`${v.confidence}%`} />
                <Field label="Camera source" value={v.camera} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">
          {/* Location */}
          <Card className="gap-0 overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3">
              <MapPin className="size-4 text-primary" />
              <CardTitle className="text-base">Location</CardTitle>
            </div>
            <div className="h-44 w-full">
              <MiniMap lat={v.lat} lng={v.lng} />
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-5 text-sm">
              <Field label="Address" value={v.location} full />
              <Field label="Zone" value={v.zone} />
              <Field label="Coordinates" value={`${v.lat.toFixed(4)}, ${v.lng.toFixed(4)}`} />
            </div>
          </Card>

          {/* Summary */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Violation summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Type" value={v.type} />
              <Field label="Detected" value={formatTime(v.detectedAt)} />
              <Field label="Duration" value={`${v.durationMin} minutes`} />
              <Field label="Fine amount" value={`₹${v.fineAmount.toLocaleString('en-IN')}`} />
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="gap-4">
            <CardHeader>
              <CardTitle className="text-base">Detection timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative flex flex-col gap-4 before:absolute before:left-[13px] before:top-1 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
                {timeline.map((step, i) => (
                  <li key={i} className="relative flex items-start gap-3">
                    <span
                      className={cn(
                        'z-10 flex size-7 shrink-0 items-center justify-center rounded-full',
                        step.done
                          ? 'bg-success/15 text-success'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <step.icon className="size-3.5" />
                    </span>
                    <div className="pt-0.5">
                      <p className="text-sm leading-tight">{step.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {step.done ? formatTime(step.time) : 'Pending'}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <button
            type="button"
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-10 gap-1.5')}
          >
            <Download className="size-4" />
            Download evidence pack (PDF)
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-0.5', full && 'col-span-2')}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
