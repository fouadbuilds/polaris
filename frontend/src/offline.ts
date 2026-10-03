type CacheState = 'saving' | 'ready' | 'unavailable'
let state: CacheState = 'saving'
const listeners = new Set<(state: CacheState) => void>()
function update(next: CacheState) { state = next; listeners.forEach(listener => listener(next)) }
export function subscribeCache(listener: (state: CacheState) => void) {
  listeners.add(listener); listener(state)
  return () => { listeners.delete(listener) }
}
export async function startOfflineCache() {
  if (!('serviceWorker' in navigator)) { update('unavailable'); return }
  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'MAPS_SAVED') update(event.data.ready ? 'ready' : 'unavailable')
  })
  try {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    const registration = await navigator.serviceWorker.ready
    registration.active?.postMessage({type: 'SAVE_MAPS', apiUrl: `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/api/sites?catalog=2`})
  } catch { update('unavailable') }
}
