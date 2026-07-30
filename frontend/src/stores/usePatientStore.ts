import { create } from 'zustand'
import type { Patient } from '../types/patient'

interface PatientStore {
  search: string
  formOpen: boolean
  editingPatient: Patient | null
  setSearch: (search: string) => void
  openNewForm: () => void
  openEditForm: (patient: Patient) => void
  closeForm: () => void
}

export const usePatientStore = create<PatientStore>((set) => ({
  search: '',
  formOpen: false,
  editingPatient: null,
  setSearch: (search) => set({ search }),
  openNewForm: () => set({ formOpen: true, editingPatient: null }),
  openEditForm: (editingPatient) => set({ formOpen: true, editingPatient }),
  closeForm: () => set({ formOpen: false, editingPatient: null }),
}))
