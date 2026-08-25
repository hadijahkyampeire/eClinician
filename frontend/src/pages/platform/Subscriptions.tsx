import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Chip, Tooltip } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import { updateHospital } from '../../api/platform'
import { useHospitals } from '../../hooks/usePlatform'
import HospitalForm from '../../components/platform/HospitalForm'
import { MODULES, type Hospital, type HospitalForm as Form } from '../../types/tenant'

/** Who has bought what, as a grid — the one view that compares plans side by side. */
export default function Subscriptions() {
  const queryClient = useQueryClient()
  const hospitals = useHospitals()
  const [editing, setEditing] = useState<Hospital | null>(null)

  const save = useMutation({
    mutationFn: (form: Form) => updateHospital(editing!.id, form),
    onSuccess: async () => {
      setEditing(null)
      await queryClient.invalidateQueries({ queryKey: ['hospitals'] })
    },
  })

  return (
    <>
      <div className="page-header">
        <h2>Subscriptions</h2>
        <p>A module a hospital has not bought never appears in its staff's navigation.</p>
      </div>

      {hospitals.error && <p className="patient-error">{hospitals.error.message}</p>}

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div><h3>Plan by hospital</h3></div>
          <Chip size="small" label={`${MODULES.length} modules`} />
        </div>

        <div className="table-wrap">
          <table className="patient-table subscription-table">
            <thead><tr>
              <th>Hospital</th>
              {MODULES.map((module) => <th key={module.key}>{module.label}</th>)}
              <th>Actions</th>
            </tr></thead>
            <tbody>
              {(hospitals.data ?? []).map((hospital) => (
                <tr key={hospital.id}>
                  <td>
                    <span className="brand-swatch" aria-hidden="true"
                      style={{ background: hospital.primaryColor }} />
                    {hospital.name}
                  </td>
                  {MODULES.map((module) => (
                    <td key={module.key}>
                      <Tooltip title={hospital.enabledModules.includes(module.key)
                        ? `${module.label} included` : `${module.label} not bought`}>
                        {hospital.enabledModules.includes(module.key)
                          ? <CheckCircleIcon fontSize="small" color="success" />
                          : <RemoveCircleOutlineIcon fontSize="small" color="disabled" />}
                      </Tooltip>
                    </td>
                  ))}
                  <td className="table-actions">
                    <Button size="small" variant="outlined" startIcon={<TuneOutlinedIcon />}
                      onClick={() => setEditing(hospital)}>Change plan</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editing && (
        <HospitalForm hospital={editing} isSaving={save.isPending} error={save.error?.message}
          onClose={() => { save.reset(); setEditing(null) }}
          onSave={(form) => save.mutate(form)} />
      )}
    </>
  )
}
