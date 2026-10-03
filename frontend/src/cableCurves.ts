export type CablePoint = { x: number; y: number }

function distanceToSegment(p: CablePoint, a: CablePoint, b: CablePoint) {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}

// Remove tiny staircase steps before rounding the remaining bends. Work in
// screen pixels so the visible smoothness stays consistent across zoom levels.
function simplify(points: CablePoint[], tolerance: number): CablePoint[] {
  if (points.length < 3) return points
  let farthest = tolerance, index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const distance = distanceToSegment(points[i], points[0], points[points.length - 1])
    if (distance > farthest) { farthest = distance; index = i }
  }
  if (!index) return [points[0], points[points.length - 1]]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

export function cableCurve(input: CablePoint[], tolerance = 4, radius = 30) {
  const points = simplify(input, tolerance)
  if (!points.length) return { path: '', hitPoints: [] as CablePoint[] }
  const format = (p: CablePoint) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  let path = `M${format(points[0])}`
  const hitPoints = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1], corner = points[i], next = points[i + 1]
    const before = Math.hypot(corner.x - previous.x, corner.y - previous.y)
    const after = Math.hypot(next.x - corner.x, next.y - corner.y)
    const bend = Math.min(radius, before * 0.45, after * 0.45)
    if (bend < 0.01) continue
    const entry = { x: corner.x + (previous.x - corner.x) * bend / before, y: corner.y + (previous.y - corner.y) * bend / before }
    const exit = { x: corner.x + (next.x - corner.x) * bend / after, y: corner.y + (next.y - corner.y) * bend / after }
    path += `L${format(entry)}Q${format(corner)} ${format(exit)}`
    hitPoints.push(entry)
    // The click target follows the visible curve, rather than the old corners.
    const steps = Math.max(8, Math.ceil(bend / 2))
    for (let j = 1; j <= steps; j++) {
      const t = j / steps, u = 1 - t
      hitPoints.push({ x: u * u * entry.x + 2 * u * t * corner.x + t * t * exit.x, y: u * u * entry.y + 2 * u * t * corner.y + t * t * exit.y })
    }
  }
  if (points.length > 1) { path += `L${format(points[points.length - 1])}`; hitPoints.push(points[points.length - 1]) }
  return { path, hitPoints }
}

export function hitsCable(p: CablePoint, points: CablePoint[], width: number) {
  return points.slice(1).some((point, i) => distanceToSegment(p, points[i], point) <= width / 2)
}
