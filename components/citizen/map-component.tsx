'use client'

import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import { MapPin } from 'lucide-react'
import { violations, hotspots } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const AHMEDABAD_CENTER: [number, number] = [23.0225, 72.5714]

const violationTypeColors: Record<string, string> = {
  'No-Parking Zone': '#ef4444',
  'Footpath Parking': '#f97316',
  'Bus Stop Obstruction': '#eab308',
  'Emergency Lane': '#dc2626',
  'Junction Blocking': '#8b5cf6',
  'Double Parking': '#ec4899',
  'Zebra Crossing': '#06b6d4',
}

export function MapComponent({ userLocation }: { userLocation: [number, number] | null }) {
  const mapRef = useRef<L.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView(userLocation, 15)
    }
  }, [userLocation])

  const nearbyViolations = violations.slice(0, 10)

  if (!mapReady) {
    return (
      <div className="h-[600px] w-full flex items-center justify-center bg-muted">
        <div className="text-muted-foreground">Loading map...</div>
      </div>
    )
  }

  return (
    <MapContainer
      ref={mapInstance => {
        mapRef.current = mapInstance
        if (mapInstance) setMapReady(true)
      }}
      center={userLocation || AHMEDABAD_CENTER}
      zoom={userLocation ? 15 : 12}
      scrollWheelZoom={true}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {userLocation && (
        <CircleMarker
          center={userLocation}
          radius={20}
          pathOptions={{
            color: '#3b82f6',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 2,
          }}
        />
      )}
      {userLocation && (
        <Marker position={userLocation}>
          <Popup>
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-blue-600" />
              <span>Your Location</span>
            </div>
          </Popup>
        </Marker>
      )}
      {nearbyViolations.map((violation) => (
        <Marker key={violation.id} position={[violation.lat, violation.lng]}>
          <Popup>
            <div className="space-y-1 min-w-[200px]">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: `${violationTypeColors[violation.type]}20`, color: violationTypeColors[violation.type] }}
                >
                  {violation.type}
                </span>
              </div>
              <p className="font-mono font-medium">{violation.plate}</p>
              <p className="text-sm text-muted-foreground">{violation.location}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(violation.detectedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                <span>Camera: {violation.camera}</span>
              </div>
            </div>
          </Popup>
          <div
            className="flex items-center justify-center size-8 rounded-full border-2 border-white shadow-lg"
            style={{ backgroundColor: violationTypeColors[violation.type] }}
          >
            <MapPin className="size-4 text-white" />
          </div>
        </Marker>
      ))}
    </MapContainer>
  )
}