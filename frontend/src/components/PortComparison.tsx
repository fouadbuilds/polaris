import { useRef, useState } from 'react'
import type { Site } from '../types'
import './PortComparison.css'

const DEFAULT_IDS = ['grays-bay', 'churchill', 'tuktoyaktuk']

export function PortComparison({ sites, onInspect }: { sites: Site[]; onInspect: (id: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [ids, setIds] = useState(DEFAULT_IDS)
  const selected = ids.map(id => sites.find(site => site.id === id)).filter((site): site is Site => !!site)
  const hasGrays = selected.some(site => site.id === 'grays-bay')
  const conclusion = hasGrays
    ? 'Grays Bay merits a conditional project study because it has a documented port-and-road proposal. Advancement depends on delivery of the proposed connection and evidence for a workable cargo service. A proposed connection remains a delivery dependency.'
    : 'Current facilities provide an existing-infrastructure starting point. Published proposals depend on project delivery. Team concepts require an initial community-led site investigation. These status differences do not establish which location is best for a particular shipment.'
  return <section className="comparison-launcher" aria-label="Port opportunity screening">
    <h3>Which opportunity needs further investigation?</h3>
    <p>Compare documented infrastructure and the evidence still needed for a seasonal cargo service.</p>
    <button type="button" onClick={() => dialog.current?.showModal()}>Compare three ports</button>
    <dialog ref={dialog} className="port-comparison" aria-labelledby="comparison-title">
      <header className="comparison-heading"><div><p className="eyebrow">Port opportunity screening</p><h2 id="comparison-title">Infrastructure before investment</h2></div><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label="Close port comparison">Close</button></header>
      <p>Decision: which infrastructure dependencies should a planner investigate before commissioning a detailed seasonal cargo-service study?</p>
      <p>These locations serve different regions and cargo markets. They are infrastructure benchmarks, not interchangeable routes for the same shipment.</p>
      <div className="comparison-selectors">{ids.map((id, index) => <label key={index}>Location {index + 1}<select value={id} onChange={event => setIds(current => current.map((value, i) => i === index ? event.target.value : value))}>{sites.map(site => <option key={site.id} value={site.id} disabled={ids.includes(site.id) && site.id !== id}>{site.name}</option>)}</select></label>)}</div>
      <section className="comparison-conclusion" aria-live="polite"><h3>Screening conclusion</h3>
        <p>{conclusion}</p>
        <p>Next action: define the cargo, vessel and endpoints, then investigate full-route access and the site's unresolved infrastructure requirements with the relevant community and project proponents.</p>
      </section>
      <div className="comparison-table-scroll"><table><caption>Documented evidence and unresolved requirements</caption><thead><tr><th scope="col">Assessment question</th>{selected.map(site => <th scope="col" key={site.id}>{site.name}</th>)}</tr></thead><tbody>
        <tr><th scope="row">Infrastructure status</th>{selected.map(site => <td key={site.id}>{site.project_status ?? 'Status needs verification'}</td>)}</tr>
        <tr><th scope="row">Supply connection</th>{selected.map(site => <td key={site.id}>{site.logistics_note}</td>)}</tr>
        <tr><th scope="row">Evidence for inclusion</th>{selected.map(site => <td key={site.id}>{site.selection_rationale}<p><a href={site.selection_source_url} target="_blank" rel="noreferrer">Supporting source</a>{site.location_source_url && <> · <a href={site.location_source_url} target="_blank" rel="noreferrer">Additional evidence</a></>}</p></td>)}</tr>
        <tr><th scope="row">Vessel access and operating season</th>{selected.map(site => <td key={site.id}>Unassessed for a specified vessel and complete route. Regional monthly ice and climate layers provide context, not a reliable access window.</td>)}</tr>
        <tr><th scope="row">Commercial and construction readiness</th>{selected.map(site => <td key={site.id}>Not established by this prototype. Verify cargo demand, berth and approach depths, costs, operating support and relevant approvals.</td>)}</tr>
        <tr><th scope="row">Location precision</th>{selected.map(site => <td key={site.id}>{site.marker_note}</td>)}</tr>
        <tr><th scope="row">Explore evidence</th>{selected.map(site => <td key={site.id}><button type="button" onClick={() => { onInspect(site.id); dialog.current?.close() }}>Inspect this port</button></td>)}</tr>
      </tbody></table></div>
      <p className="comparison-limits">This comparison uses the saved port catalogue. It does not assign feasibility scores or infer local access from regional ice averages.</p>
    </dialog>
  </section>
}
