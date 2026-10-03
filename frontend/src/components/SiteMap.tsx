import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleMarker, ImageOverlay, MapContainer, Pane, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { fetchSatelliteImage } from '../api'
import type { SatelliteImage } from '../api'
import type { Site } from '../types'
import { IceHistoryControls, useIceHistory } from './IceHistory'
import { IceOutline } from './IceOutline'
import { LandMap } from './LandMap'
import { CacheStatus } from './CacheStatus'
import { TradeRouteControls, TradeRouteLayer, TradeRouteLegend, routeColor, useTradeRoutes } from './TradeRoutes'
import type { TradeRoute } from './TradeRoutes'

interface SiteMapProps {
  sites: Site[]
  selectedSiteId: string | null
  onSelect: (siteId: string) => void
  inspector: ReactNode
}
const ARCTIC_BOUNDS: [[number, number], [number, number]] = [[56, -150], [80, -42]]
const WORLD_BOUNDS: [[number, number], [number, number]] = [[-60, -180], [82, 180]]
type View = { mode: 'world' | 'arctic' | 'port' | 'route'; revision: number; bounds?: [[number, number], [number, number]] }
const WATERWAYS: { name: string; center: [number, number] }[] = [
  { name: 'Beaufort Sea', center: [72, -135] },
  { name: 'Lancaster Sound', center: [74.2, -84] },
  { name: 'Baffin Bay', center: [73, -65] },
  { name: 'Queen Maud Gulf', center: [68.5, -100] },
]
function MapView({ view, site, onZoom, onMove }: { view: View; site: Site | undefined; onZoom: (zoom: number) => void; onMove: () => void }) {
  const map = useMapEvents({ zoomend: event => onZoom(event.target.getZoom()), movestart: onMove, zoomstart: onMove })
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  useEffect(() => {
    map.invalidateSize()
    if (view.mode === 'port' && site) map.setView([site.lat, site.lon], 8)
    else map.fitBounds(view.mode === 'route' && view.bounds ? view.bounds : view.mode === 'world' ? WORLD_BOUNDS : ARCTIC_BOUNDS, { padding: [28, 28] })
    onZoom(map.getZoom())
    // Candidate selection updates the inspector without resetting a freely panned map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, view, onZoom])
  return null
}
function SatelliteLayer({ image }: { image: SatelliteImage }) {
  const map = useMap()
  useEffect(() => { map.fitBounds(image.bounds, { padding: [30, 30], maxZoom: 10 }) }, [map, image])
  return <ImageOverlay url={image.image_url} bounds={image.bounds} attribution={image.attribution} />
}

export function SiteMap({ sites, selectedSiteId, onSelect, inspector }: SiteMapProps) {
  const [date, setDate] = useState('2026-03-15')
  const [photoTime, setPhotoTime] = useState<'custom' | 'history'>('history')
  const [hoveredRouteId, setHoveredRouteId] = useState<string | null>(null)
  const clearHover = useCallback(() => setHoveredRouteId(null), [])
  const [image, setImage] = useState<SatelliteImage | null>(null)
  const [showImage, setShowImage] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tileError, setTileError] = useState(false)
  const [view, setView] = useState<View>({ mode: 'arctic', revision: 0 })
  const [zoom, setZoom] = useState(1)
  const [mapMode, setMapMode] = useState<'ice' | 'photo'>('ice')
  const [showIce, setShowIce] = useState(true)
  const [panelTab, setPanelTab] = useState<'layers' | 'routes' | 'port'>('layers')
  const [panelOpen, setPanelOpen] = useState(false)
  const [outlineStatus, setOutlineStatus] = useState<string | null>(null)
  const history = useIceHistory()
  const tradeRoutes = useTradeRoutes()
  const referenceOnly = photoTime === 'history' && !!history.frame && (history.frame.kind === 'scenario' || history.frame.year < 2000)
  const photoDate = photoTime === 'history' && history.frame && !referenceOnly
    ? `${history.frame.year}-${history.month === 'march' ? '03' : '09'}-15` : date
  const today = new Date().toISOString().slice(0, 10)
  const datedAvailable = !referenceOnly && photoDate >= '2000-02-24' && photoDate <= today
  const portAvailable = datedAvailable && photoDate >= '2017-03-28'
  const hoveredRoute = tradeRoutes.show && !!hoveredRouteId && tradeRoutes.enabled.includes(hoveredRouteId) ? tradeRoutes.routes.find(route => route.properties.id === hoveredRouteId) : undefined
  const request = useRef<AbortController | null>(null)
  const selectedSite = sites.find(site => site.id === selectedSiteId)
  const focus = (mode: View['mode']) => { setView(v => ({ mode, revision: v.revision + 1 })); setPanelOpen(false) }
  function focusRoute(route: TradeRoute) {
    const coordinates = route.geometry.coordinates
    const lats = coordinates.map(point => point[1]), lons = coordinates.map(point => point[0])
    setView(v => ({mode: 'route', revision: v.revision + 1, bounds: [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]]}))
    setPanelOpen(false)
  }

  useEffect(() => {
    request.current?.abort(); setImage(null); setError(null); setLoading(false)
    return () => request.current?.abort()
  }, [selectedSiteId, photoDate, photoTime])
  useEffect(() => { setTileError(false); clearHover() }, [photoDate, mapMode, clearHover])
  async function loadImage() {
    if (!selectedSiteId || !portAvailable) return
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoading(true); setError(null); setImage(null)
    try {
      const result = await fetchSatelliteImage(selectedSiteId, photoDate, controller.signal)
      if (!controller.signal.aborted) { setImage(result); setShowImage(true) }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load satellite imagery.')
    } finally { if (!controller.signal.aborted) setLoading(false) }
  }
  return <div className="map-shell" aria-label="World map with Canadian Arctic ice dashboard">
    <aside className={`dashboard-controls ${panelOpen ? 'dashboard-controls--open' : ''}`} aria-label="Map control panel">
      <div className="panel-tabs">
        <button type="button" aria-pressed={panelTab === 'layers'} onClick={() => setPanelTab('layers')}>Layers & time</button>
        <button type="button" aria-pressed={panelTab === 'routes'} onClick={() => setPanelTab('routes')}>Routes</button>
        <button type="button" aria-pressed={panelTab === 'port'} onClick={() => setPanelTab('port')}>Port details</button>
        <button type="button" className="panel-close" aria-label="Close controls" onClick={() => setPanelOpen(false)}>×</button>
      </div>
      <div className="panel-scroll">
        {panelTab === 'layers' ? <>
          <p className="eyebrow">Map appearance</p>
          <div className="map-mode-controls" aria-label="Map appearance">
            <button type="button" aria-pressed={mapMode === 'ice'} onClick={() => setMapMode('ice')}>Map</button>
            <button type="button" aria-pressed={mapMode === 'photo'} onClick={() => setMapMode('photo')}>Satellite</button>
          </div>
          {<>
            <label className="layer-switch"><input type="checkbox" disabled={mapMode === 'photo' && photoTime === 'custom'} checked={showIce} onChange={event => setShowIce(event.target.checked)} /> Show ice outlines</label>
            <label className="ice-season" htmlFor="ice-season">Season
              <select id="ice-season" value={history.month} onChange={event => { history.setMonth(event.target.value as 'march' | 'september'); if (mapMode === 'photo') setPhotoTime('history') }}>
                <option value="march">Winter · March</option><option value="september">Summer · September</option>
              </select>
            </label>
            <IceHistoryControls history={mapMode === 'photo' ? { ...history, setYear: year => { history.setYear(year); setPhotoTime('history') } } : history} active={mapMode === 'ice' || photoTime === 'history'} />
          </>}
          {mapMode === 'photo' && <div className="satellite-controls">
            <p className="eyebrow">Dated satellite imagery</p>
            <form onSubmit={event => { event.preventDefault(); void loadImage() }}>
              <label htmlFor="satellite-date">Custom photograph date</label>
              <input id="satellite-date" type="date" required min="2000-02-24" max={today} value={date} onChange={event => { setDate(event.target.value); setPhotoTime('custom') }} />
              <button type="button" aria-pressed={photoTime === 'custom'} onClick={() => setPhotoTime('custom')}>Use custom date</button>
              <button type="submit" disabled={loading || !selectedSiteId || !portAvailable}>{loading ? 'Loading…' : 'Load selected port detail'}</button>
            </form>
            {referenceOnly ? <p>{history.frame?.kind === 'scenario' ? `${history.frame.year} is an ice trend scenario, not a future photograph.` : '1996 photographs are unavailable in this MODIS layer, which begins in 2000.'} Showing the selected ice outline over a reference satellite mosaic.</p> : <p>Focus on Canada’s north to see NASA MODIS / Terra imagery for {photoDate}. The global background is a reference satellite mosaic.</p>}
            {photoTime === 'history' && <p>White outlines show the selected monthly ice coverage, separate from the photograph.</p>}
            {!portAvailable && <p>High-resolution Sentinel-2 port detail requires an observed date from March 2017 onwards.</p>}
            <p>Clouds and darkness may hide the ice. The winter view may also include snow on land.</p>
            {tileError && <p role="alert" className="satellite-error">Some imagery could not load. Try another date.</p>}
            {loading && <p role="status">Retrieving the port image…</p>}
            {error && <p role="alert" className="satellite-error">{error}</p>}
            {image && <div className="satellite-caption">
              <label><input type="checkbox" checked={showImage} onChange={event => setShowImage(event.target.checked)} /> Show port detail</label>
              <span>Sentinel-2: {new Date(image.acquired_at).toLocaleString(undefined, { timeZone: 'UTC' })} UTC</span>
              <small>{image.attribution}</small>
            </div>}
          </div>}
          <div className="panel-port-picker"><label htmlFor="port-picker">Candidate port</label>
            <select id="port-picker" value={selectedSiteId ?? ''} onChange={event => onSelect(event.target.value)}>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
            <button type="button" onClick={() => setPanelTab('port')}>View port evidence →</button>
          </div>
          <CacheStatus />
        </> : panelTab === 'routes' ? <TradeRouteControls state={tradeRoutes} onFocus={focusRoute} /> : inspector}
      </div>
      <div className="panel-navigation">
        <button type="button" onClick={() => focus('world')}>World</button>
        <button type="button" onClick={() => focus('arctic')}>Canada’s north</button>
        <button type="button" disabled={!selectedSite} onClick={() => focus('port')}>Port</button>
      </div>
    </aside>
    <div className="map-canvas" onMouseLeave={clearHover}>
      <MapContainer center={[35, -30]} zoom={1} minZoom={1} maxZoom={14} zoomSnap={0.1} zoomDelta={0.5} maxBounds={[[-85, -180], [85, 180]]} maxBoundsViscosity={1} scrollWheelZoom className={`map ${mapMode === 'ice' ? 'map--simple' : ''}`}>
        <MapView view={view} site={selectedSite} onZoom={setZoom} onMove={clearHover} />
        {mapMode === 'ice' ? <LandMap /> : <TileLayer key="satellite-base" noWrap
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='World imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community' />}
        {mapMode === 'photo' && zoom >= 3 && datedAvailable && <TileLayer key={photoDate} url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${photoDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
          attribution='Dated Arctic imagery: <a href="https://www.earthdata.nasa.gov/centers/gibs">NASA GIBS</a> / MODIS Terra' maxNativeZoom={9} maxZoom={14} noWrap bounds={ARCTIC_BOUNDS} eventHandlers={{ tileerror: () => setTileError(true) }} />}
        {mapMode === 'photo' && image && image.site_id === selectedSiteId && showImage && <SatelliteLayer image={image} />}
        <Pane name="study-area" style={{ zIndex: 350 }}>
          <Rectangle bounds={ARCTIC_BOUNDS} pathOptions={{ color: 'var(--map-study-outline)', weight: 1.5, fill: true, fillOpacity: 0, dashArray: '5 5' }}
            eventHandlers={{ click: () => focus('arctic') }} />
        </Pane>
        {(mapMode === 'ice' || photoTime === 'history') && showIce && history.frame && <IceOutline url={history.frame.vector_url} scenario={history.frame.kind === 'scenario'} opacity={mapMode === 'photo' ? 0.65 : 1} onStatus={setOutlineStatus} />}
        <TradeRouteLayer state={tradeRoutes} onHover={setHoveredRouteId} onSelect={id => { clearHover(); tradeRoutes.setSelectedId(id); setPanelTab('routes'); setPanelOpen(true) }} />
        {zoom >= 3 && WATERWAYS.map(waterway => <CircleMarker key={waterway.name} center={waterway.center} radius={0} interactive={false}>
          <Tooltip interactive={false} permanent direction={waterway.name === 'Lancaster Sound' ? 'left' : 'center'} className="waterway-label">{waterway.name}</Tooltip>
        </CircleMarker>)}
        <Pane name="ports" style={{ zIndex: 500 }}>{sites.map(site => <CircleMarker key={site.id} center={[site.lat, site.lon]} radius={selectedSiteId === site.id ? 7 : 5}
          pathOptions={{ color: 'var(--map-port-outline)', fillColor: 'var(--map-port)', fillOpacity: 1, weight: 2 }} eventHandlers={{ click: () => { clearHover(); onSelect(site.id); setPanelTab('port'); setPanelOpen(true) } }}>
          <Tooltip interactive={false} key={zoom >= 3 ? 'label' : 'hover'} permanent={zoom >= 3} direction={site.id === 'gjoa-haven' ? 'right' : 'top'} className="port-label">{site.name}</Tooltip>
        </CircleMarker>)}</Pane>
      </MapContainer>
      {hoveredRoute && <div className="route-hover-card" style={{borderLeft: `4px solid ${routeColor(hoveredRoute.properties.id)}`}}><strong>{hoveredRoute.properties.name}</strong><span>{hoveredRoute.properties.status}</span><span>Click route for details · schematic corridor</span></div>}
      <div className="map-toolbar" aria-label="Map navigation panel">
        <button type="button" className="controls-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen(v => !v)}>☰ Controls</button>
        <button type="button" onClick={() => focus('world')}>World</button>
        <button type="button" onClick={() => focus('arctic')}>Canada’s north</button>
        <button type="button" onClick={() => { setPanelTab('routes'); setPanelOpen(true) }}>Routes</button>
      </div>
      <div className="map-context"><strong>CANADIAN ARCTIC / NORTHWEST PASSAGE</strong><span>{mapMode === 'ice' ? `${history.data?.month ?? ''} ${history.frame?.year ?? ''} · ${history.frame?.kind === 'scenario' ? 'Trend scenario' : 'Observed ice'}` : zoom >= 3 ? referenceOnly ? `Satellite reference · ${history.frame?.year} ice` : `Satellite · ${photoDate}` : 'World satellite reference'}</span></div>
      {(mapMode === 'ice' || photoTime === 'history') && showIce && outlineStatus && <div className="outline-status" role="status">{outlineStatus}</div>}
      <div className="map-legend" aria-label="Ice outline legend">
        {tradeRoutes.show && <TradeRouteLegend state={tradeRoutes} />}
        {tradeRoutes.show && <span>Route lines are schematic, independent of the ice year.</span>}
        {mapMode === 'ice' ? <><span className="map-colors"><i className="land-swatch" /> Land <i className="water-swatch" /> Water <i className="ice-swatch" /> Ice</span><span>{showIce ? 'Ice-covered area · ≥15% concentration' : 'Ice outlines hidden'}{history.frame?.kind === 'scenario' ? ' · dashed scenario edges' : ''}</span>
          <span>Ice data covers the dashed Canadian Arctic window.</span><span>Smoothed display · source resolution 25 km.</span></> : <><span>{zoom >= 3 ? referenceOnly ? `Reference mosaic · ${history.frame?.year} ice overlay` : `Arctic photograph: ${photoDate}` : 'Focus on Canada for dated Arctic imagery.'}</span><span>Global background: reference imagery.</span></>}
      </div>
    </div>
  </div>
}
