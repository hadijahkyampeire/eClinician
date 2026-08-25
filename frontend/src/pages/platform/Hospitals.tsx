import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Chip } from '@mui/material'
import AddBusinessOutlinedIcon from '@mui/icons-material/AddBusinessOutlined'
import { createHospital, setHospitalActive, updateHospital } from '../../api/platform'
import { useHospitals } from '../../hooks/usePlatform'
import HospitalForm from '../../components/platform/HospitalForm'
import HospitalTable from '../../components/platform/HospitalTable'
import type { Hospital, HospitalForm as Form } from '../../types/tenant'

/** Onboarding a hospital, correcting its details, and deciding what it has bought. */
export default function Hospitals() {
  const queryClient = useQueryClient()
  const hospitals = useHospitals()
  const [editing, setEditing] = useState<Hospital | null | undefined>(undefined)

  const refresh = () => Promise.all(
    ['hospitals', 'platform-stats'].map((key) =>
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
          <div>
            <h3>Onboarded clinics</h3>
            <p>Only the name, colour and subscription are the platform's to change.</p>
          </div>
          <Chip size="small" label={`${hospitals.data?.length ?? 0} onboarded`} />
        </div>
        <HospitalTable hospitals={hospitals.data ?? []} busy={toggle.isPending}
          isLoading={hospitals.isLoading}
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
