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

/**
 * Mirrors DispenseRequest. A pharmacist can never set PENDING, and never says who
 * they are — the API stamps that from their token.
 */
export interface DispenseForm {
  status: Exclude<PrescriptionStatus, 'PENDING'>
  notes: string
}
