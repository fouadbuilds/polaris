export interface TrendPoint {
  year: number
  ice_extent_pct: number
}

export interface Site {
  id: string
  name: string
  lat: number
  lon: number
  durability_score: number | null
  trend_summary: string
  trend_series: TrendPoint[]
  current_rcm_note: string
  selection_rationale: string
  selection_source_url: string
  project_status?: string | null
  location_source_url?: string | null
}

export interface SitesResponse {
  updated: string
  sites: Site[]
}
