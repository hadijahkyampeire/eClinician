import { Link } from 'react-router-dom'
import { Chip } from '@mui/material'
import ModuleChips from './ModuleChips'
import HospitalLocation from './HospitalLocation'
import type { Hospital } from '../../types/tenant'

/** One hospital on the overview: who it is, how big it is, and what it has bought. */
export default function HospitalRollup({ hospital, staff, patients }: {
  hospital: Hospital
  staff: number | undefined
  patients: number | undefined
}) {
  return (
    <div className="rollup">
      <span className="brand-swatch" aria-hidden="true"
        style={{ background: hospital.primaryColor }} />
      <div className="rollup-name">
        <b>{hospital.name}</b>
        <HospitalLocation hospital={hospital} />
      </div>
      <div className="rollup-counts">
        <Link to={`/admin/staff?hospital=${hospital.id}`}>
          <b>{staff ?? '—'}</b> staff
        </Link>
        <Link to={`/admin/patients?hospital=${hospital.id}`}>
          <b>{patients ?? '—'}</b> patients
        </Link>
      </div>
      <ModuleChips hospital={hospital} />
      <Chip size="small" label={hospital.active ? 'Active' : 'Suspended'}
        color={hospital.active ? 'success' : 'default'}
        variant={hospital.active ? 'filled' : 'outlined'} />
    </div>
  )
}
