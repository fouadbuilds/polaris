/** Great-circle segment lengths on the source geometry, before visual offsets. */
export function distanceKm(coordinates: [number, number][]): number {
  const radians = (value: number) => value * Math.PI / 180
  let total = 0
  for (let i = 1; i < coordinates.length; i++) {
    const [lon1, lat1] = coordinates[i - 1], [lon2, lat2] = coordinates[i]
    const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
      + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2
    total += 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))))
  }
  return total
}

export function voyageDays(km: number, knots: number): number {
  return km / (knots * 1.852 * 24)
}

/** Assumption-based time comparison, using one average speed for both routes. */
export function compareVoyages(selectedKm: number, alternativeKm: number, knots: number, selectedDelay: number, alternativeDelay: number) {
  if (![selectedKm, alternativeKm, knots, selectedDelay, alternativeDelay].every(Number.isFinite)
    || selectedKm <= 0 || alternativeKm <= 0 || knots <= 0 || selectedDelay < 0 || alternativeDelay < 0) return null
  const selectedDays = voyageDays(selectedKm, knots) + selectedDelay
  const alternativeDays = voyageDays(alternativeKm, knots) + alternativeDelay
  // Negative values mean the selected route cannot tie with a non-negative delay.
  const breakEvenDelay = alternativeDays - voyageDays(selectedKm, knots)
  return { selectedDays, alternativeDays, savingDays: alternativeDays - selectedDays, breakEvenDelay }
}

/** Samples the shortest spherical arc, keeping longitude continuous at the date line. */
export function greatCirclePoints(start: [number, number], end: [number, number], segments = 64): [number, number][] {
  const r = Math.PI / 180
  const vector = ([lon, lat]: [number, number]) => [Math.cos(lat * r) * Math.cos(lon * r), Math.cos(lat * r) * Math.sin(lon * r), Math.sin(lat * r)]
  const a = vector(start), b = vector(end)
  const dot = Math.max(-1, Math.min(1, a.reduce((sum, value, i) => sum + value * b[i], 0)))
  const angle = Math.acos(dot)
  if (angle < 1e-10) return [start, end]
  let tangent = b.map((value, i) => value - dot * a[i])
  let length = Math.hypot(...tangent)
  if (length < 1e-10) {const axis = Math.abs(a[2]) < .9 ? [0, 0, 1] : [1, 0, 0]; const projection = axis.reduce((sum, value, i) => sum + value * a[i], 0); tangent = axis.map((value, i) => value - projection * a[i]); length = Math.hypot(...tangent)}
  tangent = tangent.map(value => value / length)
  let previousLon = start[0]
  return Array.from({length: segments + 1}, (_, i) => {
    const theta = angle * i / segments
    const point = a.map((value, j) => Math.cos(theta) * value + Math.sin(theta) * tangent[j])
    let lon = Math.atan2(point[1], point[0]) / r
    while (lon - previousLon > 180) lon -= 360
    while (lon - previousLon < -180) lon += 360
    previousLon = lon
    return [lon, Math.atan2(point[2], Math.hypot(point[0], point[1])) / r]
  })
}
