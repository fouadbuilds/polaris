import type { SitesResponse } from './types'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function fetchSites(signal?: AbortSignal): Promise<SitesResponse> {
  const response = await fetch(`${apiBaseUrl}/api/sites`, { signal })

  if (!response.ok) {
    throw new Error(`The site data could not be loaded (${response.status}).`)
  }

  return response.json() as Promise<SitesResponse>
}
