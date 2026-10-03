export interface TrendPoint {
  year: number
  ice_extent_pct: number
}

export interface Site {
  id: string
  name: string
  lat: number
  lon: number
  durability_score: number
  trend_summary: string
  trend_series: TrendPoint[]
  current_rcm_note: string
}

export interface SitesResponse {
  updated: string
  sites: Site[]
}
