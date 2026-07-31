export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  sex: string | null
  phone: string | null
  email: string | null
  nationalId: string | null
  addressLine: string | null
  city: string | null
  district: string | null
  stateProvince: string | null
  country: string | null
  activeCareStatus: PatientCareStatus | null
  createdAt: string
  updatedAt: string
}

export interface PatientForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: string
  phoneCountry: string
  phone: string
  email: string
  nationalId: string
  addressLine: string
  city: string
  district: string
  stateProvince: string
  country: string
}

export interface PatientFilters {
  sex: string
  country: string
  dobFrom: string
  dobTo: string
  enrolledFrom: string
  enrolledTo: string
  careStatus: string
  idStatus: string
}

export type PatientCareStatus = 'CHECKED_IN' | 'WAITING' | 'IN_SESSION'
