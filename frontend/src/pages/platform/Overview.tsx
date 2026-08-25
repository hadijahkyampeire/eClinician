import { Link } from 'react-router-dom'
import { Chip } from '@mui/material'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined'
import StatTile from '../../components/platform/StatTile'
import HospitalRollup from '../../components/platform/HospitalRollup'
import { useHospitals, usePlatformPatients, usePlatformStaff, usePlatformStats }
  from '../../hooks/usePlatform'

/** What the platform looks like from above: four counts, then a row per hospital. */
export default function Overview() {
  const stats = usePlatformStats()
  const hospitals = useHospitals()
  const staff = usePlatformStaff()
  const patients = usePlatformPatients()

  const error = stats.error || hospitals.error || staff.error || patients.error

  return (
    <>
      <div className="page-header">
        <h2>System oversight</h2>
        <p>Every hospital on the platform, and how much of it is in use.</p>
      </div>

      {error && <p className="patient-error">{error.message}</p>}

      <div className="stat-grid">
        <StatTile label="Hospitals" value={stats.data?.hospitals} to="/admin/hospitals"
          icon={<ApartmentOutlinedIcon />} />
        <StatTile label="Active hospitals" value={stats.data?.activeHospitals}
          to="/admin/hospitals" icon={<CheckCircleOutlineIcon />} />
        <StatTile label="Staff accounts" value={staff.data?.length} to="/admin/staff"
          icon={<BadgeOutlinedIcon />} />
        <StatTile label="Patients registered" value={patients.data?.length}
          to="/admin/patients" icon={<GroupsOutlinedIcon />} />
      </div>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <div>
            <h3>Hospitals at a glance</h3>
            <p>Size and subscription for each clinic. Open one to change its details.</p>
          </div>
          <Chip size="small" label={`${hospitals.data?.length ?? 0} onboarded`} />
        </div>

        {hospitals.isLoading
          ? <p className="appointment-empty">Loading hospitals…</p>
          : hospitals.data?.length
            ? <div className="rollup-list">
                {hospitals.data.map((hospital) => (
                  <HospitalRollup key={hospital.id} hospital={hospital}
                    staff={staff.data?.filter((row) => row.hospitalId === hospital.id).length}
                    patients={patients.data?.filter((row) =>
                      row.hospitalId === hospital.id).length} />
                ))}
              </div>
            : <p className="appointment-empty">
                No hospitals yet. <Link to="/admin/hospitals">Onboard the first one.</Link>
              </p>}
      </section>
    </>
  )
}
