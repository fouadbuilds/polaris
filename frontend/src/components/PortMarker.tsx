import { useEffect, useRef } from 'react'
import { CircleMarker, Tooltip, useMap } from 'react-leaflet'
import type { CircleMarker as LeafletMarker } from 'leaflet'
import type { Site } from '../types'

export function PortMarker({site, selected, labels, onSelect}: {site: Site; selected: boolean; labels: boolean; onSelect: () => void}) {
  const marker = useRef<LeafletMarker>(null)
  const visual = useRef<LeafletMarker>(null)
  const map = useMap()
  const proposed = site.port_category === 'proposed'
  const portColor = site.port_category === 'team' ? 'var(--map-port-team)' : 'var(--map-port)'
  useEffect(() => {const close = () => marker.current?.closeTooltip(); map.on('movestart zoomstart', close); return () => {map.off('movestart zoomstart', close)}}, [map])
  useEffect(() => {
    const element = marker.current?.getElement()
    if (!element) return
    element.setAttribute('tabindex', '0'); element.setAttribute('role', 'button')
    element.setAttribute('aria-label', `${site.name}. ${site.project_status}. Open port details`)
    const focus = () => marker.current?.openTooltip()
    const blur = () => marker.current?.closeTooltip()
    const keydown = (event: Event) => {const key = event as KeyboardEvent; if (key.key === 'Enter' || key.key === ' ') {key.preventDefault(); blur(); onSelect()} if (key.key === 'Escape') blur()}
    element.addEventListener('focus', focus); element.addEventListener('blur', blur); element.addEventListener('keydown', keydown)
    return () => {element.removeEventListener('focus', focus); element.removeEventListener('blur', blur); element.removeEventListener('keydown', keydown)}
  }, [onSelect, site.name, site.project_status])
  return <>
    <CircleMarker center={[site.lat, site.lon]} radius={selected ? 12 : 10} interactive={false}
      pathOptions={{color: selected ? '#173e53' : 'var(--map-port-outline)', fill: false, weight: selected ? 2 : 3}} />
    <CircleMarker ref={visual} center={[site.lat, site.lon]} radius={selected ? 8 : 7} interactive={false}
      pathOptions={{color: proposed ? portColor : 'var(--map-port-outline)', fillColor: proposed ? '#ffffff' : portColor, fillOpacity: 1, weight: proposed ? 3 : 2, dashArray: proposed ? '3 2' : undefined}} />
    <CircleMarker ref={marker} center={[site.lat, site.lon]} radius={15} bubblingMouseEvents={false}
      pathOptions={{color: 'transparent', fillColor: 'transparent', opacity: 0, fillOpacity: 0, weight: 0, className: 'port-marker'}}
      eventHandlers={{mouseover: () => visual.current?.setStyle({weight: 3.5}), mouseout: () => visual.current?.setStyle({weight: proposed ? 3 : 2}), click: () => {marker.current?.closeTooltip(); onSelect()}}}>
      <Tooltip pane="map-hover" interactive={false} direction="auto" offset={[12, 0]} className="port-info-tooltip" opacity={1}>
        <strong>{site.name}</strong><span>{site.project_status}</span><p>{site.logistics_note.split('. ')[0]}.</p><small>Click for evidence & sources</small>
      </Tooltip>
    </CircleMarker>
    {labels && <CircleMarker center={[site.lat, site.lon]} radius={0} interactive={false} pathOptions={{opacity: 0, fillOpacity: 0, weight: 0}}><Tooltip pane="tooltipPane" interactive={false} permanent direction={site.id === 'gjoa-haven' ? 'right' : 'top'} offset={site.id === 'gjoa-haven' ? [10, 0] : [0, -10]} className="port-label">{site.name}</Tooltip></CircleMarker>}
  </>
}
