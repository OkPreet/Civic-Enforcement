'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { MapPin, Navigation, AlertCircle } from 'lucide-react'
import { CitizenShell } from '@/components/citizen/shell'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { violations, hotspots } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const MapComponent = dynamic(
  () => import('@/components/citizen/map-component').then(mod => mod.MapComponent),
  { ssr: false, loading: () => <div className="h-[600px] w-full flex items-center justify-center bg-muted" /> }
)

export default function NearbyViolationsPage() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationError, setLocationError] = useState('')
  const [gettingLocation, setGettingLocation] = useState(false)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported')
      return
    }
    setGettingLocation(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setGettingLocation(false)
      },
      err => {
        setLocationError('Unable to get location')
        setGettingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <CitizenShell>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Nearby Violations</h1>
            <p className="text-sm text-muted-foreground">
              View recent illegal parking reports around you
            </p>
          </div>
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full sm:w-auto')}
          >
            {gettingLocation ? (
              <>
                <Navigation className="size-4 mr-2 animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <Navigation className="size-4 mr-2" />
                Find Me
              </>
            )}
          </button>
        </div>

        {locationError && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            {locationError}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Map */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-0">
              <CardTitle>Live Violation Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative h-[600px] w-full">
                <MapComponent userLocation={userLocation} />
              </div>
            </CardContent>
          </Card>

          {/* Violations List & Hotspots */}
          <div className="space-y-6">
            {/* Hotspots */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="size-5" />
                  Violation Hotspots
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hotspots.slice(0, 8).map((spot, index) => (
                  <div
                    key={spot.name}
                    className={cn(
                      'flex items-center gap-3 rounded-lg p-3 transition-colors cursor-pointer'
                    )}
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{spot.name}</p>
                      <p className="text-xs text-muted-foreground">{spot.count} violations · {spot.trend > 0 ? '+' : ''}{spot.trend}% vs last week</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                        spot.trend > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      )}
                    >
                      {spot.trend > 0 ? '↑' : '↓'} {Math.abs(spot.trend)}%
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Violations List */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Violations Nearby</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {violations.slice(0, 10).map((violation) => (
                  <div
                    key={violation.id}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors"
                  >
                    <div
                      className="flex size-10 items-center justify-center rounded-lg shrink-0"
                      style={{ backgroundColor: `${violationTypeColors[violation.type]}20` }}
                    >
                      <MapPin className="size-5" style={{ color: violationTypeColors[violation.type] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{violation.plate}</p>
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0',
                            `bg-[${violationTypeColors[violation.type]}]/10 text-[${violationTypeColors[violation.type]}]`
                          )}
                        >
                          {violation.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{violation.location}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(violation.detectedAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </CitizenShell>
  )
}

const violationTypeColors: Record<string, string> = {
  'No-Parking Zone': '#ef4444',
  'Footpath Parking': '#f97316',
  'Bus Stop Obstruction': '#eab308',
  'Emergency Lane': '#dc2626',
  'Junction Blocking': '#8b5cf6',
  'Double Parking': '#ec4899',
  'Zebra Crossing': '#06b6d4',
}