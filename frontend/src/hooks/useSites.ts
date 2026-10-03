import { useCallback, useEffect, useState } from 'react'

import { fetchSites } from '../api'
import type { SitesResponse } from '../types'

interface SitesState {
  data: SitesResponse | null
  error: string | null
  isLoading: boolean
}

export function useSites() {
  const [state, setState] = useState<SitesState>({
    data: null,
    error: null,
    isLoading: true,
  })

  const reload = useCallback(() => {
    const controller = new AbortController()
    setState((current) => ({ ...current, error: null, isLoading: true }))

    fetchSites(controller.signal)
      .then((data) => setState({ data, error: null, isLoading: false }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'The site data could not be loaded.',
          isLoading: false,
        })
      })

    return controller
  }, [])

  useEffect(() => {
    const controller = reload()
    return () => controller.abort()
  }, [reload])

  return { ...state, reload }
}
