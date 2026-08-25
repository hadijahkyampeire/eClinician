import type { ReactNode } from 'react'
import { PRESETS, describe, type Range } from './range'

/**
 * The look-back under every dashboard: the same window control over whatever that role's
 * work is. The panels above it are today's queue and move on their own; this is the part
 * you drive, for the times someone at the desk asks what happened last Tuesday.
 */
export function Lookback({ title, blurb, range, onRange, count, empty, head, children }: {
  title: string
  blurb: string
  range: Range
  onRange: (range: Range) => void
  count: number
  empty: string
  /** The `<th>` cells, so each role names its own columns. */
  head: ReactNode
  children: ReactNode
}) {
  const custom = (from: string | undefined, to: string | undefined) =>
    onRange({ key: 'custom', from, to })

  return (
    <section className="card lookback">
      <header className="lookback-head">
        <div>
          <h3>{title}</h3>
          <p>{blurb}</p>
        </div>
        <span className="lookback-count">
          {count} {count === 1 ? 'entry' : 'entries'} · {describe(range)}
        </span>
      </header>

      <div className="lookback-filter">
        <div className="lookback-presets" role="group" aria-label="Period">
          {PRESETS.map(preset => (
            <button key={preset.key} type="button"
              className={`chip${range.key === preset.key ? ' on' : ''}`}
              aria-pressed={range.key === preset.key}
              onClick={() => onRange({ key: preset.key })}>
              {preset.label}
            </button>
          ))}
        </div>
        {/* Leave one side empty for an open-ended window; set both the same for one day. */}
        <div className="lookback-dates">
          <label>
            <span>From</span>
            <input type="date" value={range.from ?? ''} max={range.to || undefined}
              onChange={event => custom(event.target.value || undefined, range.to)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={range.to ?? ''} min={range.from || undefined}
              onChange={event => custom(range.from, event.target.value || undefined)} />
          </label>
        </div>
      </div>

      {count === 0 ? (
        <p className="lookback-empty">{empty}</p>
      ) : (
        <div className="table-wrap">
          <table className="patient-table lookback-table">
            <thead><tr>{head}</tr></thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function When({ iso }: { iso: string | null }) {
  if (!iso) return <>—</>
  return <>{new Date(iso).toLocaleString([], {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })}</>
}
