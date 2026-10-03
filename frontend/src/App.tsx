import { useEffect, useState } from 'react'

import { ScoreBadge } from './components/ScoreBadge'
import { SiteMap } from './components/SiteMap'
import { SitePanel } from './components/SitePanel'
import { useSites } from './hooks/useSites'

export default function App() {
  const { data, error, isLoading, reload } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedSiteId && data?.sites[0]) {
      setSelectedSiteId(data.sites[0].id)
    }
  }, [data, selectedSiteId])

  const selectedSite = data?.sites.find((site) => site.id === selectedSiteId) ?? null

  return (
    <main>
      <header className="app-header">
        <div>
          <p className="brand">POLARIS / NWP</p>
          <h1>Where is melt becoming a durable infrastructure signal?</h1>
        </div>
        <p className="app-header__context">Decision support for long-horizon port planning—not live navigation advice.</p>
      </header>

      <section className="workspace" aria-label="Port candidate comparison">
        <div className="map-area">
          {isLoading && <div className="map-status" role="status">Loading candidate trends…</div>}
          {error && (
            <div className="map-status map-status--error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => reload()}>Try again</button>
            </div>
          )}
          {data && data.sites.length === 0 && <div className="map-status" role="status">No candidate sites are available yet.</div>}
          {data && data.sites.length > 0 && (
            <SiteMap sites={data.sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
          )}
        </div>
        <SitePanel site={selectedSite} />
      </section>

      {data && (
        <section className="candidate-list" aria-labelledby="candidate-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Comparison set</p>
              <h2 id="candidate-heading">Candidate signals</h2>
            </div>
            <p>Updated {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(data.updated))}</p>
          </div>
          <div className="candidate-list__items">
            {data.sites.map((site) => (
              <button
                type="button"
                key={site.id}
                className={`candidate ${site.id === selectedSiteId ? 'candidate--selected' : ''}`}
                onClick={() => setSelectedSiteId(site.id)}
                aria-pressed={site.id === selectedSiteId}
              >
                <span>
                  <strong>{site.name}</strong>
                  <small>{site.trend_summary}</small>
                </span>
                <ScoreBadge score={site.durability_score} />
              </button>
            ))}
          </div>
        </section>
      )}

      <footer>
        Scores, trends, and RCM notes are illustrative fixtures. They are not a navigation, safety, or port-siting recommendation.
      </footer>
    </main>
  )
}
