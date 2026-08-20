'use client'

import 'leaflet/dist/leaflet.css'
import type { LatLngExpression } from 'leaflet'
import { useRouter } from 'next/navigation'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import {
  AHMEDABAD_CENTER,
  hotspots,
  type Violation,
  type ViolationStatus,
} from '@/lib/mock-data'

const statusColor: Record<ViolationStatus, string> = {
  'auto-detected': '#e8a53a',
  pending: '#e0b13a',
  verified: '#7b7bff',
  'challan-issued': '#3fbf7f',
  dismissed: '#8a8fa3',
}

export default function ViolationMap({
  violations,
  showHeat,
  showIncidents = true,
}: {
  violations: Violation[]
  showHeat: boolean
  showIncidents?: boolean
}) {
  const router = useRouter()

  return (
    <MapContainer
      center={AHMEDABAD_CENTER as LatLngExpression}
      zoom={12}
      scrollWheelZoom
      className="h-full w-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap &copy; CARTO'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />

      {showHeat &&
        hotspots.map((h) => {
          const radius = 18 + (h.count / 200) * 34
          return (
            <CircleMarker
              key={`heat-${h.name}`}
              center={[h.lat, h.lng]}
              radius={radius}
              pathOptions={{
                color: 'transparent',
                fillColor: '#ff5c4d',
                fillOpacity: 0.16 + (h.count / 200) * 0.28,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]}>
                <span className="text-xs font-medium">
                  {h.name}: {h.count} violations
                </span>
              </Tooltip>
            </CircleMarker>
          )
        })}

      {showIncidents &&
        violations.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.lat, v.lng]}
            radius={7}
            eventHandlers={{ click: () => router.push(`/violations/${v.id}`) }}
            pathOptions={{
              color: '#ffffff',
              weight: 1.5,
              fillColor: statusColor[v.status],
              fillOpacity: 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              <span className="text-xs">
                <strong>{v.plate}</strong> · {v.type}
                <br />
                {v.location}
              </span>
            </Tooltip>
          </CircleMarker>
        ))}
    </MapContainer>
  )
}
