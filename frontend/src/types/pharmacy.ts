export type PrescriptionStatus = 'PENDING' | 'DISPENSED' | 'UNAVAILABLE'

/** Mirrors PrescriptionResponse on the API. */
export interface Prescription {
  id: string
  patientId: string
  patientName: string
  encounterId: string
  /** What the clinician ordered. */
  medication: string
  status: PrescriptionStatus
  /** What the pharmacist handed over; null until dispensed. */
  dispensedMedication: string | null
  quantityDispensed: number | null
  dispenseUnit: string | null
  /** True when the two medicines differ. */
  substituted: boolean
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
  dispensedMedication?: string
  quantityDispensed?: number | null
  dispenseUnit?: string
  notes: string
}

/** What a pharmacy counts in. Free text is still accepted; these are the quick picks. */
export const DISPENSE_UNITS = [
  'tablets', 'capsules', 'ml', 'sachets', 'bottles', 'vials', 'ampoules', 'tubes',
]
