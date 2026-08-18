import { MODULES, type Hospital } from '../../types/tenant'

interface Props {
  hospitals: Hospital[]
  busy: boolean
  onEdit: (hospital: Hospital) => void
  onToggleActive: (hospital: Hospital) => void
}

export default function HospitalTable({ hospitals, busy, onEdit, onToggleActive }: Props) {
  if (!hospitals.length) {
    return <p className="appointment-empty">No hospitals onboarded yet.</p>
  }
  return (
    <div className="table-wrap">
      <table className="patient-table">
        <thead><tr>
          <th>Hospital</th><th>Identifier</th><th>Subscription</th><th>Status</th><th>Actions</th>
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
              <td>{hospital.enabledModules.length === MODULES.length
                ? 'All modules'
                : hospital.enabledModules.map((key) =>
                    MODULES.find((module) => module.key === key)?.label).join(', ') || 'None'}</td>
              <td>
                <span className={`appointment-status ${hospital.active ? 'completed' : 'cancelled'}`}>
                  {hospital.active ? 'active' : 'suspended'}
                </span>
              </td>
              <td className="table-actions">
                <button className="link-button" disabled={busy}
                  onClick={() => onEdit(hospital)}>Edit</button>
                <button className={`link-button ${hospital.active ? 'danger' : ''}`} disabled={busy}
                  onClick={() => onToggleActive(hospital)}>
                  {hospital.active ? 'Suspend' : 'Restore'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
