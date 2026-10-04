import { useEffect, useRef } from 'react'
import { Polyline, DomEvent } from 'leaflet'
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
  tooltip?: {name: string; status: string}
}

export function SmoothRoute({ positions, options, interactive = true, onClick, tooltip }: Props) {
  const map = useMap()
  const layer = useRef<CableLayer | null>(null)
  const hitLayer = useRef<CableLayer | null>(null)
  const callbacks = useRef({ onClick, options })
  callbacks.current = { onClick, options }
  useEffect(() => {
    const cable = new CableLayer([], { ...options, pane: 'trade-routes', interactive: false, smoothFactor: 0 })
    cable.addTo(map)
    if (!interactive) cable.bringToBack()
    layer.current = cable
    const hit = interactive ? new CableLayer([], {pane: 'trade-routes', color: 'transparent', weight: 10, opacity: 0, interactive: true, smoothFactor: 0, className: 'route-hit-area'}) : null
    const reset = () => { hit?.closeTooltip(); cable.setStyle(callbacks.current.options) }
    const highlight = () => cable.setStyle({weight: (callbacks.current.options.weight ?? 3.2) + 1.5})
    if (hit) {
      hit.addTo(map)
      hit.on({click: event => { DomEvent.stopPropagation(event.originalEvent); reset(); callbacks.current.onClick?.() }, mouseover: event => {highlight(); hit.openTooltip(event.latlng)}, mouseout: reset})
      map.on('movestart zoomstart', reset)
      const element = hit.getElement()
      if (element) {
        element.setAttribute('tabindex', '0')
        element.setAttribute('role', 'button')
        element.addEventListener('focus', () => { highlight(); const visible = hit.getLatLngs().flat() as import('leaflet').LatLng[]; const point = visible.find(point => map.getBounds().contains(point)); if (point) hit.openTooltip(point) })
        element.addEventListener('blur', reset)
        element.addEventListener('keydown', rawEvent => {
          const event = rawEvent as KeyboardEvent
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); reset(); callbacks.current.onClick?.() }
          if (event.key === 'Escape') reset()
        })
      }
    }
    hitLayer.current = hit
    return () => { map.off('movestart zoomstart', reset); hit?.remove(); cable.remove(); layer.current = null; hitLayer.current = null }
  }, [map, interactive])
  useEffect(() => { layer.current?.setLatLngs(positions); hitLayer.current?.setLatLngs(positions); hitLayer.current?.closeTooltip() }, [positions, map, interactive])
  useEffect(() => { layer.current?.setStyle(options) }, [options, map, interactive])
  useEffect(() => {
    const hit = hitLayer.current
    if (!hit || !tooltip) return
    const content = document.createElement('div')
    const heading = document.createElement('strong')
    heading.textContent = tooltip.name
    const status = document.createElement('span')
    status.textContent = tooltip.status
    const hint = document.createElement('small')
    hint.textContent = 'Click for route details'
    content.append(heading, status, hint)
    hit.bindTooltip(content, {pane: 'map-hover', sticky: false, direction: 'top', offset: [0, -12], className: 'route-tooltip', opacity: 1, interactive: false})
    hit.getElement()?.setAttribute('aria-label', `${tooltip.name}. Open route details`)
    return () => { hit.unbindTooltip() }
  }, [tooltip?.name, tooltip?.status, map, interactive])
  return null
}
