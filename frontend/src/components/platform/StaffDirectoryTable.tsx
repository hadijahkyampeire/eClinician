import { Chip } from '@mui/material'
import type { PlatformStaff } from '../../types/tenant'

export default function StaffDirectoryTable({ rows, isLoading }: {
  rows: PlatformStaff[]
  isLoading: boolean
}) {
  if (isLoading) return <p className="appointment-empty">Loading staff…</p>
  if (!rows.length) return <p className="appointment-empty">No staff accounts here yet.</p>

  return (
    <div className="table-wrap">
      <table className="patient-table">
        <thead><tr>
          <th>Name</th><th>Email</th><th>Role</th><th>Hospital</th><th>Status</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <b>{row.name}</b>
                {row.specialty && <small className="row-note">{row.specialty}</small>}
              </td>
              <td>{row.email}</td>
              <td><Chip size="small" variant="outlined" label={row.roleLabel} /></td>
              <td>{row.hospitalName}</td>
              <td>
                <Chip size="small" label={row.active ? 'Active' : 'Deactivated'}
                  color={row.active ? 'success' : 'default'}
                  variant={row.active ? 'filled' : 'outlined'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
