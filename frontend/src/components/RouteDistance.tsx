import { useState } from 'react'
import { compareVoyages, distanceKm, voyageDays } from '../routeMetrics'
import type { TradeRoute } from './TradeRoutes'

const number = (value: number) => Math.round(value).toLocaleString()

export function RouteDistance({ route, routes }: { route: TradeRoute; routes: TradeRoute[] }) {
  const km = distanceKm(route.geometry.coordinates)
  const road = ['grays-road', 'grays-yellowknife'].includes(route.properties.id)
  const [knots, setKnots] = useState('12')
  const [dailyCost, setDailyCost] = useState('')
  const [baseline, setBaseline] = useState('')
  const [comparison, setComparison] = useState('manual')
  const [delay, setDelay] = useState('0')
  const [alternativeDelay, setAlternativeDelay] = useState('0')
  const sameEnds = routes.filter(candidate => candidate.properties.id !== route.properties.id
    && JSON.stringify([candidate.geometry.coordinates[0], candidate.geometry.coordinates.at(-1)])
      === JSON.stringify([route.geometry.coordinates[0], route.geometry.coordinates.at(-1)]))
  const other = sameEnds.find(candidate => candidate.properties.id === comparison)
  const baselineKm = other ? distanceKm(other.geometry.coordinates) : Number(baseline)
  const speed = Number(knots), cost = Number(dailyCost), extraDays = Number(delay), otherDelay = Number(alternativeDelay)
  const valid = knots.trim() !== '' && delay.trim() !== '' && Number.isFinite(speed) && speed > 0 && Number.isFinite(extraDays) && extraDays >= 0
  const days = valid ? voyageDays(km, speed) + extraDays : null
  const result = valid && alternativeDelay.trim() !== '' ? compareVoyages(km, baselineKm, speed, extraDays, otherDelay) : null
  const savingDays = result?.savingDays ?? null
  return <section className="route-distance" aria-label="Route distance and voyage comparison">
    <h3>{road ? 'Road distance' : 'Corridor distance'}</h3>
    <strong>{number(km)} km · {number(km / 1.609344)} miles{!road && ` · ${number(km / 1.852)} nautical miles`}</strong>
    <p>{route.properties.id === 'grays-yellowknife' ? 'Approximate presentation sketch distance; the road alignment has not been surveyed in this map.' : road ? 'Endpoint sketch; the proposed road alignment is approximately 230 km.' : 'Approximate schematic distance, not a surveyed sailing track.'}</p>
    {!road && <details><summary>Compare travel time & operating cost</summary>
      <p>Use the same origin and destination. Inputs are assumptions; 12 knots is an editable example.</p>
      <label>Average sailing speed (knots)<input type="number" min="0.1" step="0.5" value={knots} onChange={event => setKnots(event.target.value)} /></label>
      <label>Extra days on selected route (ice / waiting)<input type="number" min="0" step="0.5" value={delay} onChange={event => setDelay(event.target.value)} /></label>
      <label>Compare with<select value={other ? comparison : 'manual'} onChange={event => setComparison(event.target.value)}>
        <option value="manual">Enter alternative distance for the same endpoints</option>
        {sameEnds.map(candidate => <option key={candidate.properties.id} value={candidate.properties.id}>{candidate.properties.name}</option>)}
      </select></label>
      {!other && <label>Alternative route length (km)<input type="number" min="1" placeholder="Enter a sourced distance" value={baseline} onChange={event => setBaseline(event.target.value)} /></label>}
      <label>Extra days on alternative route (ice / waiting)<input type="number" min="0" step="0.5" value={alternativeDelay} onChange={event => setAlternativeDelay(event.target.value)} /></label>
      <label>Operating cost per day (CAD)<input type="number" min="0" placeholder="Your vessel cost" value={dailyCost} onChange={event => setDailyCost(event.target.value)} /></label>
      {days !== null ? <p>Selected corridor: <strong>{days.toFixed(1)} days</strong>, including {extraDays} extra days.</p> : <p>Enter a positive speed and non-negative delay.</p>}
      {savingDays !== null && <div aria-live="polite"><p><strong>{number(Math.abs(baselineKm - km))} km {baselineKm >= km ? 'shorter' : 'longer'}</strong> · {Math.abs(savingDays).toFixed(1)} days {savingDays >= 0 ? 'saved' : 'extra'} versus the alternative.</p>
        <p>Alternative corridor: <strong>{result!.alternativeDays.toFixed(1)} days</strong>, including {otherDelay} extra days.</p>
        <p className="voyage-conclusion">{result!.breakEvenDelay >= 0
          ? <>Break-even: <strong>{result!.breakEvenDelay.toFixed(2)} extra days</strong> on the selected route makes both voyages equally long. More delay makes the selected route slower.</>
          : <>The selected route is slower even with zero extra days. The alternative would need <strong>{(-result!.breakEvenDelay).toFixed(2)} additional days</strong> beyond its entered delay to tie.</>}</p>
        {dailyCost !== '' && Number.isFinite(cost) && cost >= 0 && <p><strong>CAD {number(Math.abs(savingDays * cost))}</strong> {savingDays >= 0 ? 'lower' : 'higher'} assumed voyage operating cost.</p>}</div>}
      {days !== null && !result && (other || baseline !== '') && <p role="status">Enter a positive alternative distance and a non-negative alternative delay to compare.</p>}
      <p>Both routes use the same assumed average speed. Time = distance ÷ speed + each route's extra days. Cost difference = days saved × daily cost. Icebreaking, insurance, canal fees, fuel-price differences, cargo revenue and port costs are excluded. This does not calculate fuel use or emissions.</p>
    </details>}
  </section>
}
