import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Chip } from '@mui/material'
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined'
import { createHospital, setHospitalActive, updateHospital } from '../../api/platform'
import { useHospitalFilterOptions, useHospitals } from '../../hooks/usePlatform'
import { useDebounced } from '../../hooks/useDebounced'
import HospitalForm from '../../components/platform/HospitalForm'
import HospitalTable from '../../components/platform/HospitalTable'
import HospitalToolbar from '../../components/platform/HospitalToolbar'
import type { Hospital, HospitalFilters, HospitalForm as Form } from '../../types/tenant'

const NO_FILTERS: HospitalFilters = { search: '', country: '', subdivision: '' }

/** Onboarding a hospital, finding one again, and deciding what it has bought. */
export default function Hospitals() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<HospitalFilters>(NO_FILTERS)
  const [editing, setEditing] = useState<Hospital | null | undefined>(undefined)

  // Only the search needs settling; picking from a dropdown is already a deliberate act.
  const search = useDebounced(filters.search)
  const hospitals = useHospitals({ ...filters, search })
  const options = useHospitalFilterOptions(filters.country)

  const refresh = () => Promise.all(
    ['hospitals', 'hospital-locations', 'platform-stats'].map((key) =>
      queryClient.invalidateQueries({ queryKey: [key] })))

  const save = useMutation({
    mutationFn: (form: Form) =>
      editing ? updateHospital(editing.id, form) : createHospital(form),
    onSuccess: async () => { setEditing(undefined); await refresh() },
  })
  const toggle = useMutation({
    mutationFn: (hospital: Hospital) => setHospitalActive(hospital.id, !hospital.active),
    onSuccess: refresh,
  })

  const filtered = Boolean(search || filters.country || filters.subdivision)

  return (
    <>
      <div className="page-header appointment-page-header">
        <div>
          <h2>Hospitals</h2>
          <p>Suspending a hospital keeps its data and stops its staff signing in.</p>
        </div>
        <Button variant="contained" startIcon={<AddBusinessOutlinedIcon />}
          onClick={() => setEditing(null)}>Onboard hospital</Button>
      </div>

      {(hospitals.error || toggle.error) && (
        <p className="patient-error">{(hospitals.error || toggle.error)?.message}</p>
      )}

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <HospitalToolbar filters={filters} options={options.data} onChange={setFilters} />
          <Chip size="small" label={filtered
            ? `${hospitals.data?.length ?? 0} matching`
            : `${hospitals.data?.length ?? 0} onboarded`} />
        </div>
        <HospitalTable hospitals={hospitals.data ?? []} busy={toggle.isPending}
          isLoading={hospitals.isLoading}
          emptyMessage={filtered
            ? 'No hospital matches those filters.'
            : 'No hospitals onboarded yet.'}
          onEdit={setEditing} onToggleActive={(hospital) => toggle.mutate(hospital)} />
      </section>

      {editing !== undefined && (
        <HospitalForm hospital={editing} isSaving={save.isPending} error={save.error?.message}
          onClose={() => { save.reset(); setEditing(undefined) }}
          onSave={(form) => save.mutate(form)} />
      )}
    </>
  )
}
