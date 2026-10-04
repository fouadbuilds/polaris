import type { SitesResponse } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export interface SatelliteImage {
  site_id: string
  requested_date: string
  acquired_at: string
  scene_id: string
  cloud_cover_percent: number | null
  bounds: [[number, number], [number, number]]
  image_url: string
  attribution: string
}

export async function fetchSatelliteImage(siteId: string, date: string, signal: AbortSignal): Promise<SatelliteImage> {
  const response = await fetch(`${apiBaseUrl}/api/imagery/${encodeURIComponent(siteId)}?date=${encodeURIComponent(date)}`, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(typeof body?.detail === 'string' ? body.detail : 'The satellite image could not be loaded.')
  }
  return response.json() as Promise<SatelliteImage>
}

export async function fetchSites(signal?: AbortSignal): Promise<SitesResponse> {
  try {
    // The researched, bundled catalogue is the same online and offline. A
    // running API process may still hold an older fixture until it restarts.
    const response = await fetch('/data/sites.json', { signal })
    if (!response.ok) throw new Error('Bundled port catalogue unavailable')
    return await response.json() as SitesResponse
  } catch (error) {
    if (signal?.aborted) throw error
    const response = await fetch(`${apiBaseUrl}/api/sites?catalog=4`, { signal })
    if (!response.ok) throw new Error('The saved port catalogue could not be loaded.')
    return response.json() as Promise<SitesResponse>
  }
}
