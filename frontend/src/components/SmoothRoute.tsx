import { useEffect, useRef } from 'react'
import { Polyline } from 'leaflet'
import type { PathOptions, Point } from 'leaflet'
import { useMap } from 'react-leaflet'
import { cableCurve, hitsCable } from '../cableCurves'
import type { CablePoint } from '../cableCurves'

// Leaflet 1.9 SVG rendering hook. Its projection, clipping, pan and zoom
// lifecycle is retained; only the angular path and its hit geometry change.
class CableLayer extends Polyline {
  private hitParts: CablePoint[][] = []
  _updatePath() {
    const layer = this as unknown as { _parts: Point[][]; _renderer: { _setPath: (layer: Polyline, path: string) => void } }
    const curves = layer._parts.map(part => cableCurve(part))
    this.hitParts = curves.map(curve => curve.hitPoints)
    layer._renderer._setPath(this, curves.map(curve => curve.path).join(''))
  }
  _containsPoint(point: Point) {
    return this.hitParts.some(part => hitsCable(point, part, (this.options.weight ?? 3) + 3))
  }
}

interface Props {
  positions: [number, number][]
  options: PathOptions
  interactive?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

export function SmoothRoute({ positions, options, interactive = true, onClick, onHover }: Props) {
  const map = useMap()
  const layer = useRef<CableLayer | null>(null)
  const callbacks = useRef({ onClick, onHover })
  callbacks.current = { onClick, onHover }
  useEffect(() => {
    const cable = new CableLayer([], { ...options, pane: 'trade-routes', interactive, smoothFactor: 0 })
    cable.on({ click: () => callbacks.current.onClick?.(), mouseover: () => callbacks.current.onHover?.(true), mouseout: () => callbacks.current.onHover?.(false) })
    cable.addTo(map)
    if (!interactive) cable.bringToBack()
    layer.current = cable
    return () => { cable.remove(); layer.current = null }
  }, [map, interactive])
  useEffect(() => { layer.current?.setLatLngs(positions) }, [positions, map, interactive])
  useEffect(() => { layer.current?.setStyle(options) }, [options, map, interactive])
  return null
}
