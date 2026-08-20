'use client'

import 'leaflet/dist/leaflet.css'
import type { LatLngExpression } from 'leaflet'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'

export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer
      center={[lat, lng] as LatLngExpression}
      zoom={15}
      scrollWheelZoom={false}
      dragging={false}
      zoomControl={false}
      doubleClickZoom={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution="&copy; OpenStreetMap &copy; CARTO"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <CircleMarker
        center={[lat, lng]}
        radius={10}
        pathOptions={{
          color: '#ffffff',
          weight: 2,
          fillColor: '#ff5c4d',
          fillOpacity: 1,
        }}
      />
    </MapContainer>
  )
}
