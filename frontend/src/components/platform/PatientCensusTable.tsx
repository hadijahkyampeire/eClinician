import { Chip } from '@mui/material'
import type { PlatformPatient } from '../../types/tenant'

const CARE_LABELS: Record<string, string> = {
  CHECKED_IN: 'Checked in',
  WAITING: 'Waiting',
  IN_SESSION: 'In session',
  PHARMACY: 'Pharmacy',
}

export default function PatientCensusTable({ rows, isLoading }: {
  rows: PlatformPatient[]
  isLoading: boolean
}) {
  if (isLoading) return <p className="appointment-empty">Loading the census…</p>
  if (!rows.length) return <p className="appointment-empty">No patients registered here yet.</p>

  return (
    <div className="table-wrap">
      <table className="patient-table">
        <thead><tr>
          <th>Reference</th><th>Sex</th><th>Age</th><th>Hospital</th>
          <th>Registered</th><th>In care</th>
        </tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.reference}>
              <td><code>{row.reference}</code></td>
              <td>{row.sex || '—'}</td>
              <td>{row.age ?? '—'}</td>
              <td>{row.hospitalName}</td>
              <td>{new Intl.DateTimeFormat('en', {
                year: 'numeric', month: 'short', day: 'numeric',
              }).format(new Date(row.registeredAt))}</td>
              <td>
                {row.careStatus
                  ? <Chip size="small" color="primary" variant="outlined"
                      label={CARE_LABELS[row.careStatus] ?? row.careStatus} />
                  : <span className="care-status none">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
