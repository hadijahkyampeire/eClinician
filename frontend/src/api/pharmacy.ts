import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Pharmacy request failed')
import type {
  CounterPatient, Prescription, DispenseForm, PrescriptionStatus,
} from '../types/pharmacy'


export function getPrescriptions(status?: PrescriptionStatus) {
  const query = status ? `?status=${status}` : ''
  return request<Prescription[]>(`/api/pharmacy/prescriptions${query}`)
}

export function getPatientPrescriptions(patientId: string) {
  return request<Prescription[]>(`/api/pharmacy/prescriptions/patients/${patientId}`)
}

export function updatePrescription(id: string, form: DispenseForm) {
  return request<Prescription>(`/api/pharmacy/prescriptions/${id}`, {
    method: 'POST',
    body: JSON.stringify(form),
  })
}

/** Who is standing at the counter, and what each of them is waiting for. */
export function getCounter() {
  return request<CounterPatient[]>('/api/pharmacy/counter')
}

/** They have their medicines and gone: the last thing open on them closes here. */
export function checkOutOfPharmacy(patientId: string) {
  return request<void>(`/api/pharmacy/counter/${patientId}/check-out`, { method: 'POST' })
}

/** What the pharmacy could not supply, for patients who are still in the building. */
export function getUnsupplied() {
  return request<Prescription[]>('/api/pharmacy/unsupplied')
}
