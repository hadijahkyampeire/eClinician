/**
 * A tear-off calendar leaf with today's date drawn into it, sat in the topbar on
 * every page. Clinical work is dated work — the day a visit happened is half of
 * what the record means — so the date is furniture here, not decoration.
 */
export default function DateChip() {
  const now = new Date()
  const weekday = now.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase()
  const full = now.toLocaleDateString(undefined, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <span className="date-chip" title={full}>
      <svg width="30" height="30" viewBox="0 0 30 30" role="img" aria-label={full}>
        <rect x="1" y="3" width="28" height="26" rx="5" fill="var(--surface)"
          stroke="var(--border)" />
        <path d="M1 8a5 5 0 0 1 5-5h18a5 5 0 0 1 5 5v1H1V8Z" fill="var(--brand)" />
        <rect x="7.5" y="0.5" width="2.5" height="5" rx="1.25" fill="var(--brand-dark)" />
        <rect x="20" y="0.5" width="2.5" height="5" rx="1.25" fill="var(--brand-dark)" />
        <text x="15" y="23" textAnchor="middle" fontSize="13" fontWeight="700"
          fill="var(--heading)" fontFamily="inherit">
          {now.getDate()}
        </text>
      </svg>
      <span className="date-text">
        <strong>{weekday}</strong>
        {now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
      </span>
    </span>
  )
}
