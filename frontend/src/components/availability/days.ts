import type { Weekday } from '../../types/availability'

/** The week, in the order a rota is read. */
export const DAYS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: 'Monday' }, { value: 'TUESDAY', label: 'Tuesday' },
  { value: 'WEDNESDAY', label: 'Wednesday' }, { value: 'THURSDAY', label: 'Thursday' },
  { value: 'FRIDAY', label: 'Friday' }, { value: 'SATURDAY', label: 'Saturday' },
  { value: 'SUNDAY', label: 'Sunday' },
]

/**
 * The clinic's day, in three: morning, afternoon, evening. A clinician starts published
 * for all three, every day, and takes away what they do not work.
 *
 * The last one ends at 23:59 rather than 00:00 because a shift is matched with
 * `start <= t < end`, and midnight as an end time sorts before its own start.
 */
export const SHIFTS = [
  { startTime: '08:00', endTime: '14:00' },
  { startTime: '14:00', endTime: '20:00' },
  { startTime: '20:00', endTime: '23:59' },
]
