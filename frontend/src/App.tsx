import { useEffect, useState } from 'react'
import { SiteMap } from './components/SiteMap'
import { SitePanel } from './components/SitePanel'
import { PortComparison } from './components/PortComparison'
import { useSites } from './hooks/useSites'
import polarisMark from './assets/polaris-mark.png'

export default function App() {
  const { data, error, isLoading, reload } = useSites()
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const sites = data?.sites ?? []
  useEffect(() => { if (!selectedSiteId && sites[0]) setSelectedSiteId(sites[0].id) }, [sites, selectedSiteId])
  const selectedSite = sites.find(site => site.id === selectedSiteId) ?? null
  const activeYear = selectedSite?.trend_series.at(-1)?.year ?? 2024
  return <main className="dashboard dashboard--field-console">
    <header className="app-header">
      <div className="dashboard-brand"><span className="brand-mark" aria-hidden="true"><img src={polarisMark} alt="" /></span><div><p className="brand">POLARIS · FIELD CONSOLE</p><h1>Canadian Arctic maritime observatory</h1></div></div>
      <div className="header-context"><span className="status-dot" /><span>Observed ice</span><span className="header-divider">/</span><span>1996–2026</span></div>
    </header>
    <div className="data-status" aria-label="Data status"><span><strong>Data register</strong> NOAA / NSIDC observations · ECCC / CMIP6 projections</span><span>Methods and source files in Layers & time</span></div>
    <section className="workspace" aria-label="Arctic map dashboard">
      {isLoading && <div className="map-status" role="status">Loading dashboard…</div>}
      {error && <div className="map-status map-status--error" role="alert"><p>{error}</p><button onClick={() => reload()}>Try again</button></div>}
      {data && sites.length > 0 && <SiteMap sites={sites} selectedSiteId={selectedSiteId} onSelect={setSelectedSiteId}
        inspector={<><PortComparison sites={sites} onInspect={setSelectedSiteId} /><SitePanel site={selectedSite} activeYear={activeYear} /></>} />}
      {data && sites.length === 0 && <div className="map-status">No port candidates available.</div>}
    </section>
  </main>
}
