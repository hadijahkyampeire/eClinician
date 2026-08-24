export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_SESSION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string | null
  doctorName: string | null
  status: AppointmentStatus
  scheduledAt: string
  checkedInAt: string | null
  waitingAt: string | null
  sessionStartedAt: string | null
  completedAt: string | null
  reason: string | null
  createdAt: string
  updatedAt: string
}

/** Mirrors AppointmentRequest. A walk-in is booked with no doctor. */
export interface AppointmentForm {
  patientId: string
  doctorId: string
  scheduledAt: string
  reason: string
}
