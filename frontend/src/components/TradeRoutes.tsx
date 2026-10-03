import { useEffect, useState } from 'react'
import { Pane, Polyline, Tooltip } from 'react-leaflet'

export interface TradeRoute {
  type: 'Feature'
  geometry: {type: 'LineString'; coordinates: [number, number][]}
  properties: {
    id: string; name: string; category: 'passage' | 'used' | 'proposed'; status: string
    summary: string; cargo: string; season: string; waypoints: string[]; constraints: string[]
    sources: {title: string; url: string}[]; geometry_method: string
  }
}
const COLORS = {passage: '#8b3f22', used: '#08756b', proposed: '#7848ac'}
const DEFAULT_ROUTES = ['nwp-victoria', 'nwp-prince-wales']

export function useTradeRoutes() {
  const [routes, setRoutes] = useState<TradeRoute[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<string[]>(DEFAULT_ROUTES)
  const [show, setShow] = useState(true)
  const [selectedId, setSelectedId] = useState('nwp-victoria')
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/routes-canada-v2.geojson', {signal: controller.signal})
      .then(response => { if (!response.ok) throw new Error('Saved trade routes could not load.'); return response.json() })
      .then(data => { if (!controller.signal.aborted) setRoutes(data.features) })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Trade routes unavailable.') })
    return () => controller.abort()
  }, [])
  const selected = routes.find(route => route.properties.id === selectedId)
  function toggle(id: string) { setEnabled(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]) }
  function preset(group: 'passage' | 'used' | 'proposed' | 'all') {
    const ids = routes.filter(route => group === 'all' || route.properties.category === group).map(route => route.properties.id)
    setEnabled(ids); setShow(true)
    if (ids[0]) setSelectedId(ids[0])
  }
  return {routes, error, enabled, setEnabled, show, setShow, selected, selectedId, setSelectedId, toggle, preset}
}
type RouteState = ReturnType<typeof useTradeRoutes>

export function TradeRouteLayer({state, onSelect}: {state: RouteState; onSelect: (id: string) => void}) {
  return <Pane name="trade-routes" style={{zIndex: 450}}>{state.show && state.routes.filter(route => state.enabled.includes(route.properties.id)).map(route => {
    const properties = route.properties
    const positions = route.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number])
    return <Polyline key={properties.id} positions={positions} pathOptions={{
      color: COLORS[properties.category], weight: properties.id === state.selectedId ? 4.5 : 2.8,
      opacity: properties.id === state.selectedId ? 1 : 0.75,
      dashArray: properties.category === 'proposed' ? properties.id === 'grays-road' ? '2 5' : '8 6' : undefined,
    }} eventHandlers={{click: () => onSelect(properties.id)}}>
      <Tooltip sticky><strong>{properties.name}</strong><br />{properties.status}<br />Schematic corridor</Tooltip>
    </Polyline>
  })}</Pane>
}

export function TradeRouteControls({state, onFocus}: {state: RouteState; onFocus: (route: TradeRoute) => void}) {
  const selected = state.selected?.properties
  return <section className="trade-route-controls" aria-label="Canadian trade route controls">
    <p className="eyebrow">Canada & Northwest Passage</p>
    <label className="layer-switch"><input type="checkbox" checked={state.show} onChange={event => state.setShow(event.target.checked)} /> Show logistics routes</label>
    <div className="route-presets" aria-label="Route groups">
      <button onClick={() => state.preset('passage')}>Northwest Passage</button>
      <button onClick={() => state.preset('used')}>Supply & exports</button>
      <button onClick={() => state.preset('proposed')}>Grays Bay concepts</button>
      <button onClick={() => state.preset('all')}>All routes</button>
    </div>
    <p className="route-method">Schematic corridors, not ship tracks. The ice year does not certify route access. Dashed lines are proposals or inferred connections.</p>
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
    {(['passage', 'used', 'proposed'] as const).map(category => <div className="route-group" key={category}>
      <h3><i style={{background: COLORS[category]}} />{{passage: 'Passage corridors', used: 'Used supply / export corridors', proposed: 'Proposed / conceptual connections'}[category]}</h3>
      {state.routes.filter(route => route.properties.category === category).map(route => <div className={`route-row ${route.properties.id === state.selectedId ? 'route-row--selected' : ''}`} key={route.properties.id}>
        <input aria-label={`Show ${route.properties.name}`} type="checkbox" checked={state.enabled.includes(route.properties.id)} onChange={() => state.toggle(route.properties.id)} />
        <button aria-pressed={route.properties.id === state.selectedId} onClick={() => state.setSelectedId(route.properties.id)}>{route.properties.name}</button>
      </div>)}
    </div>)}</details>
    {selected && state.selected && <article className="route-detail" aria-label="Selected route evidence">
      <span className="route-status" style={{color: COLORS[selected.category]}}>{selected.status}</span>
      <h2>{selected.name}</h2>
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
