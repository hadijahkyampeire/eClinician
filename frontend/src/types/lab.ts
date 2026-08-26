export type LabStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

/** Mirrors LabOrderResponse on the API. */
export interface LabOrder {
  id: string
  patientId: string
  patientName: string
  encounterId: string
  testName: string
  status: LabStatus
  result: string | null
  resultedBy: string | null
  resultedAt: string | null
  notes: string | null
  createdAt: string
}

/**
 * Mirrors LabResultRequest. A technician can never set PENDING, and never says who
 * they are — the API stamps that from their token. IN_PROGRESS is the draft: the
 * specimen is taken and whatever has been read so far can be saved without signing it.
 */
export interface LabResultForm {
  status: Exclude<LabStatus, 'PENDING'>
  result: string
  notes: string
}

/** One patient's outstanding lab work, together. Mirrors BenchPatient. */
export interface BenchPatient {
  patientId: string
  patientName: string
  tests: LabOrder[]
  waitingSince: string
}
