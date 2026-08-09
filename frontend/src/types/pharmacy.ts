export type PrescriptionStatus = 'PENDING' | 'DISPENSED' | 'UNAVAILABLE'

/** Mirrors PrescriptionResponse on the API. */
export interface Prescription {
  id: string
  patientId: string
  patientName: string
  encounterId: string
  medication: string
  status: PrescriptionStatus
  dispensedBy: string | null
  dispensedAt: string | null
  notes: string | null
  createdAt: string
}

/** Mirrors DispenseRequest. A pharmacist can never set PENDING. */
export interface DispenseForm {
  status: Exclude<PrescriptionStatus, 'PENDING'>
  pharmacistName: string
  notes: string
}
