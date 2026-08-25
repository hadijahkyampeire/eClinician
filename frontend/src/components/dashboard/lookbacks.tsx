import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAppointments } from '../../api/appointments'
import { getEncounters } from '../../api/encounters'
import { getLabOrders } from '../../api/lab'
import { getPrescriptions } from '../../api/pharmacy'
import { useAuth } from '../../auth/AuthContext'
import { Lookback, When } from './Lookback'
import { TODAY, covers, type Range } from './range'

// One look-back per role, all reading the window the same way. Nothing here is a new
// endpoint: the API already answers with the whole history a role is allowed to see, so
// the window is applied to what came back rather than asked for a page at a time. At
// clinic scale that is the cheaper trade; a chain of hospitals would push it to the query.

const badge = (status: string) =>
  <span className={`appointment-status ${status.toLowerCase()}`}>
    {status.replaceAll('_', ' ').toLowerCase()}
  </span>

/** The front desk's own record: everyone booked or walked in, whatever became of them. */
export function AppointmentsLookback() {
  const [range, setRange] = useState<Range>(TODAY)
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['appointments', tenantId], queryFn: () => getAppointments(),
  })
  const rows = data.filter(a => covers(range, a.scheduledAt))
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))

  return (
    <Lookback title="Appointments" count={rows.length} range={range} onRange={setRange}
      blurb="Booked, arrived, seen and cancelled — open a patient to see the rest of their file."
      empty="No appointments in this period. Widen the window or pick a date."
      head={<><th>Patient</th><th>Scheduled</th><th>Clinician</th><th>Reason</th>
        <th>Checked in</th><th>Status</th></>}>
      {rows.map(visit => (
        <tr key={visit.id}>
          <td><Link className="patient-name-link" to={`/patients/${visit.patientId}`}>
            {visit.patientName}</Link></td>
          <td><When iso={visit.scheduledAt} /></td>
          <td>{visit.doctorName ?? 'Unassigned'}</td>
          <td>{visit.reason || '—'}</td>
          <td><When iso={visit.checkedInAt} /></td>
          <td>{badge(visit.status)}</td>
        </tr>
      ))}
    </Lookback>
  )
}

/** A clinician's own visits. The API scopes this list to them without being asked. */
export function VisitsLookback() {
  const [range, setRange] = useState<Range>(TODAY)
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['encounters', tenantId], queryFn: () => getEncounters(),
  })
  const rows = data.filter(e => covers(range, e.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Lookback title="Visits you have documented" count={rows.length} range={range} onRange={setRange}
      blurb="Every note you opened in this period — open one to read the whole record back."
      empty="No visits in this period. Widen the window or pick a date."
      head={<><th>Patient</th><th>Complaint</th><th>Diagnosis</th><th>Opened</th>
        <th>Status</th><th /></>}>
      {rows.map(visit => (
        <tr key={visit.id}>
          <td>{visit.patientName}</td>
          <td>{visit.chiefComplaint || '—'}</td>
          <td>{visit.diagnosis || '—'}</td>
          <td><When iso={visit.createdAt} /></td>
          <td>{badge(visit.status)}</td>
          <td className="table-actions">
            <Link className="btn small ghost" to={`/records?encounterId=${visit.id}`}>Open</Link>
          </td>
        </tr>
      ))}
    </Lookback>
  )
}

/**
 * The bench's own record. There is no link to the patient here on purpose: a technician
 * has no patient directory, and the API refuses them one — a link that 403s is worse than
 * no link.
 */
export function LabLookback() {
  const [range, setRange] = useState<Range>(TODAY)
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['lab-orders', tenantId, 'ALL'], queryFn: () => getLabOrders(),
  })
  const rows = data.filter(o => covers(range, o.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Lookback title="Tests" count={rows.length} range={range} onRange={setRange}
      blurb="Everything asked of the laboratory in this period, run or not."
      empty="No tests were requested in this period. Widen the window or pick a date."
      head={<><th>Test</th><th>Patient</th><th>Requested</th><th>Result</th>
        <th>Resulted</th><th>Status</th></>}>
      {rows.map(order => (
        <tr key={order.id}>
          <td>{order.testName}</td>
          <td>{order.patientName}</td>
          <td><When iso={order.createdAt} /></td>
          <td>{order.result || order.notes || '—'}</td>
          <td><When iso={order.resultedAt} /></td>
          <td>{badge(order.status)}</td>
        </tr>
      ))}
    </Lookback>
  )
}

/** The counter's own record — same reasoning as the bench about the missing link. */
export function PharmacyLookback() {
  const [range, setRange] = useState<Range>(TODAY)
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['prescriptions', tenantId, 'ALL'], queryFn: () => getPrescriptions(),
  })
  const rows = data.filter(p => covers(range, p.createdAt))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Lookback title="Prescriptions" count={rows.length} range={range} onRange={setRange}
      blurb="Everything raised at the counter in this period, dispensed or not."
      empty="No prescriptions were raised in this period. Widen the window or pick a date."
      head={<><th>Medicine</th><th>Patient</th><th>Raised</th><th>Note</th>
        <th>Dispensed</th><th>Status</th></>}>
      {rows.map(order => (
        <tr key={order.id}>
          <td>{order.medication}</td>
          <td>{order.patientName}</td>
          <td><When iso={order.createdAt} /></td>
          <td>{order.notes || '—'}</td>
          <td><When iso={order.dispensedAt} /></td>
          <td>{badge(order.status)}</td>
        </tr>
      ))}
    </Lookback>
  )
}
