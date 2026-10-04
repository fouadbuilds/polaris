import { useEffect, useMemo, useState } from 'react'
import { Pane, useMapEvents } from 'react-leaflet'
import { point } from 'leaflet'
import { bundleRoutes } from '../routeBundles'
import { SmoothRoute } from './SmoothRoute'
import { RouteDistance } from './RouteDistance'

export interface TradeRoute {
  type: 'Feature'
  geometry: {type: 'LineString'; coordinates: [number, number][]}
  properties: {
    id: string; name: string; category: 'passage' | 'used' | 'proposed' | 'team'; status: string
    summary: string; cargo: string; season: string; waypoints: string[]; constraints: string[]
    sources: {title: string; url: string}[]; geometry_method: string
  }
}
const ROUTE_LABELS: Record<string, string> = {
  'nwp-victoria': 'Victoria Strait', 'nwp-prince-wales': 'Prince of Wales', 'nwp-rae-simpson': 'Rae / Simpson',
  'eastern-sealift': 'Eastern sealift', 'western-resupply': 'Western resupply', 'churchill-atlantic': 'Churchill exports',
  'grays-west': 'Grays Bay · Pacific', 'grays-east': 'Grays Bay · Atlantic', 'grays-road': 'Grays Bay road',
}
export const routeColor = (id: string) => `var(--map-route-${id})`
const DEFAULT_ROUTES = ['nwp-victoria', 'nwp-prince-wales']

export function useTradeRoutes() {
  const [routes, setRoutes] = useState<TradeRoute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<string[]>(DEFAULT_ROUTES)
  const [show, setShow] = useState(true)
  const [selectedId, setSelectedId] = useState('nwp-victoria')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/routes-canada.geojson?display=curves-5', {signal: controller.signal})
      .then(response => { if (!response.ok) throw new Error('Saved trade routes could not load.'); return response.json() })
      .then(data => { if (!controller.signal.aborted) setRoutes(data.features) })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Trade routes unavailable.') })
    return () => controller.abort()
  }, [])
  const selected = routes.find(route => route.properties.id === selectedId)
  function toggle(id: string) { setEnabled(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]) }
  function preset(group: 'passage' | 'used' | 'proposed' | 'team' | 'all') {
    const ids = routes.filter(route => group === 'all' || route.properties.category === group).map(route => route.properties.id)
    setEnabled(ids); setShow(true)
    if (ids[0]) setSelectedId(ids[0])
  }
  return {routes, error, enabled, setEnabled, show, setShow, selected, selectedId, setSelectedId, toggle, preset}
}
type RouteState = ReturnType<typeof useTradeRoutes>

export function TradeRouteLayer({state, onSelect}: {state: RouteState; onSelect: (id: string) => void}) {
  const [zoomRevision, setZoomRevision] = useState(0)
  const map = useMapEvents({zoomend: () => setZoomRevision(value => value + 1)})
  const displayed = useMemo(() => {
    const visible = state.routes.filter(route => state.enabled.includes(route.properties.id))
    const lanes = bundleRoutes(visible.map(route => ({id: route.properties.id, coordinates: route.geometry.coordinates})),
      ([lon, lat]) => map.project([lat, lon]), p => { const latlng = map.unproject(point(p.x, p.y)); return [latlng.lng, latlng.lat] })
    return visible.map((route, i) => ({route, positions: lanes[i].coordinates.map(([lon, lat]) => [lat, lon] as [number, number])}))
  }, [state.routes, state.enabled, map, zoomRevision])
  return <Pane name="trade-routes" style={{zIndex: 450}}>{state.show && <>
    {displayed.map(({route, positions}) => <SmoothRoute key={`${route.properties.id}-casing`} positions={positions} interactive={false}
      options={{color: 'var(--map-route-casing)', weight: 5.5, opacity: 0.94, lineCap: 'round', lineJoin: 'round',
        dashArray: ['proposed', 'team'].includes(route.properties.category) ? '9 7' : undefined}} />)}
    {displayed.map(({route, positions}) => <SmoothRoute key={route.properties.id} positions={positions}
      options={{color: routeColor(route.properties.id), weight: route.properties.id === state.selectedId ? 4 : 3.2, opacity: 1,
        lineCap: 'round', lineJoin: 'round', className: 'route-cable',
        dashArray: ['proposed', 'team'].includes(route.properties.category) ? route.properties.id === 'grays-road' ? '2 6' : '9 7' : undefined}}
      tooltip={{name: route.properties.name, status: route.properties.status}} onClick={() => onSelect(route.properties.id)} />)}
  </>}</Pane>
}

export function TradeRouteLegend({state}: {state: RouteState}) {
  return <div className="route-cable-legend" aria-label="Visible trade routes">
    {state.routes.filter(route => state.enabled.includes(route.properties.id)).map(route => <button key={route.properties.id}
      aria-label={route.properties.name} aria-pressed={route.properties.id === state.selectedId} onClick={() => state.setSelectedId(route.properties.id)}>
      <i style={{borderColor: routeColor(route.properties.id), borderTopStyle: ['proposed', 'team'].includes(route.properties.category) ? 'dashed' : 'solid'}} />
      {ROUTE_LABELS[route.properties.id] ?? route.properties.name}
    </button>)}
    <small>Parallel lines separate shared corridors for display.</small>
  </div>
}

export function TradeRouteControls({state, onFocus}: {state: RouteState; onFocus: (route: TradeRoute) => void}) {
  const selected = state.selected?.properties
  return <section className="trade-route-controls" aria-label="Canadian trade route controls">
    <p className="eyebrow">Canada & Northwest Passage</p>
    <label className="layer-switch"><input type="checkbox" checked={state.show} onChange={event => state.setShow(event.target.checked)} /> Show logistics routes</label>
    <div className="route-presets" aria-label="Route groups">
      <button onClick={() => state.preset('used')}>Current port connections</button>
      <button onClick={() => state.preset('proposed')}>Published port projects</button>
      <button onClick={() => state.preset('team')}>Team port concepts</button>
      <button onClick={() => state.preset('passage')}>Passage alternatives</button>
      <button onClick={() => state.preset('all')}>All routes</button>
    </div>
    <p className="route-method">Current connections serve existing ports. Published projects and team concepts are separate; their dashed lines illustrate possible connections. Passage alternatives show through-routes.</p>
    {state.error && <p role="alert">{state.error}</p>}
    {!state.routes.length && !state.error && <p role="status">Loading saved routes…</p>}
    <label className="route-picker" htmlFor="trade-route-picker">Inspect a route
      <select id="trade-route-picker" value={state.selectedId} onChange={event => {
        const id = event.target.value
        state.setSelectedId(id); state.setShow(true)
        state.setEnabled(previous => previous.includes(id) ? previous : [...previous, id])
      }}>{state.routes.map(route => <option key={route.properties.id} value={route.properties.id}>{route.properties.name}</option>)}</select>
    </label>
    <details className="route-choices"><summary>Individual route visibility · {state.enabled.length} selected</summary>
    {(['used', 'proposed', 'team', 'passage'] as const).map(category => <div className="route-group" key={category}>
      <h3>{{passage: 'Passage alternatives', used: 'Current port connections', proposed: 'Published port projects', team: 'Team port concepts'}[category]}</h3>
      {state.routes.filter(route => route.properties.category === category).map(route => <div className={`route-row ${route.properties.id === state.selectedId ? 'route-row--selected' : ''}`} key={route.properties.id}>
        <input aria-label={`Show ${route.properties.name}`} type="checkbox" checked={state.enabled.includes(route.properties.id)} onChange={() => state.toggle(route.properties.id)} />
        <i className="route-color-dot" style={{background: routeColor(route.properties.id)}} /><button aria-pressed={route.properties.id === state.selectedId} onClick={() => state.setSelectedId(route.properties.id)}>{route.properties.name}</button>
      </div>)}
    </div>)}</details>
    {selected && state.selected && <article className="route-detail" aria-label="Selected route evidence">
      <span className="route-status" style={{color: routeColor(selected.id)}}>{selected.status}</span>
      <h2>{selected.name}</h2>
      <RouteDistance key={selected.id} route={state.selected} routes={state.routes} />
      <button className="route-focus" onClick={() => {
        state.setShow(true)
        state.setEnabled(previous => previous.includes(selected.id) ? previous : [...previous, selected.id])
        onFocus(state.selected!)
      }}>Show & focus this route</button>
      <p>{selected.summary}</p>
      <dl><dt>Trade / cargo</dt><dd>{selected.cargo}</dd><dt>Season / timing</dt><dd>{selected.season}</dd></dl>
      <p className="route-waypoints">{selected.waypoints.join(' → ')}</p>
      <h3>What limits this corridor</h3>
      <ul>{selected.constraints.map(item => <li key={item}>{item}</li>)}</ul>
      <h3>Research sources · checked 3 October 2026</h3>
      {selected.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>)}
      <details><summary>How the line was drawn</summary><p>{selected.geometry_method}</p></details>
    </article>}
  </section>
}
