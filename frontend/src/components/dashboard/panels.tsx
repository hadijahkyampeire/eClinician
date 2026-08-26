import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getAppointments, markAppointmentWaiting, startPatientSession } from '../../api/appointments'
import { getEncounters } from '../../api/encounters'
import { getLabOrders } from '../../api/lab'
import { getCounter, getUnsupplied } from '../../api/pharmacy'
import { useAuth } from '../../auth/AuthContext'
import { byQueueOrder } from '../../lib/queue'
import { Panel, Row } from './Panel'
import { since } from './time'

// The tiles say how many. These say who — and put the next action on the row. A patient's
// name is their chart: clicking it opens the file rather than only the next step.

const IN_THE_BUILDING = ['CHECKED_IN', 'WAITING', 'IN_SESSION']
const LIVE = { refetchInterval: 30_000 }

function useAppointments() {
  const tenantId = useAuth().session?.tenant?.id
  return useQuery({ queryKey: ['appointments', tenantId], queryFn: () => getAppointments(), ...LIVE })
}

/** Who is in the clinic right now: whoever cannot wait first, then the longest wait. */
export function InTheClinic({ act, first }: {
  act?: 'to-room' | 'start-session'
  first?: { label: string; to: string }
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { data = [] } = useAppointments()
  const here = data.filter(a => IN_THE_BUILDING.includes(a.status)).sort(byQueueOrder)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['patients'] })
  }
  const toRoom = useMutation({ mutationFn: markAppointmentWaiting, onSuccess: refresh })
  // Starting a session is the doctor saying "I am seeing this patient now", so it opens
  // the chart. Flipping a status and staying put left them to find the patient again.
  const start = useMutation({
    mutationFn: startPatientSession,
    onSuccess: (appointment) => {
      refresh()
      navigate(`/records?patientId=${appointment.patientId}`)
    },
  })
  const busy = toRoom.isPending || start.isPending

  return (
    <Panel title="In the clinic now" count={here.length} to="/appointments" first={first}
      empty="Nobody is checked in — the waiting room is empty.">
      {here.map(visit => (
        <Row
          key={visit.id}
          primary={visit.patientName}
          to={`/patients/${visit.patientId}`}
          flag={visit.urgent ? 'Urgent' : undefined}
          secondary={visit.reason}
          tone={visit.careStatus === 'LAB' ? 'waiting'
            : visit.status === 'IN_SESSION' ? 'session' : 'waiting'}
          // A visit in session does not mean the patient is in the room — they may be
          // standing at the bench, which is the one thing the queue must not hide.
          meta={visit.careStatus === 'LAB'
            ? 'At the lab'
            : visit.status === 'IN_SESSION'
              ? `In session ${since(visit.sessionStartedAt) ?? ''}`
              : visit.status === 'WAITING'
                ? `Waiting ${since(visit.waitingAt) ?? ''}`
                : `Checked in ${since(visit.checkedInAt) ?? ''}`}
          action={
            act === 'to-room' && visit.status === 'CHECKED_IN' ? (
              <button className="btn small" disabled={busy} onClick={() => toRoom.mutate(visit.id)}>
                Take to the waiting room
              </button>
            ) : act === 'start-session' && visit.status !== 'IN_SESSION'
              && visit.careStatus !== 'LAB' ? (
              <button className="btn small" disabled={busy} onClick={() => start.mutate(visit.patientId)}>
                Start session
              </button>
            ) : null
          }
        />
      ))}
    </Panel>
  )
}

/** Visits opened and not signed off — the clinician's own unfinished work. */
export function UnfinishedNotes({ readOnly }: { readOnly?: boolean }) {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['encounters', tenantId], queryFn: () => getEncounters(), ...LIVE,
  })
  const drafts = data.filter(e => e.status === 'DRAFT')

  return (
    <Panel title="Unfinished notes" count={drafts.length} to="/records" seeAll="All records"
      first={readOnly
        ? { label: 'Manage staff', to: '/staff' }
        : { label: 'Open a patient record', to: '/records' }}
      empty="Nothing half-written — every visit is signed off.">
      {drafts.map(draft => (
        <Row key={draft.id} primary={draft.patientName ?? 'Patient'}
          to={`/patients/${draft.patientId}`}
          secondary={draft.chiefComplaint || 'No complaint recorded yet'}
          // A note left open because its results had not come back is not the same
          // unfinished as one left open at the end of the day.
          // Not "at the lab": the sample may be taken and the patient already back in
          // the queue while the test itself is still running.
          meta={readOnly ? draft.clinicianName
            : draft.labResultsReadyAt ? 'Results ready'
            : draft.sentToLabAt ? 'Awaiting results' : undefined}
          tone={draft.labResultsReadyAt ? 'ready' : 'waiting'}
          action={readOnly ? null : (
            <Link className="btn small" to={`/records?encounterId=${draft.id}`}>
              {draft.labResultsReadyAt ? 'Read results' : 'Continue'}
            </Link>
          )} />
      ))}
    </Panel>
  )
}

/**
 * What the pharmacy could not supply, while the patient is still here to be given
 * something else. A clinician finding this out by chance, after the patient has gone
 * home without their medicine, is the failure this panel exists to prevent.
 */
export function CouldNotBeSupplied() {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['unsupplied', tenantId], queryFn: getUnsupplied, ...LIVE,
  })

  return (
    <Panel title="The pharmacy could not supply" count={data.length} to="/records"
      seeAll="All records"
      first={{ label: 'See who is booked today', to: '/appointments' }}
      empty="Nothing is out of stock. A medicine lands here if the counter cannot fill it.">
      {data.map(order => (
        <Row key={order.id} primary={order.patientName}
          to={`/patients/${order.patientId}`}
          secondary={`${order.medication}${order.notes ? ` — ${order.notes}` : ''}`}
          meta="Still at the counter" tone="waiting"
          action={<Link className="btn small" to={`/records?encounterId=${order.encounterId}`}>
            Prescribe instead</Link>} />
      ))}
    </Panel>
  )
}

/**
 * Who is at the counter. A pharmacist opening the app is looking at a room, and three
 * medicines for one patient is one person standing there rather than three.
 */
export function PendingMedicines() {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['pharmacy-counter', tenantId], queryFn: getCounter, ...LIVE,
  })

  return (
    <Panel title="At the counter" count={data.length} to="/pharmacy" seeAll="Open the queue"
      first={{ label: 'See what has been dispensed', to: '/pharmacy' }}
      empty="Nobody is waiting. A patient lands here the moment a clinician finalizes a visit with medicine on it.">
      {data.map(person => (
        <Row key={person.patientId} primary={person.patientName}
          to={`/patients/${person.patientId}`}
          secondary={person.medicines.map(order => order.medication).join(' · ')}
          meta={person.ready ? 'Ready to go' : undefined}
          tone={person.ready ? 'ready' : undefined}
          action={<Link className="btn small" to="/pharmacy">
            {person.ready ? 'Check out' : 'Dispense'}</Link>} />
      ))}
    </Panel>
  )
}

/** Tests waiting to be run. */
export function PendingTests() {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['lab-orders', tenantId, 'PENDING'],
    queryFn: () => getLabOrders('PENDING'), ...LIVE,
  })

  return (
    <Panel title="Waiting to be run" count={data.length} to="/laboratory" seeAll="Open the queue"
      first={{ label: 'See resulted tests', to: '/laboratory' }}
      empty="No tests waiting. One lands here the moment a clinician finalizes a visit.">
      {data.map(order => (
        <Row key={order.id} primary={order.testName} secondary={order.patientName}
          action={<Link className="btn small" to="/laboratory">Record result</Link>} />
      ))}
    </Panel>
  )
}
