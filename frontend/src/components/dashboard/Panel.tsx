import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** A list with a heading — the shape every dashboard panel takes. */
export function Panel({ title, count, to, seeAll, empty, first, children }: {
  title: string
  count?: number
  to?: string
  seeAll?: string
  empty: string
  /** With nothing in the list, name the first thing this role would do next. */
  first?: { label: string; to: string }
  children: ReactNode
}) {
  const rows = Array.isArray(children) ? children.flat().filter(Boolean) : children
  const isEmpty = Array.isArray(rows) ? rows.length === 0 : !rows

  return (
    <section className="card panel">
      <header className="panel-head">
        <h3>
          {title}
          {count ? <span className="pill">{count}</span> : null}
        </h3>
        {to && <Link to={to} className="panel-link">{seeAll ?? 'See all'} →</Link>}
      </header>
      {isEmpty ? (
        <div className="panel-empty">
          <p>{empty}</p>
          {first && <Link to={first.to} className="btn small">{first.label}</Link>}
        </div>
      ) : (
        <ul className="panel-rows">{rows}</ul>
      )}
    </section>
  )
}

export function Row({ primary, to, secondary, meta, tone, action }: {
  primary: string
  /** Where the name goes when it is a patient's — their chart is always one click away. */
  to?: string
  secondary?: string | null
  meta?: string | null
  tone?: 'waiting' | 'session' | 'ready'
  action?: ReactNode
}) {
  return (
    <li className="panel-row">
      <span className="row-text">
        {to
          ? <Link className="row-primary row-link" to={to}>{primary}</Link>
          : <span className="row-primary">{primary}</span>}
        {secondary && <span className="row-secondary">{secondary}</span>}
      </span>
      {meta && <span className={`row-meta${tone ? ` ${tone}` : ''}`}>{meta}</span>}
      {action}
    </li>
  )
}
