import { Chip } from '@mui/material'
import HospitalFilter from '../../components/platform/HospitalFilter'
import StaffDirectoryTable from '../../components/platform/StaffDirectoryTable'
import { useHospitalFilter } from '../../hooks/useHospitalFilter'
import { useHospitals, usePlatformStaff } from '../../hooks/usePlatform'

/**
 * Who works where, across every hospital. Read-only: hiring, deactivating and correcting
 * an account belong to the hospital's own administrator, inside their tenant.
 */
export default function StaffDirectory() {
  const hospitals = useHospitals()
  const staff = usePlatformStaff()
  const { hospitalId, setHospitalId, matches } = useHospitalFilter()
  const rows = matches(staff.data)

  return (
    <>
      <div className="page-header">
        <h2>Staff</h2>
        <p>Every account on the platform, and the hospital it belongs to.</p>
      </div>

      {staff.error && <p className="patient-error">{staff.error.message}</p>}

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <HospitalFilter hospitals={hospitals.data ?? []} value={hospitalId}
            onChange={setHospitalId} />
          <Chip size="small" label={`${rows.length} accounts`} />
        </div>
        <StaffDirectoryTable rows={rows} isLoading={staff.isLoading} />
      </section>
    </>
  )
}
