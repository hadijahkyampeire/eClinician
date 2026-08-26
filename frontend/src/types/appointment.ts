export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_SESSION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'

import type { PatientCareStatus } from './patient'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string | null
  doctorName: string | null
  doctorSpecialty: string | null
  room: string | null
  status: AppointmentStatus
  /** Where the patient is right now — a visit in session may be standing at the bench. */
  careStatus: PatientCareStatus | null
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
