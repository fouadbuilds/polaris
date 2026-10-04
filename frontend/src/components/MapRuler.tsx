import { useEffect } from 'react'
import { CircleMarker, Polyline, Tooltip, useMapEvents } from 'react-leaflet'
import { distanceKm, greatCirclePoints } from '../routeMetrics'

export type RulerPoint = [number, number]
export function MapRuler({active, points, onChange}: {active: boolean; points: RulerPoint[]; onChange: (points: RulerPoint[]) => void}) {
  const map = useMapEvents({click: event => {
    if (active) onChange(points.length === 2 ? [[event.latlng.lat, event.latlng.lng]] : [...points, [event.latlng.lat, event.latlng.lng]])
  }})
  useEffect(() => {
    map.getContainer().classList.toggle('ruler-active', active)
    return () => map.getContainer().classList.remove('ruler-active')
  }, [map, active])
  return <>
    {points.length === 2 && <Polyline positions={greatCirclePoints([points[0][1], points[0][0]], [points[1][1], points[1][0]]).map(([lon, lat]) => [lat, lon])} interactive={false} pathOptions={{color: '#284d67', weight: 3, dashArray: '6 5'}}>
      <Tooltip permanent direction="center" className="ruler-label">{distanceKm(points.map(([lat, lon]) => [lon, lat])).toFixed(1)} km</Tooltip>
    </Polyline>}
    {points.map((point, i) => <CircleMarker key={i} center={point} radius={6} interactive={false} pathOptions={{color: '#284d67', fillColor: '#fff', fillOpacity: 1, weight: 2}}><Tooltip permanent direction="top" className="ruler-point">{i ? 'B' : 'A'}</Tooltip></CircleMarker>)}
  </>
}

export function RulerControls({active, points, onToggle, onClear}: {active: boolean; points: RulerPoint[]; onToggle: () => void; onClear: () => void}) {
  const km = distanceKm(points.map(([lat, lon]) => [lon, lat]))
  return <div className="map-ruler-controls" aria-label="Distance ruler">
    <button type="button" aria-pressed={active} onClick={onToggle}>↔ Ruler</button>
    {(active || points.length > 0) && <div className="ruler-card">
      <strong>{points.length === 2 ? `${km.toLocaleString(undefined, {maximumFractionDigits: 1})} km · ${(km / 1.609344).toLocaleString(undefined, {maximumFractionDigits: 1})} miles` : points.length ? 'Click the second point' : 'Click two points on the map'}</strong>
      {points.length === 2 && <span>{(km / 1.852).toFixed(1)} nautical miles · direct great-circle distance</span>}
      <small>{active && points.length === 2 ? 'Click again to start a new measurement. ' : ''}This does not follow a shipping route.</small>
      <button type="button" onClick={onClear}>Clear</button>
    </div>}
  </div>
}
