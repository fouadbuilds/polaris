import { ScoreBadge } from './ScoreBadge'
import { TrendChart } from './TrendChart'
import type { Site } from '../types'

interface SitePanelProps {
  site: Site | null
}

export function SitePanel({ site }: SitePanelProps) {
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
          <p className="eyebrow">Prototype candidate</p>
          <h2>{site.name}</h2>
          <p className="coordinates">{site.lat.toFixed(2)}° N · {Math.abs(site.lon).toFixed(2)}° W</p>
        </div>
        <ScoreBadge score={site.durability_score} />
      </div>
      <p className="summary">{site.trend_summary}</p>
      <TrendChart points={site.trend_series} />
      <div className="rcm-note">
        <span>RCM current state</span>
        <p>{site.current_rcm_note}</p>
      </div>
    </aside>
  )
}
