export type EncounterStatus = 'DRAFT' | 'FINALIZED'

export interface EncounterForm {
  patientId: string
  appointmentId: string
  clinicianName: string
  chiefComplaint: string
  bloodPressure: string
  temperatureCelsius: string
  pulseBpm: string
  weightKg: string
  symptoms: string
  examinationNotes: string
  diagnosis: string
  treatmentPlan: string
  prescriptions: string
  labRequests: string
}

export interface Encounter extends Omit<EncounterForm,
  'temperatureCelsius' | 'pulseBpm' | 'weightKg'> {
  id: string
  patientName: string
  status: EncounterStatus
  temperatureCelsius: number | null
  pulseBpm: number | null
  weightKg: number | null
  finalizedAt: string | null
  createdAt: string
  updatedAt: string
}
