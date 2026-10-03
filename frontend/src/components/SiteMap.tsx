import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'

import type { Site } from '../types'

interface SiteMapProps {
  sites: Site[]
  selectedSiteId: string | null
  onSelect: (siteId: string) => void
}

function scoreColor(score: number) {
  if (score >= 70) return '#1e7863'
  if (score >= 50) return '#bd7a24'
  return '#a64a3c'
}

export function SiteMap({ sites, selectedSiteId, onSelect }: SiteMapProps) {
  return (
    <div className="map-shell" aria-label="Candidate sites map">
      <MapContainer center={[70.5, -92]} zoom={3} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sites.map((site) => {
          const selected = site.id === selectedSiteId
          return (
            <CircleMarker
              key={site.id}
              center={[site.lat, site.lon]}
              pathOptions={{
                color: '#f6f2e8',
                fillColor: scoreColor(site.durability_score),
                fillOpacity: 1,
                weight: selected ? 4 : 2,
              }}
              radius={selected ? 11 : 8}
              eventHandlers={{ click: () => onSelect(site.id) }}
              aria-label={`Select ${site.name}`}
            />
          )
        })}
      </MapContainer>
      <div className="map-legend" aria-label="Durability score legend">
        <span><i className="legend-dot legend-dot--high" />70–100 more durable</span>
        <span><i className="legend-dot legend-dot--medium" />50–69 watch closely</span>
        <span><i className="legend-dot legend-dot--low" />0–49 less durable</span>
      </div>
    </div>
  )
}
