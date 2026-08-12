import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPatient,
  deletePatient,
  getPatients,
  updatePatient,
} from '../api/patients'
import type { PatientForm } from '../types/patient'
import type { PatientFilters } from '../types/patient'

export function usePatients(
  tenantId: string | undefined,
  search: string,
  filters: PatientFilters,
) {
  const queryClient = useQueryClient()
  const queryKey = ['patients', tenantId, search, filters]

  const patientsQuery = useQuery({
    queryKey,
    queryFn: () => getPatients(search, filters),
    enabled: Boolean(tenantId),
  })

  const refreshPatients = () =>
    queryClient.invalidateQueries({ queryKey: ['patients', tenantId] })

  const createMutation = useMutation({
    mutationFn: (patient: PatientForm) => createPatient(patient),
    onSuccess: refreshPatients,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patient }: { id: string; patient: PatientForm }) =>
      updatePatient(id, patient),
    onSuccess: refreshPatients,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePatient(id),
    onSuccess: refreshPatients,
  })

  return {
    patients: patientsQuery.data ?? [],
    isLoading: patientsQuery.isLoading,
    error:
      patientsQuery.error ||
      createMutation.error ||
      updateMutation.error ||
      deleteMutation.error,
    createPatient: createMutation.mutateAsync,
    updatePatient: updateMutation.mutateAsync,
    deletePatient: deleteMutation.mutateAsync,
    isSaving: createMutation.isPending || updateMutation.isPending,
  }
}
