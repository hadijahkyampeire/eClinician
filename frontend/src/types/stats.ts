/** Mirrors DashboardStats on the API — live counts for the current tenant. */
export interface DashboardStats {
  totalPatients: number
  newPatientsToday: number
  checkedIn: number
  waiting: number
  inSession: number
  appointmentsToday: number
  draftEncounters: number
  finalizedToday: number
  clinicians: number
  prescriptionsRaised: number
  labRequestsRaised: number
}
