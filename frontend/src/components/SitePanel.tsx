import { ScoreBadge } from './ScoreBadge'
import { TrendChart } from './TrendChart'
import type { Site } from '../types'

interface SitePanelProps {
  site: Site | null
  activeYear: number
}

// Obsolete for now: keep the fixture score and chart available for team review.
// Set this to true to restore them; the API values and components are preserved.
const SHOW_LEGACY_SCORES = false

export function SitePanel({ site, activeYear }: SitePanelProps) {
  if (!site) {
    return (
      <aside className="site-panel site-panel--empty" aria-live="polite">
        <p className="eyebrow">Choose a candidate</p>
        <h2>Explore ports and their supply connections.</h2>
        <p>Select a port to inspect its status and supporting evidence.</p>
      </aside>
    )
  }

  return (
    <aside className="site-panel" aria-live="polite">
      <div className="site-panel__heading">
        <div>
          <p className="eyebrow">{site.project_status ?? 'Existing community marine facilities'}</p>
          <h2>{site.name}</h2>
          <p className="coordinates">{site.lat.toFixed(2)}° N · {Math.abs(site.lon).toFixed(2)}° W</p>
        </div>
        {SHOW_LEGACY_SCORES && (site.durability_score !== null ? <ScoreBadge score={site.durability_score} /> : <span className="unassessed-score">Not assessed</span>)}
      </div>
      {SHOW_LEGACY_SCORES && <><p className="summary">{site.trend_summary}</p>
        <p className="methodology-note">Obsolete fixture demonstration: illustrative values, separate from measured ice.</p>
        {site.trend_series.length >= 2 && <TrendChart points={site.trend_series} activeYear={activeYear} />}</>}
      <section className="port-section">
        <h3>Supply connections</h3>
        <p>{site.logistics_note}</p>
      </section>
      <details className="port-section">
        <summary>Evidence & sources</summary>
        <p>{site.selection_rationale}</p>
        <a href={site.selection_source_url} target="_blank" rel="noreferrer">Read the supporting source</a>
        {site.location_source_url && <p><a href={site.location_source_url} target="_blank" rel="noreferrer">{site.id === 'grays-bay' ? 'Proposed wharf location · Table 1.1' : 'Additional project / logistics evidence'}</a></p>}
      </details>
      <details className="port-section">
        <summary>Location & assessment limits</summary>
        <p>{site.marker_note}</p>
        <p>These regional maps do not assess local water depth, vessel access or construction feasibility.</p>
      </details>
    </aside>
  )
}
