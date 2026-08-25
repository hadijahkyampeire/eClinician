/**
 * The date window a dashboard is looking through. Every role's look-back uses the same
 * one, so "what happened yesterday" is asked the same way at the front desk, at the bench
 * and at the counter.
 *
 * Bounds are local days, not UTC: a receptionist asking for "today" means the day they are
 * standing in, and the clinic's timezone is the one on the screen in front of them.
 */
export type RangeKey = 'today' | 'yesterday' | 'last3' | 'last7' | 'last30' | 'all' | 'custom'

export interface Range {
  key: RangeKey
  /** Only for `custom`, as yyyy-mm-dd. `to` alone means "up to and including that day". */
  from?: string
  to?: string
}

export const PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last3', label: 'Last 3 days' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'all', label: 'All time' },
]

export const TODAY: Range = { key: 'today' }

const startOfToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const shiftDays = (days: number) => {
  const day = startOfToday()
  day.setDate(day.getDate() + days)
  return day.getTime()
}

/** A yyyy-mm-dd from a date input, read as a local day rather than a UTC instant. */
const parseDay = (value: string, endOfDay = false) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day + (endOfDay ? 1 : 0)).getTime()
}

/** `null` means no window at all — every row qualifies. */
export function bounds(range: Range): { start: number; end: number } | null {
  const tomorrow = shiftDays(1)
  switch (range.key) {
    case 'today': return { start: shiftDays(0), end: tomorrow }
    case 'yesterday': return { start: shiftDays(-1), end: shiftDays(0) }
    case 'last3': return { start: shiftDays(-2), end: tomorrow }
    case 'last7': return { start: shiftDays(-6), end: tomorrow }
    case 'last30': return { start: shiftDays(-29), end: tomorrow }
    case 'all': return null
    case 'custom': {
      if (!range.from && !range.to) return null
      return {
        start: range.from ? parseDay(range.from) : -Infinity,
        end: range.to ? parseDay(range.to, true) : Infinity,
      }
    }
  }
}

export function covers(range: Range, iso: string | null | undefined): boolean {
  if (!iso) return false
  const window = bounds(range)
  if (!window) return true
  const at = new Date(iso).getTime()
  return at >= window.start && at < window.end
}

const asDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })

/** Said in the heading, so the table never leaves you guessing what it is showing. */
export function describe(range: Range): string {
  if (range.key === 'custom') {
    if (range.from && range.to) {
      return range.from === range.to ? asDate(range.from) : `${asDate(range.from)} – ${asDate(range.to)}`
    }
    if (range.from) return `since ${asDate(range.from)}`
    if (range.to) return `up to ${asDate(range.to)}`
    return 'all time'
  }
  return (PRESETS.find(preset => preset.key === range.key)?.label ?? 'Today').toLowerCase()
}
