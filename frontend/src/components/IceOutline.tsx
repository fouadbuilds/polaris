import { useEffect, useState } from 'react'
import { GeoJSON } from 'react-leaflet'
import type { ComponentProps } from 'react'
type OutlineData = ComponentProps<typeof GeoJSON>['data']

export function IceOutline({ url, scenario, onStatus, opacity = 1 }: { url: string; scenario: boolean; onStatus: (message: string | null) => void; opacity?: number }) {
  const [loaded, setLoaded] = useState<{ url: string; data: OutlineData } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    onStatus('Loading ice outlines…')
    fetch(url, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Ice outlines could not load.'); return response.json() as Promise<OutlineData> })
      .then(data => { if (!controller.signal.aborted) { setLoaded({ url, data }); onStatus(null) } })
      .catch(error => { if (!controller.signal.aborted) onStatus(error instanceof Error ? error.message : 'Ice outlines could not load.') })
    return () => controller.abort()
  }, [url, onStatus])
  if (loaded?.url !== url) return null
  return <GeoJSON key={url} data={loaded.data} interactive={false} attribution='Ice: <a href="https://nsidc.org/data/g02135/versions/4">NOAA/NSIDC</a> · approximate display outlines'
    style={{ color: 'var(--map-ice-outline)', weight: 1.3, fillColor: 'var(--map-ice)', fillOpacity: opacity, dashArray: scenario ? '6 4' : undefined }} />
}
