import { useEffect, useRef, useState } from 'react'
import { GeoJSON, useMap } from 'react-leaflet'
import { LayerGroup, Path } from 'leaflet'
import type { GeoJSON as LeafletGeoJSON, Layer } from 'leaflet'
import type { ComponentProps } from 'react'
import type { IceMonth } from '../seasons'

export interface ProjectionFrame {scenario: string; month: string; start_year: number; end_year: number; vector_url: string}
interface ProjectionManifest {
  provider: string; dataset: string; source_url: string; documentation_url: string; grid_degrees: number
  scenarios: Record<string, string>; periods: [number, number][]; method: string; spread_meaning: string
  limitations: string[]; frames: ProjectionFrame[]
  sources: {scenario: string; percentile: number; url: string; filename: string; sha256: string}[]
}

export function useIceProjections(month: IceMonth) {
  const [data, setData] = useState<ProjectionManifest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scenario, setScenario] = useState('ssp245')
  const [period, setPeriod] = useState(2041)
  const [showSpread, setShowSpread] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/projections/manifest.json', {signal: controller.signal})
      .then(response => { if (!response.ok) throw new Error('Saved climate projections could not load.'); return response.json() as Promise<ProjectionManifest> })
      .then(manifest => { if (!controller.signal.aborted) { setData(manifest); setError(null) } })
      .catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Projections unavailable.') })
    return () => controller.abort()
  }, [])
  return {data, error, scenario, setScenario, period, setPeriod, showSpread, setShowSpread,
    frame: data?.frames.find(frame => frame.month === month && frame.scenario === scenario && frame.start_year === period)}
}

export function ProjectionControls({state}: {state: ReturnType<typeof useIceProjections>}) {
  if (state.error) return <p role="alert">{state.error}</p>
  if (!state.data || !state.frame) return <p role="status">Loading published climate projections…</p>
  const {data, frame} = state
  const sources = data.sources.filter(source => source.scenario === state.scenario)
  return <section className="projection-controls" aria-label="Published sea ice projections">
    <p className="source-credit">Projections: <a href={data.source_url} target="_blank" rel="noreferrer">Environment and Climate Change Canada · CMIP6 ensemble</a></p>
    <label htmlFor="projection-scenario">Emissions scenario</label>
    <select id="projection-scenario" value={state.scenario} onChange={event => state.setScenario(event.target.value)}>
      {Object.entries(data.scenarios).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
    </select>
    <details className="ice-method scenario-help"><summary>What is an emissions scenario?</summary>
      <p>A “what if” assumption about future greenhouse-gas emissions. Scientists run climate models under different paths to see how warming and sea ice could change.</p>
      <ul><li>SSP1-2.6: low emissions, with strong reductions.</li><li>SSP2-4.5: an intermediate emissions path.</li><li>SSP5-8.5: very high emissions driven by heavy fossil-fuel use.</li></ul>
      <p>These are possible futures, not a choice of which forecast is correct. <a href="https://climate-scenarios.canada.ca/?page=cmip6-overview-notes" target="_blank" rel="noreferrer">ECCC's explanation of SSP scenarios</a>.</p>
    </details>
    <div className="ice-presets projection-periods">{data.periods.map(([start, end]) => <button type="button" key={start} aria-pressed={state.period === start} onClick={() => state.setPeriod(start)}>{start === 2031 ? '2030s' : 'Mid-century'}<small>{start}–{end}</small></button>)}</div>
    <p><strong>{frame.month.charAt(0).toUpperCase() + frame.month.slice(1)} · {frame.start_year}–{frame.end_year}</strong><br />Average projected conditions for this month across the period.</p>
    <label className="layer-switch"><input type="checkbox" checked={state.showSpread} onChange={event => state.setShowSpread(event.target.checked)} /> Show model spread around ice edge</label>
    <p className="source-credit">The central outline uses the averaged ensemble median. Purple shows where lower and upper model estimates disagree about ice coverage.</p>
    <details className="ice-method"><summary>Projection sources & calculation</summary>
      <p>{data.method}</p><p>{data.spread_meaning}</p>
      <p><a href={data.documentation_url} target="_blank" rel="noreferrer">ECCC technical documentation</a> · <a href="/data/projections/manifest.json" target="_blank" rel="noreferrer">Saved methods, file metadata & checksums</a></p>
      {sources.map(source => <p key={source.percentile}><a href={source.url} target="_blank" rel="noreferrer">Original ECCC concentration file · {source.percentile}th percentile</a><small className="source-hash">SHA-256: {source.sha256}</small></p>)}
      <ul>{data.limitations.map(note => <li key={note}>{note}</li>)}</ul>
    </details>
    <p className="source-credit">Regional climate projections, not forecasts of a specific year or shipping access. The model grid is 1°.</p>
  </section>
}

type LayerData = ComponentProps<typeof GeoJSON>['data']
export function ProjectionLayer({frame, showSpread, satellite, onStatus}: {frame: ProjectionFrame; showSpread: boolean; satellite: boolean; onStatus: (message: string | null) => void}) {
  const map = useMap()
  const group = useRef<LeafletGeoJSON>(null)
  useEffect(() => {
    const closeLayer = (layer: Layer) => {if (layer instanceof LayerGroup) layer.eachLayer(closeLayer); else layer.closeTooltip()}
    const close = () => {if (group.current) closeLayer(group.current)}
    map.on('movestart zoomstart', close)
    return () => {map.off('movestart zoomstart', close)}
  }, [map])
  const [loaded, setLoaded] = useState<{url: string; data: LayerData} | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    onStatus('Loading climate projection…')
    fetch(frame.vector_url, {signal: controller.signal}).then(response => {if (!response.ok) throw new Error('Projection map could not load.'); return response.json() as Promise<LayerData>})
      .then(data => {if (!controller.signal.aborted) {setLoaded({url: frame.vector_url, data}); onStatus(null)}})
      .catch(error => {if (!controller.signal.aborted) onStatus(error instanceof Error ? error.message : 'Projection unavailable.')})
    return () => controller.abort()
  }, [frame.vector_url, onStatus])
  if (loaded?.url !== frame.vector_url) return null
  return <GeoJSON ref={group} key={`${frame.vector_url}-${showSpread}-${satellite}`} data={loaded.data} interactive bubblingMouseEvents={false}
    onEachFeature={(feature, layer) => {
      const spread = feature.properties.role === 'spread'
      const title = spread ? 'Purple / pink: uncertain ice edge' : 'White: central ice estimate'
      const description = spread ? 'Lower and upper model estimates disagree about whether ice concentration reaches 15%. This is model spread, not another kind of ice.' : 'The central model estimate reaches at least 15% ice concentration here. White does not mean solid ice or a safe shipping route.'
      const card = document.createElement('div')
      for (const [tag, value] of [['strong', title], ['p', description], ['small', `${frame.month} · ${frame.start_year}–${frame.end_year} · ECCC / CMIP6 · 1° grid`]]) {const node = document.createElement(tag); node.textContent = value; card.append(node)}
      // Clipped polygons can contain GeometryCollections. Attach to their
      // rendered child paths rather than assuming every feature is one Path.
      const attach = (target: Layer) => {
        if (target instanceof LayerGroup) {target.eachLayer(attach); return}
        if (!(target instanceof Path)) return
        target.bindTooltip(card.cloneNode(true) as HTMLElement, {pane: 'map-hover', sticky: true, direction: 'auto', offset: [14, 0], className: 'projection-tooltip', opacity: 1})
        target.on('click', event => target.openTooltip(event.latlng))
        target.on('add', () => {
        const element = target.getElement()
        if (!element) return
        element.setAttribute('tabindex', '0'); element.setAttribute('role', 'img'); element.setAttribute('aria-label', title)
        element.addEventListener('focus', () => target.openTooltip())
        element.addEventListener('blur', () => target.closeTooltip())
        element.addEventListener('keydown', event => {if ((event as KeyboardEvent).key === 'Escape') target.closeTooltip()})
        })
      }
      attach(layer)
    }}
    attribution='Projections: <a href="https://climate-scenarios.canada.ca/?page=cmip6-scenarios">ECCC / CMIP6</a> · 1° model grid'
    filter={feature => showSpread || feature.properties.role !== 'spread'}
    style={feature => feature?.properties.role === 'spread'
      ? {className: 'projection-area', fillColor: '#b99ad6', fillOpacity: .65, color: '#8063ab', opacity: .9, weight: 1, dashArray: '3 4'}
      : {className: 'projection-area', fillColor: satellite ? '#f2f7ff' : '#ffffff', fillOpacity: satellite ? .7 : .95, color: '#7396bc', weight: 1.5, dashArray: '6 4'}} />
}
