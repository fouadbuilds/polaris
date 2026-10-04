import { useEffect, useState } from 'react'
import { subscribeCache } from '../offline'

export function CacheStatus() {
  const [state, setState] = useState<'saving' | 'ready' | 'presentation' | 'unavailable'>('saving')
  useEffect(() => subscribeCache(setState), [])
  return <div className="cache-status" role="status">
    <strong>{state === 'presentation' ? '✓ Presentation pack & projections saved offline' : state === 'ready' ? '✓ Observations, projections, routes & ports saved offline' : state === 'saving' ? 'Saving presentation data…' : 'Offline storage not fully available'}</strong>
    {state === 'unavailable' && <p>Keep the local website running to use the files in the project folder.</p>}
    {state === 'ready' && <p>Satellite presets are not prepared.</p>}
  </div>
}
