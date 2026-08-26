import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getEncounters } from '../../api/encounters'
import { useAuth } from '../../auth/AuthContext'
import { ageOf } from '../../lib/age'
import type { Patient } from '../../types/patient'

/**
 * Who the clinician is about to see, above the form they are about to fill. The record
 * already holds all of this; the point is that they should not have to go and get it
 * while the patient is sitting in front of them.
 */
export default function PatientContext({ patient, currentEncounterId }: {
  patient: Patient
  currentEncounterId?: string
}) {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['encounters', tenantId, patient.id],
    queryFn: () => getEncounters(patient.id),
    enabled: Boolean(tenantId && patient.id),
  })
  const previous = data.filter(encounter => encounter.id !== currentEncounterId).slice(0, 3)

  return (
    <section className="patient-context">
      <div className="patient-context-head">
        <div>
          <h3>{patient.firstName} {patient.lastName}</h3>
          <p>{[ageOf(patient.dateOfBirth), sexOf(patient.sex), patient.phone]
            .filter(Boolean).join(' · ')}</p>
        </div>
        <Link className="btn ghost" to={`/patients/${patient.id}`}>Full record</Link>
      </div>

      <dl>
        {/* Where someone lives is clinical context: an outbreak, a water source, a season
            of one illness in one district. The desk already asked for it. */}
        <div><dt>Lives</dt><dd>{placeOf(patient) || 'Not recorded'}</dd></div>
        <div><dt>Previous visits</dt>
          <dd>{data.length ? `${data.length} on record` : 'First recorded visit'}</dd></div>
      </dl>

      {previous.length > 0 && (
        <div className="patient-context-history">
          <span className="patient-context-label">Seen before for</span>
          <ul>
            {previous.map(encounter => (
              <li key={encounter.id}>
                <Link to={`/records?encounterId=${encounter.id}`}>
                  {encounter.chiefComplaint || 'Visit'}
                  <small>{onDay(encounter.finalizedAt || encounter.updatedAt)}</small>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

const sexOf = (sex: string | null) =>
  sex ? sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase() : null

const placeOf = (patient: Patient) =>
  [patient.addressLine, patient.city, patient.district, patient.stateProvince, patient.country]
    .filter(Boolean).join(', ')

const onDay = (value: string) => new Intl.DateTimeFormat('en', {
  year: 'numeric', month: 'short', day: 'numeric',
}).format(new Date(value))
