import { useEffect, useState } from 'react'
import { subscribeCache } from '../offline'

export function CacheStatus() {
  const [state, setState] = useState<'saving' | 'ready' | 'unavailable'>('saving')
  useEffect(() => subscribeCache(setState), [])
  return <div className="cache-status" role="status">
    <strong>{state === 'ready' ? '✓ Ice maps & routes saved offline' : state === 'saving' ? 'Saving ice maps & routes…' : 'Offline storage not fully available'}</strong>
    <p>{state === 'unavailable' ? 'Maps are bundled locally. Browser storage may be full or disabled.' : state === 'ready' ? 'All years and both seasons are saved on this device.' : 'Preparing all years and both seasons on this device.'} Viewed satellite tiles are cached; new areas and dates need internet. Port images are saved locally and reused.</p>
  </div>
}
