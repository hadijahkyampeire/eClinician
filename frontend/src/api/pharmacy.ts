import { request as send } from './http'

/** Every call in this module, through the one place that handles expiry. */
const request = <T>(path: string, options?: RequestInit) =>
  send<T>(path, options, 'Pharmacy request failed')
import type { Prescription, DispenseForm, PrescriptionStatus } from '../types/pharmacy'


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