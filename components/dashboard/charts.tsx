'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { HourlyTrendPoint, TypeCount } from '@/lib/api'
import { hourlyViolations, violationByType } from '@/lib/mock-data'

const axisStyle = {
  fontSize: 11,
  fill: 'var(--muted-foreground)',
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-medium text-popover-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function HourlyTrendChart({ data }: { data?: HourlyTrendPoint[] }) {
  const chartData = data && data.length > 0 ? data : hourlyViolations
  const hasActual = chartData.some((d) => d.count > 0)
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Violations by hour</CardTitle>
            <CardDescription>
              {data && data.length > 0
                ? 'Actual detections vs. rolling baseline'
                : 'Actual detections vs. predicted volume'}
            </CardDescription>
          </div>
          <Badge variant="accent">{data && data.length > 0 ? 'Live data' : 'Predictive overlay'}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ left: -18, right: 6, top: 4 }}>
            <defs>
              <linearGradient id="fillActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={axisStyle} />
            <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={40} />
            <Tooltip content={<ChartTooltip />} />
            {hasActual ? (
              <Area
                type="monotone"
                dataKey="count"
                name="actual"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#fillActual)"
              />
            ) : (
              <Area
                type="monotone"
                dataKey="count"
                name="reports"
                stroke="var(--chart-1)"
                strokeWidth={2}
                fill="url(#fillActual)"
              />
            )}
            <Line
              type="monotone"
              dataKey="predicted"
              name="predicted"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const typeColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
]

export function ViolationTypeChart({ data }: { data?: TypeCount[] }) {
  const chartData = data && data.length > 0 ? data : violationByType
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>By violation type</CardTitle>
        <CardDescription>
          {data && data.length > 0 ? 'All-time reports across all zones' : 'Last 7 days across all zones'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ left: -18, right: 6, top: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="type" tickLine={false} axisLine={false} tick={axisStyle} interval={0} />
            <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={40} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
            <Bar dataKey="count" name="violations" radius={[6, 6, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={typeColors[i % typeColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
