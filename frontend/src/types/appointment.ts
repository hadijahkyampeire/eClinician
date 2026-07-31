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
  status: AppointmentStatus
  scheduledAt: string
  checkedInAt: string | null
  sessionStartedAt: string | null
  completedAt: string | null
  reason: string | null
  createdAt: string
  updatedAt: string
}
