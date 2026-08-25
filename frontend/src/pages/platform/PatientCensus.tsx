import { Alert, Chip } from '@mui/material'
import HospitalFilter from '../../components/platform/HospitalFilter'
import PatientCensusTable from '../../components/platform/PatientCensusTable'
import { useHospitalFilter } from '../../hooks/useHospitalFilter'
import { useHospitals, usePlatformPatients } from '../../hooks/usePlatform'

/**
 * How many patients each hospital carries, and how many are in the building right now.
 *
 * The rows are deliberately de-identified. The platform operator needs the size of a
 * clinic to run the platform; they have no reason to learn who its patients are, so no
 * name, phone or government ID crosses out of the hospital that owns the record.
 */
export default function PatientCensus() {
  const hospitals = useHospitals()
  const patients = usePlatformPatients()
  const { hospitalId, setHospitalId, matches } = useHospitalFilter()
  const rows = matches(patients.data)
  const inCare = rows.filter((row) => row.careStatus).length

  return (
    <>
      <div className="page-header">
        <h2>Patients</h2>
        <p>A census by hospital, not a clinical record.</p>
      </div>

      {patients.error && <p className="patient-error">{patients.error.message}</p>}

      <Alert severity="info" sx={{ mb: 2.5 }}>
        Patient identities stay inside the hospital that registered them. The console sees
        counts, demographics and a reference — never a name, a phone number or an ID.
      </Alert>

      <section className="card appointment-section">
        <div className="appointment-section-heading">
          <HospitalFilter hospitals={hospitals.data ?? []} value={hospitalId}
            onChange={setHospitalId} />
          <div className="census-counts">
            <Chip size="small" label={`${rows.length} registered`} />
            <Chip size="small" color="primary" variant="outlined"
              label={`${inCare} in care now`} />
          </div>
        </div>
        <PatientCensusTable rows={rows} isLoading={patients.isLoading} />
      </section>
    </>
  )
}
