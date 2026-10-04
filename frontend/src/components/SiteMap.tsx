import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleMarker, ImageOverlay, MapContainer, Pane, Rectangle, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { fetchSatelliteImage } from '../api'
import type { SatelliteImage } from '../api'
import type { Site } from '../types'
import { IceHistoryControls, useIceHistory } from './IceHistory'
import { IceOutline } from './IceOutline'
import { ProjectionControls, ProjectionLayer, useIceProjections } from './IceProjections'
import { SEASONS } from '../seasons'
import { LandMap } from './LandMap'
import { CacheStatus } from './CacheStatus'
import { TradeRouteControls, TradeRouteLayer, TradeRouteLegend, useTradeRoutes } from './TradeRoutes'
import type { TradeRoute } from './TradeRoutes'
import { PortMarker } from './PortMarker'
import { MapRuler, RulerControls } from './MapRuler'
import type { RulerPoint } from './MapRuler'

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
function MapView({ view, site, onZoom }: { view: View; site: Site | undefined; onZoom: (zoom: number) => void }) {
  const map = useMapEvents({ zoomend: event => onZoom(event.target.getZoom()) })
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
  const [date, setDate] = useState('2026-08-15')
  const [dateOpen, setDateOpen] = useState(false)
  const [rulerActive, setRulerActive] = useState(false)
  const [rulerPoints, setRulerPoints] = useState<RulerPoint[]>([])
  const [portGroup, setPortGroup] = useState<'all' | Site['port_category']>('all')
  const [legendOpen, setLegendOpen] = useState(true)
  const [photoTime, setPhotoTime] = useState<'custom' | 'history'>('history')
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
  const [presentation, setPresentation] = useState(false)
  const [packDates, setPackDates] = useState<string[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/data/presentation/manifest.json', {signal: controller.signal})
      .then(response => response.ok ? response.json() : null)
      .then(pack => { if (!controller.signal.aborted && pack?.complete) { setPackDates(pack.dates); setPresentation(true) } })
      .catch(() => { /* Satellite pack is optional; vector maps are bundled. */ })
    return () => controller.abort()
  }, [])
  const history = useIceHistory()
  const projections = useIceProjections(history.month)
  const [timeMode, setTimeMode] = useState<'observations' | 'projections'>('observations')
  const projectionActive = timeMode === 'projections'
  const projectionLabel = projections.data?.scenarios[projections.scenario]?.split(' · ')[0] ?? projections.scenario
  const tradeRoutes = useTradeRoutes()
  const referenceOnly = projectionActive || (photoTime === 'history' && !!history.frame && history.frame.year < 2000)
  const photoDate = photoTime === 'history' && history.frame && !referenceOnly
    ? `${history.frame.year}-${SEASONS.find(season => season.month === history.month)!.number}-15` : date
  const today = new Date().toISOString().slice(0, 10)
  const datedAvailable = !referenceOnly && photoDate >= '2000-02-24' && photoDate <= today
  const showDated = datedAvailable && (!presentation || packDates.includes(photoDate))
  const referenceIce = mapMode === 'photo' && (!showDated || zoom < 3)
  const portAvailable = datedAvailable && photoDate >= '2017-03-28'
  const request = useRef<AbortController | null>(null)
  const selectedSite = sites.find(site => site.id === selectedSiteId)
  const visibleSites = sites.filter(site => portGroup === 'all' || site.port_category === portGroup)
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
  useEffect(() => { setTileError(false) }, [photoDate, mapMode])
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
  return <div className={`map-shell ${dateOpen || rulerActive || rulerPoints.length > 0 ? 'map-shell--tool-open' : ''} ${projectionActive ? 'map-shell--projection' : ''} ${mapMode === 'ice' ? 'map-shell--simple' : referenceIce ? 'map-shell--reference' : ''}`} aria-label="World map with Canadian Arctic ice dashboard">
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
          {mapMode === 'photo' && <p className="source-credit">Satellite images: {referenceIce ? <><a href="https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noreferrer">Esri World Imagery</a> · mixed-date reference mosaic</> : <><a href="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml" target="_blank" rel="noreferrer">NASA GIBS · MODIS Terra True Color</a> · {photoDate}. Background: Esri World Imagery</>}.</p>}
          <div className="map-mode-controls" aria-label="Map appearance">
            <button type="button" aria-pressed={mapMode === 'ice'} onClick={() => setMapMode('ice')}>Map</button>
            <button type="button" aria-pressed={mapMode === 'photo'} onClick={() => setMapMode('photo')}>Satellite</button>
          </div>
          <div className="map-mode-controls time-mode-controls" aria-label="Ice data type">
            <button type="button" aria-pressed={!projectionActive} onClick={() => setTimeMode('observations')}>Observed ice</button>
            <button type="button" aria-pressed={projectionActive} onClick={() => {setTimeMode('projections'); setPhotoTime('history')}}>Future projections</button>
          </div>
          {<>
            <label className="layer-switch"><input type="checkbox" disabled={mapMode === 'photo' && photoTime === 'custom'} checked={showIce} onChange={event => setShowIce(event.target.checked)} /> Show ice outlines</label>
            <section className="ice-cycle" aria-label="Annual ice cycle">
              <h2>Seasonal ice snapshots</h2>
              <p className="season-explanation">Four observations within the annual cycle. Melting and freezing continue between snapshots.</p>
              <div className="ice-month-ruler" aria-label="Calendar months; saved snapshots in March, July, September and October">{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((label, index) => {
                const season = SEASONS.find(item => Number(item.number) === index + 1)
                return season ? <button key={label} type="button" aria-label={`Show ${season.label} ice snapshot`} aria-pressed={history.month === season.month} onClick={() => {history.setMonth(season.month); setPhotoTime('history')}}>{label}</button> : <span key={label}>{label}</span>
              })}</div>
              <p className="season-explanation">March → July: 4 months · July → September: 2 months · September → October: 1 month · October → next March: 5 months.</p>
              <div className="ice-cycle-stages">{SEASONS.map(season => <button type="button" key={season.month} aria-pressed={history.month === season.month} onClick={() => {history.setMonth(season.month); if (mapMode === 'photo') setPhotoTime('history')}}><strong>{season.stage}</strong><span>{season.label} snapshot</span></button>)}</div>
              <div className="ice-cycle-context"><strong>{SEASONS.find(season => season.month === history.month)!.window}</strong><p>{SEASONS.find(season => season.month === history.month)!.description}</p></div>
              <details><summary>How long is the shipping window?</summary><p>Typical regional shipping seasons from Canadian Ice Service 1991–2020 normals:</p><dl className="shipping-windows"><dt>Lancaster Sound</dt><dd>Late June → start of October</dd><dt>Amundsen Gulf</dt><dd>Mid-July → late October</dd><dt>Peel / Larsen sounds</dt><dd>Late August → end of September</dd></dl><p>These are historical regional normals, not guaranteed ice-free days or future projections. These monthly snapshots cannot measure a route’s ice-free duration; access varies by year, ice conditions and ship.</p><p><a href="https://nsidc.org/learn/parts-cryosphere/sea-ice/quick-facts-about-sea-ice" target="_blank" rel="noreferrer">NSIDC · annual maximum & minimum</a><br /><a href="https://www.canada.ca/en/environment-climate-change/services/ice-forecasts-observations/latest-conditions/climatology/ice-climate-normals/northern-canadian-waters.html" target="_blank" rel="noreferrer">Canadian Ice Service · regional shipping windows</a></p></details>
            </section>
            <p className="season-explanation">{projectionActive ? 'Each snapshot averages that month across the selected projection period.' : 'Each snapshot is a monthly average. Start with 2025 to compare all four months in one year; October 2026 is not yet complete.'}</p>
            {projectionActive ? <ProjectionControls state={projections} /> : <IceHistoryControls history={mapMode === 'photo' ? { ...history, setYear: year => { history.setYear(year); setPhotoTime('history') } } : history} active={mapMode === 'ice' || photoTime === 'history'} />}
          </>}
          {mapMode === 'photo' && !projectionActive && <div className="satellite-controls">
            {presentation && datedAvailable && !showDated && <p role="status">This date is not saved. Showing reference imagery.</p>}
            {tileError && <p role="alert" className="satellite-error">Some imagery could not load. Try another date.</p>}
            {loading && <p role="status">Retrieving the port image…</p>}
            {error && <p role="alert" className="satellite-error">{error}</p>}
            {image && <div className="satellite-caption">
              <label><input type="checkbox" checked={showImage} onChange={event => setShowImage(event.target.checked)} /> Show port detail</label>
              <span>Sentinel-2: {new Date(image.acquired_at).toLocaleString(undefined, { timeZone: 'UTC' })} UTC</span>
              <small>{image.attribution}</small>
            </div>}
          </div>}
          <div className="panel-port-picker"><label htmlFor="port-group">Ports on map</label>
            <select id="port-group" value={portGroup} onChange={event => setPortGroup(event.target.value as typeof portGroup)}><option value="all">All ports & published projects</option><option value="current">Current ports</option><option value="proposed">Published port projects</option></select>
            <label htmlFor="port-picker">Inspect a port</label>
            <select id="port-picker" value={selectedSiteId ?? ''} onChange={event => {const site = sites.find(site => site.id === event.target.value); onSelect(event.target.value); if (site && portGroup !== 'all' && site.port_category !== portGroup) setPortGroup('all')}}>{sites.map(site => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
            <button type="button" onClick={() => setPanelTab('port')}>View port evidence →</button>
          </div>
          <CacheStatus />
          <details className="presentation-help"><summary>Offline imagery & coverage</summary>
            <label className="layer-switch"><input type="checkbox" disabled={!packDates.length} checked={presentation} onChange={event => setPresentation(event.target.checked)} /> Use saved imagery</label>
            <p>March, July, September and October presets are saved through zoom 6. October ends in 2025. Other photograph dates need internet.</p>
            <p>1996 and future projections use a mixed-date reference mosaic. White marks ice on the mosaic; blue marks observed ice on dated photographs. Future satellite photographs do not exist.</p>
          </details>
        </> : panelTab === 'routes' ? <TradeRouteControls state={tradeRoutes} onFocus={focusRoute} /> : inspector}
      </div>
      <div className="panel-navigation">
        <button type="button" onClick={() => focus('world')}>World</button>
        <button type="button" onClick={() => focus('arctic')}>Canada’s north</button>
        <button type="button" disabled={!selectedSite} onClick={() => focus('port')}>Port</button>
      </div>
    </aside>
    <div className="map-canvas">
      <MapContainer center={[35, -30]} zoom={1} minZoom={1} maxZoom={14} zoomSnap={0.1} zoomDelta={0.5} maxBounds={[[-85, -180], [85, 180]]} maxBoundsViscosity={1} scrollWheelZoom className={`map ${mapMode === 'ice' ? 'map--simple' : ''}`}>
        <MapView view={view} site={selectedSite} onZoom={setZoom} />
        <ScaleControl position="bottomleft" metric imperial />
        <MapRuler active={rulerActive} points={rulerPoints} onChange={setRulerPoints} />
        {mapMode === 'ice' ? <LandMap /> : <TileLayer key={`satellite-base-${presentation}`} noWrap
          url={presentation ? '/data/presentation/reference/{z}/{y}/{x}.jpg' : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'} maxNativeZoom={presentation ? 4 : undefined} maxZoom={14} attribution='World imagery: Esri, Maxar, Earthstar Geographics and the GIS User Community' />}
        {mapMode === 'photo' && presentation && zoom >= 5 && <TileLayer url="/data/presentation/reference/{z}/{y}/{x}.jpg" zIndex={2} minNativeZoom={5} maxNativeZoom={6} maxZoom={14} noWrap bounds={ARCTIC_BOUNDS} />}
        {mapMode === 'photo' && zoom >= 3 && showDated && <TileLayer key={`${photoDate}-${presentation}`} url={presentation ? `/data/presentation/${photoDate}/{z}/{y}/{x}.jpg` : `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${photoDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`}
          attribution='Dated Arctic imagery: <a href="https://www.earthdata.nasa.gov/centers/gibs">NASA GIBS</a> / MODIS Terra' zIndex={3} minNativeZoom={3} maxNativeZoom={presentation ? 6 : 9} maxZoom={14} noWrap bounds={ARCTIC_BOUNDS} eventHandlers={{ tileerror: () => setTileError(true) }} />}
        {mapMode === 'photo' && !presentation && image && image.site_id === selectedSiteId && showImage && <SatelliteLayer image={image} />}
        <Pane name="study-area" style={{ zIndex: 350 }}>
          <Rectangle bounds={ARCTIC_BOUNDS} interactive={false} pathOptions={{ color: 'var(--map-study-outline)', weight: 1.5, fill: false, dashArray: '5 5' }} />
        </Pane>
        {!projectionActive && (mapMode === 'ice' || photoTime === 'history') && showIce && history.frame && <IceOutline url={history.frame.vector_url} opacity={mapMode === 'photo' ? referenceIce ? 0.85 : 0.38 : 1} onStatus={setOutlineStatus} />}
        {projectionActive && showIce && projections.frame && <ProjectionLayer frame={projections.frame} showSpread={projections.showSpread} satellite={mapMode === 'photo'} onStatus={setOutlineStatus} />}
        <TradeRouteLayer state={tradeRoutes} onSelect={id => { tradeRoutes.setSelectedId(id); setPanelTab('routes'); setPanelOpen(true) }} />
        {zoom >= 3 && WATERWAYS.map(waterway => <CircleMarker key={waterway.name} center={waterway.center} radius={0} interactive={false}>
          <Tooltip interactive={false} permanent direction={waterway.name === 'Lancaster Sound' ? 'left' : 'center'} className="waterway-label">{waterway.name}</Tooltip>
        </CircleMarker>)}
        <Pane name="map-hover" style={{zIndex: 690, pointerEvents: 'none'}} />
        <Pane name="ports" style={{ zIndex: 500 }}>{visibleSites.map(site => <PortMarker key={site.id} site={site} selected={selectedSiteId === site.id} labels={zoom >= 3} onSelect={() => {onSelect(site.id); setPanelTab('port'); setPanelOpen(true)}} />)}</Pane>
      </MapContainer>
      <div className="map-toolbar" aria-label="Map navigation panel">
        <button type="button" className="controls-toggle" aria-expanded={panelOpen} onClick={() => setPanelOpen(v => !v)}>☰ Controls</button>
        <button type="button" onClick={() => focus('world')}>World</button>
        <button type="button" onClick={() => focus('arctic')}>Canada’s north</button>
        <button type="button" onClick={() => { setPanelTab('routes'); setPanelOpen(true) }}>Routes</button>
      </div>
      <RulerControls active={rulerActive} points={rulerPoints} onToggle={() => setRulerActive(value => !value)} onClear={() => setRulerPoints([])} />
      <div className="map-date-control" aria-label="Custom satellite date">
        <button type="button" aria-expanded={dateOpen} onClick={() => setDateOpen(value => !value)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v5m10-5v5M3 11h18" /></svg>Custom date</button>
        {dateOpen && <form className="map-date-card" onSubmit={event => {event.preventDefault(); const requestedDate = String(new FormData(event.currentTarget).get('satellite-date')); setDate(requestedDate); setTimeMode('observations'); setMapMode('photo'); setPhotoTime('custom'); setPresentation(packDates.includes(requestedDate))}}>
          <label htmlFor="satellite-date">Satellite photograph date</label>
          <input id="satellite-date" name="satellite-date" type="date" required min="2000-02-24" max={today} value={date} onChange={event => setDate(event.target.value)} />
          <button type="submit">Show photograph</button>
          <button type="button" onClick={() => setPhotoTime('history')}>Return to monthly ice</button>
          <small>NASA MODIS Terra · daily photographs from February 2000. Custom dates need internet unless saved; they do not provide daily ice measurements.</small>
          <details><summary>Selected port detail</summary><button type="button" disabled={presentation || loading || !selectedSiteId || !portAvailable || photoTime !== 'custom' || projectionActive} onClick={() => void loadImage()}>{loading ? 'Loading…' : 'Load selected port photograph'}</button><small>Requires configured Copernicus access and dates from March 2017.</small>{error && <p role="alert">{error}</p>}</details>
        </form>}
      </div>
      <div className="map-context"><strong>CANADIAN ARCTIC / NORTHWEST PASSAGE</strong><span>{projectionActive ? `${history.month.charAt(0).toUpperCase() + history.month.slice(1)} ${projections.frame?.start_year ?? ''}–${projections.frame?.end_year ?? ''} · ECCC ${projectionLabel} projection${mapMode === 'photo' ? ' · reference background' : ''}` : mapMode === 'ice' ? `${history.data?.month ?? ''} ${history.frame?.year ?? ''} · Observed ice` : zoom >= 3 ? !showDated ? `Satellite reference · ${history.frame?.year} ice` : `Satellite · ${photoDate}` : 'World satellite reference'}</span></div>
      {(mapMode === 'ice' || photoTime === 'history') && showIce && outlineStatus && <div className="outline-status" role="status">{outlineStatus}</div>}
      <div className={`map-legend ${legendOpen ? '' : 'map-legend--closed'}`} aria-label="Map legend">
        <div className="legend-heading"><strong>Map legend</strong><button type="button" aria-expanded={legendOpen} aria-controls="map-legend-content" onClick={() => setLegendOpen(value => !value)}>{legendOpen ? 'Hide legend' : 'Show legend'}</button></div>
        {legendOpen && <div id="map-legend-content" className="legend-content">
        {tradeRoutes.show && <TradeRouteLegend state={tradeRoutes} />}
        {tradeRoutes.show && <span>Route lines are schematic, independent of the ice year.</span>}
        {projectionActive ? <><div className="legend-explanation"><i className="ice-swatch" /><div><strong>{showIce ? 'White · central ice estimate' : 'Ice layer hidden'}</strong><p>The central model estimate has at least 15% ice concentration. This can include open water between ice floes.</p></div></div>{projections.showSpread && showIce && <div className="legend-explanation"><i className="projection-spread-swatch" /><div><strong>Purple / pink · uncertain ice edge</strong><p>Lower and upper model estimates disagree about ice coverage. Pink is purple shading over white ice, not a separate ice type.</p></div></div>}<p className="legend-note">Hover or tap the shaded map areas to learn more. ECCC / CMIP6 · 1° grid · period average.</p>{mapMode === 'photo' && <span>Satellite background is reference imagery.</span>}</> : <>
        {mapMode === 'photo' && photoTime === 'history' && showIce && <span><i className="ice-swatch" /> {referenceIce ? 'White' : 'Blue tint'}: selected ice extent</span>}
        {mapMode === 'ice' ? <><span className="map-colors"><i className="land-swatch" /> Land <i className="water-swatch" /> Water <i className="ice-swatch" /> Ice</span><span>{showIce ? 'White · at least 15% ice concentration' : 'Ice outlines hidden'}</span>
          <span>White can include open water between floes; it does not mean 100% ice cover.</span><span>Ice data covers the dashed study region.</span><span>Smoothed display · source resolution 25 km.</span></> : <><span>{zoom >= 3 ? !showDated ? `Reference mosaic · ${history.frame?.year} ice overlay` : `Arctic photograph: ${photoDate}` : 'Focus on Canada for dated Arctic imagery.'}</span><span>Global background: reference imagery.</span></>}
        </>}
        <div className="legend-ports"><span><i className="port-swatch" /> Solid orange · current ports</span><span><i className="proposed-port-swatch" /> Orange rings · published port projects</span><small>A dark outer ring marks the selected port. Hover or tap a port for details. Dots describe port status; shaded areas describe ice.</small></div>
        </div>}
      </div>
    </div>
  </div>
}
