import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getAppointments, markAppointmentWaiting, startPatientSession } from '../../api/appointments'
import { getEncounters } from '../../api/encounters'
import { getLabOrders } from '../../api/lab'
import { getPrescriptions } from '../../api/pharmacy'
import { useAuth } from '../../auth/AuthContext'
import type { Appointment } from '../../types/appointment'
import { Panel, Row } from './Panel'
import { since } from './time'

// The tiles say how many. These say who — and put the next action on the row.

const IN_THE_BUILDING = ['CHECKED_IN', 'WAITING', 'IN_SESSION']
const LIVE = { refetchInterval: 30_000 }

function useAppointments() {
  const tenantId = useAuth().session?.tenant?.id
  return useQuery({ queryKey: ['appointments', tenantId], queryFn: () => getAppointments(), ...LIVE })
}

function byArrival(a: Appointment, b: Appointment) {
  const queueTime = (value: Appointment) => value.status === 'WAITING'
    ? value.waitingAt ?? value.checkedInAt ?? value.scheduledAt
    : value.checkedInAt ?? value.scheduledAt
  return queueTime(a).localeCompare(queueTime(b))
}

/** Who is in the clinic right now, longest wait first. */
export function InTheClinic({ act, first }: {
  act?: 'to-room' | 'start-session'
  first?: { label: string; to: string }
}) {
  const queryClient = useQueryClient()
  const { data = [] } = useAppointments()
  const here = data.filter(a => IN_THE_BUILDING.includes(a.status)).sort(byArrival)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    void queryClient.invalidateQueries({ queryKey: ['patients'] })
  }
  const toRoom = useMutation({ mutationFn: markAppointmentWaiting, onSuccess: refresh })
  const start = useMutation({ mutationFn: startPatientSession, onSuccess: refresh })
  const busy = toRoom.isPending || start.isPending

  return (
    <Panel title="In the clinic now" count={here.length} to="/appointments" first={first}
      empty="Nobody is checked in — the waiting room is empty.">
      {here.map(visit => (
        <Row
          key={visit.id}
          primary={visit.patientName}
          secondary={visit.reason}
          tone={visit.status === 'IN_SESSION' ? 'session' : 'waiting'}
          meta={visit.status === 'IN_SESSION'
            ? `In session ${since(visit.sessionStartedAt) ?? ''}`
            : visit.status === 'WAITING'
              ? `Waiting ${since(visit.waitingAt) ?? ''}`
              : `Checked in ${since(visit.checkedInAt) ?? ''}`}
          action={
            act === 'to-room' && visit.status === 'CHECKED_IN' ? (
              <button className="btn small" disabled={busy} onClick={() => toRoom.mutate(visit.id)}>
                Take to the waiting room
              </button>
            ) : act === 'start-session' && visit.status !== 'IN_SESSION' ? (
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
          secondary={draft.chiefComplaint || 'No complaint recorded yet'}
          meta={readOnly ? draft.clinicianName : undefined}
          action={readOnly ? null : (
            <Link className="btn small" to={`/records?encounterId=${draft.id}`}>Continue</Link>
          )} />
      ))}
    </Panel>
  )
}

/** Medicines waiting to be handed over. */
export function PendingMedicines() {
  const tenantId = useAuth().session?.tenant?.id
  const { data = [] } = useQuery({
    queryKey: ['prescriptions', tenantId, 'PENDING'],
    queryFn: () => getPrescriptions('PENDING'), ...LIVE,
  })

  return (
    <Panel title="Waiting to be dispensed" count={data.length} to="/pharmacy" seeAll="Open the queue"
      first={{ label: 'See what has been dispensed', to: '/pharmacy' }}
      empty="The queue is clear. A medicine lands here the moment a clinician finalizes a visit.">
      {data.map(order => (
        <Row key={order.id} primary={order.medication} secondary={order.patientName}
          action={<Link className="btn small" to="/pharmacy">Dispense</Link>} />
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
