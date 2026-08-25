import { Button, Chip, Stack, Tooltip } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutlined'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutlined'
import ModuleChips from './ModuleChips'
import HospitalLocation from './HospitalLocation'
import type { Hospital } from '../../types/tenant'

interface Props {
  hospitals: Hospital[]
  busy: boolean
  isLoading: boolean
  /** Says whether the list is empty because nothing exists or because a filter is on. */
  emptyMessage: string
  onEdit: (hospital: Hospital) => void
  onToggleActive: (hospital: Hospital) => void
}

export default function HospitalTable({
  hospitals, busy, isLoading, emptyMessage, onEdit, onToggleActive,
}: Props) {
  if (isLoading) return <p className="appointment-empty">Loading hospitals…</p>
  if (!hospitals.length) return <p className="appointment-empty">{emptyMessage}</p>

  return (
    <div className="table-wrap">
      <table className="patient-table">
        <thead><tr>
          <th>Hospital</th><th>Identifier</th><th>Location</th><th>Subscription</th>
          <th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          {hospitals.map((hospital) => (
            <tr key={hospital.id}>
              <td>
                <span className="brand-swatch" aria-hidden="true"
                  style={{ background: hospital.primaryColor }} />
                {hospital.name}
              </td>
              <td><code>{hospital.id}</code></td>
              <td><HospitalLocation hospital={hospital} /></td>
              <td><ModuleChips hospital={hospital} /></td>
              <td>
                <Chip size="small" label={hospital.active ? 'Active' : 'Suspended'}
                  color={hospital.active ? 'success' : 'default'}
                  variant={hospital.active ? 'filled' : 'outlined'} />
              </td>
              <td className="table-actions">
                <Stack direction="row" spacing={1}>
                  <Button size="small" variant="outlined" disabled={busy}
                    startIcon={<EditOutlinedIcon />} onClick={() => onEdit(hospital)}>
                    Edit
                  </Button>
                  <Tooltip title={hospital.active
                    ? 'Keeps the data, stops its staff signing in'
                    : 'Lets its staff sign in again'}>
                    <span>
                      <Button size="small" variant="outlined" disabled={busy}
                        color={hospital.active ? 'error' : 'success'}
                        startIcon={hospital.active
                          ? <PauseCircleOutlineIcon /> : <PlayCircleOutlineIcon />}
                        onClick={() => onToggleActive(hospital)}>
                        {hospital.active ? 'Suspend' : 'Restore'}
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
