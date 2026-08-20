import { ArrowRight, MapPin, ScanLine, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="default" className="gap-1.5 py-1 pl-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
              AI
            </span>
            Live in Ahmedabad · 512 cameras
          </Badge>

          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Catch illegal parking the moment it happens.
          </h1>

          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Sentinel turns existing CCTV and roadside cameras into an autonomous enforcement
            network. Computer vision plus ANPR detects violations, captures evidence, and hands
            traffic authorities a real-time map of every hotspot.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              data-icon="inline-end"
              className={cn(buttonVariants({ size: 'lg' }), 'h-11 px-5 text-base')}
            >
              Open the dashboard
              <ArrowRight />
            </Link>
            <a
              href="#how"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 px-5 text-base')}
            >
              See how it works
            </a>
          </div>

          <dl className="mt-4 grid w-full grid-cols-3 gap-6 border-t border-border pt-6">
            {[
              { k: '96.8%', v: 'ANPR accuracy' },
              { k: '< 15s', v: 'Detect to record' },
              { k: '24/7', v: 'Autonomous watch' },
            ].map((s) => (
              <div key={s.v}>
                <dt className="text-2xl font-semibold tracking-tight">{s.k}</dt>
                <dd className="text-sm text-muted-foreground">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DetectionPreview />
      </div>
    </section>
  )
}

function DetectionPreview() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-primary/5">
        <div className="mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            CAM-CGR-07 · Live
          </div>
          <span className="font-mono text-xs text-muted-foreground">CG Road · 09:42</span>
        </div>

        <div className="relative overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/evidence/evidence-1.png"
            alt="Live camera feed detecting an illegally parked white car in a no-parking zone"
            className="aspect-[4/3] w-full object-cover"
          />
          {/* detection bounding box */}
          <div className="absolute left-[28%] top-[42%] h-[34%] w-[46%] rounded-md border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]">
            <span className="absolute -top-6 left-0 rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground">
              VEHICLE 98%
            </span>
            <ScanLine className="absolute right-1 top-1 size-4 text-accent" />
          </div>
          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm">
            <div>
              <p className="font-mono text-sm font-semibold tracking-widest text-white">
                GJ01 KL 4821
              </p>
              <p className="text-[11px] text-white/70">No-Parking Zone · 34 min</p>
            </div>
            <Badge variant="warning" className="bg-warning/90 text-warning-foreground">
              Violation
            </Badge>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { icon: ScanLine, label: 'Plate matched' },
            { icon: MapPin, label: 'Geo-tagged' },
            { icon: ShieldCheck, label: 'Evidence saved' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex flex-col items-center gap-1 rounded-lg bg-muted/60 px-2 py-3 text-center"
            >
              <row.icon className="size-4 text-primary" />
              <span className="text-[11px] leading-tight text-muted-foreground">{row.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute -right-4 -top-5 hidden rounded-xl border border-border bg-card px-4 py-3 shadow-xl lg:block">
        <p className="text-xs text-muted-foreground">Violations today</p>
        <p className="text-xl font-semibold tracking-tight">342</p>
      </div>
    </div>
  )
}
