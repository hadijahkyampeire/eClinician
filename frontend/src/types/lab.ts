export type LabStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

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

/** Mirrors LabResultRequest. A technician can never set PENDING. */
export interface LabResultForm {
  status: Exclude<LabStatus, 'PENDING'>
  technicianName: string
  result: string
  notes: string
}
