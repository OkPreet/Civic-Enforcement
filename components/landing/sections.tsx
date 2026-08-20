import {
  ArrowRight,
  BrainCircuit,
  Cctv,
  Clock,
  FileText,
  Gauge,
  MapPinned,
  ScanText,
  ShieldCheck,
  SquareParking,
  TrafficCone,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
      <Badge variant="secondary" className="uppercase tracking-wider">
        {eyebrow}
      </Badge>
      <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      <p className="text-pretty text-muted-foreground">{description}</p>
    </div>
  )
}

const steps = [
  {
    icon: Cctv,
    title: 'Detect',
    body: 'Computer vision watches CCTV and roadside feeds, spotting vehicles inside restricted zones in real time.',
  },
  {
    icon: ScanText,
    title: 'Identify',
    body: 'ANPR reads the number plate and classifies the vehicle while geolocation pins the exact zone.',
  },
  {
    icon: Clock,
    title: 'Verify',
    body: 'Duration tracking confirms an actual violation, filtering out brief, legal stops to cut false positives.',
  },
  {
    icon: FileText,
    title: 'Record',
    body: 'A tamper-evident record is generated with plate, location, timestamp, type, and photo/video evidence.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From camera frame to enforceable record"
          description="A four-stage pipeline runs continuously on every connected camera — no manual monitoring, no citizen complaints required."
        />
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-xl border border-border bg-card p-6">
              <span className="font-mono text-xs text-muted-foreground">
                0{i + 1}
              </span>
              <span className="mt-4 flex size-11 items-center justify-center rounded-lg bg-primary/12 text-primary">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-1/2 hidden size-5 -translate-y-1/2 text-border lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const capabilities = [
  {
    icon: ScanText,
    title: 'Automatic Number Plate Recognition',
    body: 'High-accuracy OCR reads plates across lighting, angles, and weather — even at speed.',
  },
  {
    icon: SquareParking,
    title: 'Zone-aware detection',
    body: 'No-parking zones, footpaths, bus stops, junctions and emergency lanes mapped and enforced.',
  },
  {
    icon: MapPinned,
    title: 'Real-time GIS dashboard',
    body: 'Every violation plotted live on a city map with drill-down into any incident.',
  },
  {
    icon: TrafficCone,
    title: 'Violation heatmaps',
    body: 'See recurring hotspots at a glance and reallocate enforcement where it matters.',
  },
  {
    icon: BrainCircuit,
    title: 'Predictive analytics',
    body: 'Forecast where and when violations are likely so authorities can act before they happen.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence-grade records',
    body: 'Timestamped photo and video evidence packaged for challans and audits.',
  },
]

export function Capabilities() {
  return (
    <section id="capabilities" className="border-t border-border bg-card/30 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Capabilities"
          title="Everything an enforcement team needs"
          description="One platform for detection, verification, reporting, and city-wide analytics."
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c) => (
            <div
              key={c.title}
              className="group rounded-xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <span className="flex size-11 items-center justify-center rounded-lg bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const impactStats = [
  { icon: TrendingUp, k: '38%', v: 'fewer repeat violations in monitored corridors' },
  { icon: Clock, k: '14 min', v: 'average response time, down from hours' },
  { icon: Gauge, k: '512', v: 'cameras integrated with zero new hardware' },
]

export function PredictiveImpact() {
  return (
    <section id="impact" className="border-t border-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-6">
          <Badge variant="secondary" className="w-fit uppercase tracking-wider">
            Predict, don&apos;t just react
          </Badge>
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Move enforcement from reactive to preventive
          </h2>
          <p className="text-pretty leading-relaxed text-muted-foreground">
            Sentinel learns the rhythm of your city — which junctions clog at 6pm, which markets
            spill onto footpaths on weekends. Predictive models flag high-risk locations and time
            windows so authorities can deploy resources before congestion and hazards build up.
          </p>
          <div className="flex flex-col gap-3">
            {impactStats.map((s) => (
              <div
                key={s.v}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-success/12 text-success">
                  <s.icon className="size-5" />
                </span>
                <p className="text-sm">
                  <span className="text-lg font-semibold">{s.k}</span>{' '}
                  <span className="text-muted-foreground">{s.v}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Risk forecast · next 6 hours</p>
            <Badge variant="accent">Predictive</Badge>
          </div>
          <ul className="mt-5 flex flex-col gap-3">
            {[
              { loc: 'CG Road', level: 92, when: '18:00 – 20:00' },
              { loc: 'Maninagar', level: 78, when: '17:00 – 19:00' },
              { loc: 'Law Garden', level: 64, when: '19:00 – 21:00' },
              { loc: 'SG Highway', level: 41, when: '18:30 – 20:30' },
            ].map((r) => (
              <li key={r.loc} className="flex items-center gap-4">
                <span className="w-28 shrink-0 text-sm font-medium">{r.loc}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${r.level}%` }}
                  />
                </div>
                <span className="w-10 text-right font-mono text-xs text-muted-foreground">
                  {r.level}%
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            Highest predicted risk at <span className="text-foreground">CG Road, 18:00–20:00</span>.
            Recommend proactive patrol.
          </p>
        </div>
      </div>
    </section>
  )
}

export function CtaBand() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-primary px-6 py-14 text-center text-primary-foreground sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_120%_at_50%_0%,rgba(255,255,255,0.18),transparent)]"
          />
          <h2 className="relative text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Give your city eyes that never blink
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-pretty text-primary-foreground/80">
            Explore the authority dashboard with live Ahmedabad data, from citywide heatmaps down to
            a single vehicle&apos;s evidence record.
          </p>
          <Link
            href="/dashboard"
            data-icon="inline-end"
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'lg' }),
              'relative mt-7 h-11 px-6 text-base',
            )}
          >
            Launch dashboard
            <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  )
}
