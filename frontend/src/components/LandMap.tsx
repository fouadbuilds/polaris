import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import { GeoJSON } from 'react-leaflet'

export function LandMap() {
  const [land, setLand] = useState<ComponentProps<typeof GeoJSON>['data'] | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/world-land.geojson', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Land map unavailable'); return response.json() })
      .then(data => { if (!controller.signal.aborted) setLand(data) })
      .catch(() => { if (!controller.signal.aborted) setError(true) })
    return () => controller.abort()
  }, [])
  if (error) return <div className="outline-status" role="alert">Saved land map could not load. Refresh to retry.</div>
  return land && <GeoJSON data={land} interactive={false} attribution='Land: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'
    style={{ color: 'var(--map-land-outline)', weight: 0.7, fillColor: 'var(--map-land)', fillOpacity: 1 }} />
}
