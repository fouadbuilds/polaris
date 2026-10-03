type Coordinate = [number, number]
type Point = { x: number; y: number }
type Route = { id: string; coordinates: Coordinate[] }

// Display-only, constant-pixel lanes. The original geographical data stays intact.
export function bundleRoutes(routes: Route[], project: (point: Coordinate) => Point, unproject: (point: Point) => Coordinate, spacing = 6) {
  const pointKey = (p: Coordinate) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`
  const segment = (a: Coordinate, b: Coordinate) => {
    const first = pointKey(a), second = pointKey(b)
    return { key: first < second ? `${first}|${second}` : `${second}|${first}`, direction: first < second ? 1 : -1 }
  }
  const shared = new Map<string, Map<string, number>>()
  for (const route of routes) for (let i = 1; i < route.coordinates.length; i++) {
    const { key, direction } = segment(route.coordinates[i - 1], route.coordinates[i])
    if (!shared.has(key)) shared.set(key, new Map())
    shared.get(key)!.set(route.id, direction)
  }
  return routes.map(route => {
    const points = route.coordinates.map(project)
    const offsets = points.slice(1).map((point, i) => {
      const { key, direction } = segment(route.coordinates[i], route.coordinates[i + 1])
      const members = shared.get(key)!
      const lanes = [...members.keys()].sort()
      // Follow the first cable's direction through bends; reverse-traversed
      // routes must occupy the same physical side of the shared corridor.
      const orientation = direction * members.get(lanes[0])!
      const offset = (lanes.indexOf(route.id) - (lanes.length - 1) / 2) * spacing * orientation
      const dx = point.x - points[i].x, dy = point.y - points[i].y
      const length = Math.hypot(dx, dy) || 1
      return { x: -dy / length * offset, y: dx / length * offset }
    })
    const vertexOffsets = points.map((_, i) => {
      const previous = offsets[Math.max(0, i - 1)], next = offsets[Math.min(offsets.length - 1, i)]
      return { x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2 }
    })
    const coordinates = points.map((point, i) => {
      if (i === 0 || i === points.length - 1) return route.coordinates[i]
      // Ease shared lanes into junctions instead of making abrupt lateral jumps.
      const neighbors = vertexOffsets.slice(Math.max(0, i - 2), Math.min(points.length, i + 3))
      const x = neighbors.reduce((sum, p) => sum + p.x, 0) / neighbors.length
      const y = neighbors.reduce((sum, p) => sum + p.y, 0) / neighbors.length
      return unproject({ x: point.x + x, y: point.y + y })
    })
    return { id: route.id, coordinates }
  })
}
