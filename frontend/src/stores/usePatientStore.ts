import { create } from 'zustand'
import type { Patient, PatientFilters } from '../types/patient'

interface PatientStore {
  search: string
  filters: PatientFilters
  formOpen: boolean
  editingPatient: Patient | null
  setSearch: (search: string) => void
  setFilters: (filters: PatientFilters) => void
  openNewForm: () => void
  openEditForm: (patient: Patient) => void
  closeForm: () => void
}

export const usePatientStore = create<PatientStore>((set) => ({
  search: '',
  filters: {
    sex: '',
    country: '',
    dobFrom: '',
    dobTo: '',
    enrolledFrom: '',
    enrolledTo: '',
    careStatus: '',
    idStatus: '',
  },
  formOpen: false,
  editingPatient: null,
  setSearch: (search) => set({ search }),
  setFilters: (filters) => set({ filters }),
  openNewForm: () => set({ formOpen: true, editingPatient: null }),
  openEditForm: (editingPatient) => set({ formOpen: true, editingPatient }),
  closeForm: () => set({ formOpen: false, editingPatient: null }),
}))
