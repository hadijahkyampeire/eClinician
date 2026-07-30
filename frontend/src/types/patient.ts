export interface Patient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string | null
  sex: string | null
  phone: string | null
  email: string | null
  nationalId: string | null
  address: string | null
}

export interface PatientForm {
  firstName: string
  lastName: string
  dateOfBirth: string
  sex: string
  phone: string
  email: string
  nationalId: string
  address: string
}
