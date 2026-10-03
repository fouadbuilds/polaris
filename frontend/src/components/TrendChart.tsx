import type { TrendPoint } from '../types'

interface TrendChartProps {
  points: TrendPoint[]
}

const width = 312
const height = 136
const padding = { top: 12, right: 12, bottom: 28, left: 28 }

export function TrendChart({ points }: TrendChartProps) {
  const values = points.map((point) => point.ice_extent_pct)
  const min = Math.max(0, Math.min(...values) - 10)
  const max = Math.min(100, Math.max(...values) + 10)
  const range = Math.max(1, max - min)
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  const coordinates = points.map((point, index) => {
    const x = padding.left + (index / Math.max(1, points.length - 1)) * chartWidth
    const y = padding.top + ((max - point.ice_extent_pct) / range) * chartHeight
    return { x, y, ...point }
  })
  const line = coordinates.map(({ x, y }) => `${x},${y}`).join(' ')

  return (
    <figure className="trend-chart">
      <figcaption>Illustrative seasonal ice extent</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ice extent percentage over time">
        <line x1={padding.left} x2={width - padding.right} y1={padding.top} y2={padding.top} className="chart-grid" />
        <line x1={padding.left} x2={width - padding.right} y1={padding.top + chartHeight} y2={padding.top + chartHeight} className="chart-grid" />
        <text x="2" y={padding.top + 4} className="chart-label">{max}%</text>
        <text x="2" y={padding.top + chartHeight} className="chart-label">{min}%</text>
        <polyline points={line} className="chart-line" />
        {coordinates.map((point) => (
          <g key={point.year}>
            <circle cx={point.x} cy={point.y} r="4" className="chart-point" />
            <text x={point.x} y={height - 6} textAnchor="middle" className="chart-label">{point.year}</text>
          </g>
        ))}
      </svg>
    </figure>
  )
}
