export type Weekday =
  | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface AvailabilityShift {
  id?: string
  dayOfWeek: Weekday
  startTime: string
  endTime: string
  room: string
}
