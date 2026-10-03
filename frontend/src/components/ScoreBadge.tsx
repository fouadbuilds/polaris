interface ScoreBadgeProps {
  score: number
}

function scoreBand(score: number) {
  if (score >= 70) return { label: 'More durable', tone: 'high' }
  if (score >= 50) return { label: 'Watch closely', tone: 'medium' }
  return { label: 'Less durable', tone: 'low' }
}

export function ScoreBadge({ score }: ScoreBadgeProps) {
  const band = scoreBand(score)

  return (
    <span className={`score-badge score-badge--${band.tone}`}>
      <strong>{score}</strong>
      <span>{band.label}</span>
    </span>
  )
}
