export type EncounterStatus = 'DRAFT' | 'FINALIZED'

export interface EncounterForm {
  patientId: string
  appointmentId: string
  chiefComplaint: string
  /** Typed as one reading, "120/80"; stored as the two numbers it is made of. */
  bloodPressure: string
  temperatureCelsius: string
  pulseBpm: string
  weightKg: string
  heightCm: string
  symptoms: string
  examinationNotes: string
  diagnosis: string
  treatmentPlan: string
  prescriptions: string
  labRequests: string
  visitSummary: string
}

export interface Encounter extends Omit<EncounterForm,
  'bloodPressure' | 'temperatureCelsius' | 'pulseBpm' | 'weightKg' | 'heightCm'> {
  id: string
  patientName: string
  /** Response-only: stamped by the API from the signed-in clinician's token. */
  clinicianName: string
  status: EncounterStatus
  systolicBp: number | null
  diastolicBp: number | null
  temperatureCelsius: number | null
  pulseBpm: number | null
  weightKg: number | null
  heightCm: number | null
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}
