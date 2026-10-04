import { useEffect, useState } from 'react'
import type { IceMonth } from '../seasons'

export interface IceFrame {
  year: number
  kind: 'observed'
  vector_url: string
  mean_concentration_percent: number
}

interface IceManifest {
  dataset: string
  source_url: string
  documentation_url: string
  month: string
  bounds: [[number, number], [number, number]]
  latest_observed_year: number
  baseline_year: number
  native_resolution_km: number
  metric: string
  method: string
  display_method: string
  limitations: string[]
  frames: IceFrame[]
  sources: {year: number; url: string; sha256: string}[]
  land_source: {url: string; download_url: string; sha256: string}
}

export function useIceHistory() {
  const [month, setMonth] = useState<IceMonth>('september')
  const [data, setData] = useState<IceManifest | null>(null)
  const [selection, setSelection] = useState<{year: number; notice: string | null}>({year: 2025, notice: null})
  const year = selection.year
  const setYear = (value: number) => setSelection({year: value, notice: null})
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    fetch(`/data/ice/manifest-${month}.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('The saved ice dataset could not be loaded.'); return response.json() as Promise<IceManifest> })
      .then(manifest => {
        if (controller.signal.aborted) return
        if (!manifest.land_source || !manifest.frames?.length || manifest.frames.some(frame => !frame.vector_url)) {
          throw new Error('Ice maps are still being prepared. Reload once preparation finishes.')
        }
        // Never expose the retired experimental extrapolations, even from an old cache.
        const observed = {...manifest, frames: manifest.frames.filter(frame => frame.kind === 'observed')}
        if (!observed.frames.length) throw new Error('No observed ice maps are available.')
        setData(observed)
        setSelection(previous => {
          if (observed.frames.some(frame => frame.year === previous.year)) return previous
          return {year: manifest.latest_observed_year, notice: `${manifest.month} ${previous.year} is unavailable. Showing ${manifest.month} ${manifest.latest_observed_year}; choose that year for the other months to compare the same annual cycle.`}
        })
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load ice history.') })
    return () => controller.abort()
  }, [month])
  const activeData = data?.month.toLowerCase() === month ? data : null
  return { data: activeData, year, setYear, yearNotice: selection.notice, month, setMonth, error, frame: activeData?.frames.find(frame => frame.year === year) ?? null }
}

export function IceHistoryControls({ history, active = true }: { history: ReturnType<typeof useIceHistory>; active?: boolean }) {
  const { data, year, setYear, frame, error } = history
  if (error) return <p role="alert" className="satellite-error">{error}</p>
  if (!data || !frame) return <p role="status">Loading saved ice history…</p>
  const activeIndex = data.frames.findIndex(frame => frame.year === year)
  const observation = data.sources.find(source => source.year === frame.year)
  return <div className="ice-history">
    <div className="ice-history-heading">
      <div><span className="eyebrow">{!active ? 'Custom photograph date active' : 'Measured sea ice'}</span>
        <strong>{active ? `${data.month} ${frame.year}` : 'Choose an ice preset'}</strong></div>
    </div>
    {history.yearNotice && <p role="status" className="ice-year-notice">{history.yearNotice}</p>}
    <p className="source-credit">Observed ice: <a href={data.source_url} target="_blank" rel="noreferrer">NOAA / NSIDC Sea Ice Index v4</a>.</p>
    <div className="ice-presets">
      {[{ year: data.baseline_year, label: 'Historical ice' }, { year: 2005, label: 'Historical' }, { year: 2015, label: 'Historical' }, ...(data.latest_observed_year !== 2025 ? [{ year: 2025, label: 'Recent' }] : []), { year: data.latest_observed_year, label: 'Latest available' }].map(preset =>
        <button type="button" key={preset.year} aria-pressed={active && year === preset.year} onClick={() => setYear(preset.year)}>{preset.label}<small>{preset.year}</small></button>)}
    </div>
    <label className="ice-slider-label" htmlFor="ice-history-year">Explore {data.month} observations</label>
    <input id="ice-history-year" aria-label="Ice map year" type="range" min={0} max={data.frames.length - 1} step={1} value={activeIndex}
      onChange={event => setYear(data.frames[Number(event.target.value)].year)} />
    <div className="ice-slider-endpoints"><span>{data.baseline_year}</span><span>{data.latest_observed_year} · latest observation</span></div>
    {active && <>
    <div className="ice-history-metric"><strong>{frame.mean_concentration_percent.toFixed(1)}%</strong><span>Average ice cover across the study region</span></div>
    <p className="ice-metric-explanation">This averages the ice-covered share of each sampled ocean cell inside the dashed study region for {data.month} {frame.year}. For example, 30% means the sampled cells average 30% ice cover; some can be ice-free while others are heavily iced.</p>
    <p className="ice-metric-explanation">Use it to compare the same month across years. The region includes waters beyond Canada. It does not tell you whether a particular route or port is open.</p>
    <p>Monthly ice concentration · {data.month}{data.latest_observed_year < 2026 ? ` · Latest complete year: ${data.latest_observed_year}` : ''}.</p>
    <details className="ice-method"><summary>Sources & how these maps are made</summary>
      <p><a href={data.source_url} target="_blank" rel="noreferrer">{data.dataset}</a> · <a href={data.documentation_url} target="_blank" rel="noreferrer">Source documentation</a></p>
      {observation ? <p><a href={observation.url} target="_blank" rel="noreferrer">Download original {data.month} {frame.year} concentration GeoTIFF ↗</a><small className="source-hash">SHA-256: {observation.sha256}</small></p>
        : <p>Original source information is listed in the saved provenance manifest.</p>}
      <p>{data.metric}</p><p>{data.method}</p>
      <p>{data.display_method}</p>
      <p><a href={`/data/ice/manifest-${history.month}.json`} target="_blank" rel="noreferrer">Saved provenance manifest: metrics, source URLs and checksums</a></p>
      <details><summary>All original observations · {data.sources.length} files</summary>{data.sources.map(source => <p key={source.year}><a href={source.url} target="_blank" rel="noreferrer">{data.month} {source.year} · source GeoTIFF</a><small className="source-hash">SHA-256: {source.sha256}</small></p>)}</details>
      <p><a href={data.land_source.download_url} target="_blank" rel="noreferrer">Natural Earth 10m land · original boundary download</a></p>
      <p><a href="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/1.0.0/WMTSCapabilities.xml" target="_blank" rel="noreferrer">NASA GIBS imagery catalogue</a> · MODIS Terra Corrected Reflectance True Color, dated the 15th of the selected month. Esri World Imagery supplies the mixed-date reference background.</p>
      <ul>{data.limitations.map(note => <li key={note}>{note}</li>)}</ul>
    </details>
    <details className="ice-method"><summary>Future ice: research & limits</summary>
      <p>Choose Future projections above for published ECCC / CMIP6 model data. Our earlier historical-trend experiment has been retired.</p>
      <p><a href="https://nsidc.org/sites/default/files/interpretation-resources-sea-ice-trends-and-anomalies.pdf" target="_blank" rel="noreferrer">NSIDC: trend-analysis limitations · section 3</a></p>
      <p><a href="https://climate-scenarios.canada.ca/?page=cmip6-scenarios" target="_blank" rel="noreferrer">ECCC: published CMIP6 sea-ice projections</a> supply the future layer, with three emissions scenarios and a model-spread band.</p>
      <p><a href="https://www.canada.ca/en/environment-climate-change/services/science-technology/changing-climate-report-2026/cccr-chapter-6-en.html" target="_blank" rel="noreferrer">Canada’s Changing Climate Report 2026 · section 6.3.3.3</a> explains uncertainty for Northwest Passage shipping. Concentration projections cannot establish route access.</p>
    </details></>}
  </div>
}
