import { ScoreBadge } from './ScoreBadge'
import { TrendChart } from './TrendChart'
import type { Site } from '../types'

interface SitePanelProps {
  site: Site | null
  activeYear: number
}

export function SitePanel({ site, activeYear }: SitePanelProps) {
  if (!site) {
    return (
      <aside className="site-panel site-panel--empty" aria-live="polite">
        <p className="eyebrow">Choose a candidate</p>
        <h2>Compare the evidence behind each score.</h2>
        <p>Select a dot on the map or a candidate in the list to inspect its illustrative trend.</p>
      </aside>
    )
  }

  return (
    <aside className="site-panel" aria-live="polite">
      <div className="site-panel__heading">
        <div>
          <p className="eyebrow">{site.project_status ?? 'Prototype candidate · illustrative score'}</p>
          <h2>{site.name}</h2>
          <p className="coordinates">{site.lat.toFixed(2)}° N · {Math.abs(site.lon).toFixed(2)}° W</p>
        </div>
        {site.durability_score !== null ? <ScoreBadge score={site.durability_score} /> : <span className="unassessed-score">Not assessed</span>}
      </div>
      <p className="summary">{site.trend_summary}</p>
      {site.durability_score !== null ? <p className="methodology-note"><strong>Fixture demonstration:</strong> this score and site chart use illustrative values, separate from the measured NSIDC map. They do not predict a port construction date.</p> : <p className="methodology-note">A port-specific ice trend and construction-readiness score have not been assessed. The regional ice maps do not establish when this port could open.</p>}
      {site.trend_series.length >= 2 && <TrendChart points={site.trend_series} activeYear={activeYear} />}
      <div className="selection-rationale">
        <span>Why this candidate</span>
        <p>{site.selection_rationale}</p>
        <a href={site.selection_source_url} target="_blank" rel="noreferrer">Read the supporting source</a>
        {site.location_source_url && <p><a href={site.location_source_url} target="_blank" rel="noreferrer">Proposed wharf location · Table 1.1</a></p>}
      </div>
      <div className="rcm-note">
        <span>RCM current state</span>
        <p>{site.current_rcm_note}</p>
      </div>
    </aside>
  )
}
