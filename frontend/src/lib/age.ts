/**
 * Whole years, except for the very young, where months are the number that matters — a
 * dose for a nine-month-old is not a dose for a two-year-old, and "0 years" says neither.
 * Derived from the date of birth the desk records, so it cannot go stale.
 */
export function ageOf(dateOfBirth: string | null): string {
  if (!dateOfBirth) return 'Age unknown'
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return 'Age unknown'
  const now = new Date()
  let months = (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth()
  if (now.getDate() < born.getDate()) months -= 1
  if (months < 0) return 'Age unknown'
  if (months < 24) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  return `${years} year${years === 1 ? '' : 's'}`
}
