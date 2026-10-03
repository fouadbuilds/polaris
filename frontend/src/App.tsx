import { useEffect, useState } from 'react'

import { ScoreBadge } from './components/ScoreBadge'
import { SiteMap } from './components/SiteMap'
import { SitePanel } from './components/SitePanel'
import { useSites } from './hooks/useSites'

export default function App() {
  const { data, error, isLoading, reload } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const rankedSites = data ? [...data.sites].sort((left, right) => right.durability_score - left.durability_score) : []

  useEffect(() => {
    if (!selectedSiteId && rankedSites[0]) {
      setSelectedSiteId(rankedSites[0].id)
    }
  }, [rankedSites, selectedSiteId])

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
      <section className="data-status" aria-label="Prototype data status">
        <strong>Prototype data status</strong>
        <span>Scores and trend series are fixtures while historical and RCM processing is built. Some RCM products are publicly released through Canada’s EODMS; the first site-specific scene is pending selection.</span>
        <a href="https://www.asc-csa.gc.ca/eng/satellites/radarsat/access-to-data/" target="_blank" rel="noreferrer">RCM access details</a>
      </section>

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
            <SiteMap sites={rankedSites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId} />
          )}
        </div>
        <SitePanel site={selectedSite} />
      </section>

      {data && (
        <section className="candidate-list" aria-labelledby="candidate-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Comparison set</p>
              <h2 id="candidate-heading">Ranked by durability</h2>
            </div>
            <p>Updated {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(data.updated))}</p>
          </div>
          <div className="candidate-list__items">
            {rankedSites.map((site, index) => (
              <button
                type="button"
                key={site.id}
                className={`candidate ${site.id === selectedSiteId ? 'candidate--selected' : ''}`}
                onClick={() => setSelectedSiteId(site.id)}
                aria-pressed={site.id === selectedSiteId}
              >
                <span>
                  <small className="candidate__rank">Rank {String(index + 1).padStart(2, '0')}</small>
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
        This prototype is for comparing evidence, not navigation, safety, or a port-siting recommendation.
      </footer>
    </main>
  )
}
