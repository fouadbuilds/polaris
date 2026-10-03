interface TimelineControlProps {
  years: number[]
  activeYear: number
  onYearChange: (year: number) => void
}

export function TimelineControl({ years, activeYear, onYearChange }: TimelineControlProps) {
  const activeIndex = Math.max(0, years.indexOf(activeYear))

  return (
    <section className="timeline-control" aria-labelledby="timeline-heading">
      <div className="timeline-control__label">
        <p className="eyebrow">Evidence window</p>
        <h2 id="timeline-heading">Review trend through</h2>
      </div>
      <input
        aria-label="Review trend through year"
        type="range"
        min="0"
        max={Math.max(0, years.length - 1)}
        step="1"
        value={activeIndex}
        onChange={(event) => onYearChange(years[Number(event.target.value)] ?? activeYear)}
      />
      <output aria-live="polite">{activeYear}</output>
      <p className="timeline-control__note">The rank uses each site’s full fixture series; this control narrows the evidence shown in the detail panel.</p>
    </section>
  )
}
