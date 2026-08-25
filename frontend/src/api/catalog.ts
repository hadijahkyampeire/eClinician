import { request as send } from './http'
import type { LabTestOption, MedicationOption } from '../types/catalog'

const request = <T>(path: string) => send<T>(path, undefined, 'Could not load the catalogue')

/** Reference lists, the same for every hospital, so they cache for the whole session. */
export const getMedications = () =>
  request<MedicationOption[]>('/api/catalog/medications')

export const getLabTests = () =>
  request<LabTestOption[]>('/api/catalog/lab-tests')
