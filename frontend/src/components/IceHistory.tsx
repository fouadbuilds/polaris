import { useEffect, useState } from 'react'

export interface IceFrame {
  year: number
  kind: 'observed' | 'scenario'
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
  holdout: { mean_absolute_error_percentage_points: number; training: string; validation: string }
  frames: IceFrame[]
}

export function useIceHistory() {
  const [month, setMonth] = useState<'march' | 'september'>('march')
  const [data, setData] = useState<IceManifest | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setError(null)
    fetch(`/data/ice/manifest-${month}.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('The saved ice dataset could not be loaded.'); return response.json() as Promise<IceManifest> })
      .then(manifest => {
        if (controller.signal.aborted) return
        setData(manifest)
        setYear(previous => manifest.frames.some(frame => frame.year === previous) ? previous : manifest.latest_observed_year)
      })
      .catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Unable to load ice history.') })
    return () => controller.abort()
  }, [month])
  const activeData = data?.month.toLowerCase() === month ? data : null
  return { data: activeData, year, setYear, month, setMonth, error, frame: activeData?.frames.find(frame => frame.year === year) ?? null }
}

export function IceHistoryControls({ history, active = true }: { history: ReturnType<typeof useIceHistory>; active?: boolean }) {
  const { data, year, setYear, frame, error } = history
  if (error) return <p role="alert" className="satellite-error">{error}</p>
  if (!data || !frame) return <p role="status">Loading saved ice history…</p>
  const activeIndex = data.frames.findIndex(frame => frame.year === year)
  return <div className={`ice-history ${frame.kind === 'scenario' ? 'ice-history--scenario' : ''}`}>
    <div className="ice-history-heading">
      <div><span className="eyebrow">{!active ? 'Custom photograph date active' : frame.kind === 'observed' ? 'Measured sea ice' : 'Future trend scenario'}</span>
        <strong>{active ? `${data.month} ${frame.year}` : 'Choose an ice preset'}</strong></div>
    </div>
    <div className="ice-presets">
      {[{ year: data.baseline_year, label: '30 years ago' }, { year: data.latest_observed_year, label: `Latest ${data.month}` }, { year: 2035, label: '2035 scenario' }, { year: 2050, label: '2050 scenario' }].map(preset =>
        <button type="button" key={preset.year} aria-pressed={active && year === preset.year} onClick={() => setYear(preset.year)}>{preset.label}<small>{preset.year}</small></button>)}
    </div>
    <label className="ice-slider-label" htmlFor="ice-history-year">Explore {data.month} ice maps · {frame.kind === 'observed' ? 'observed' : 'extrapolated'}</label>
    <input id="ice-history-year" aria-label="Ice map year" type="range" min={0} max={data.frames.length - 1} step={1} value={activeIndex}
      onChange={event => setYear(data.frames[Number(event.target.value)].year)} />
    <div className="ice-slider-endpoints"><span>{data.baseline_year}</span><span>Observed through {data.latest_observed_year}</span><span>2050 scenario</span></div>
    {active && <>
    <div className="ice-history-metric"><strong>{frame.mean_concentration_percent.toFixed(1)}%</strong><span>Regional mean concentration</span></div>
    <p>{data.month === 'March' ? 'Winter ice coverage · March monthly mean.' : 'Late-summer ice coverage · September monthly mean.'}</p>
    {frame.kind === 'scenario' && <p>Trend extrapolation, not a climate-model prediction or port-opening date.</p>}
    {frame.kind === 'scenario' && <p className="ice-validation">Forward test on unseen 2020–2024 maps: mean error {data.holdout.mean_absolute_error_percentage_points.toFixed(1)} percentage points per ocean cell. Future uncertainty is not quantified.</p>}
    <details className="ice-method"><summary>Data, method and limitations</summary>
      <p><a href={data.source_url} target="_blank" rel="noreferrer">{data.dataset}</a> · <a href={data.documentation_url} target="_blank" rel="noreferrer">Source documentation</a></p>
      <p>{data.metric}</p><p>{data.method}</p>
      <p>{data.display_method}</p>
      <ul>{data.limitations.map(note => <li key={note}>{note}</li>)}</ul>
    </details></>}
  </div>
}
