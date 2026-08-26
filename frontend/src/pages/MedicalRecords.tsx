import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  draftEncounterSummary, finalizeEncounter, getEncounter, getEncounters, saveEncounter,
  sendEncounterToLab,
} from '../api/encounters'
import { getAppointments } from '../api/appointments'
import { getPatient } from '../api/patients'
import { useAuth } from '../auth/AuthContext'
import LabTrip from '../components/records/LabTrip'
import OrderPicker from '../components/records/OrderPicker'
import PatientContext from '../components/records/PatientContext'
import { useLabTests, useMedications } from '../hooks/useCatalog'
import { derivedVitals, formatBloodPressure } from '../lib/vitals'
import type { Encounter, EncounterForm } from '../types/encounter'

const emptyForm: EncounterForm = {
  patientId: '', appointmentId: '', chiefComplaint: '',
  bloodPressure: '', temperatureCelsius: '', pulseBpm: '', weightKg: '', heightCm: '', symptoms: '',
  examinationNotes: '', diagnosis: '', treatmentPlan: '', prescriptions: '', labRequests: '',
  visitSummary: '',
}

export default function MedicalRecords() {
  const [params] = useSearchParams()
  const patientId = params.get('patientId') || ''
  const encounterId = params.get('encounterId') || ''
  return patientId || encounterId
    ? <EncounterEditor patientId={patientId} encounterId={encounterId} />
    : <RecordList />
}

function RecordList() {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['encounters', tenantId], queryFn: () => getEncounters(),
    enabled: Boolean(tenantId),
  })
  return <>
    <div className="page-header"><h2>Medical Records</h2><p>Longitudinal clinical encounters</p></div>
    <section className="card record-list-card">
      <div className="record-list-heading"><h3>Clinical encounters</h3><span>{data.length} records</span></div>
      {isLoading ? <p className="record-empty">Loading records...</p>
        : error ? <p className="patient-error">{error.message}</p>
        : data.length ? <div className="record-list">{data.map(record =>
          <RecordRow key={record.id} record={record} />)}</div>
        : <p className="record-empty">No clinical encounters have been documented yet.</p>}
    </section>
  </>
}

function RecordRow({ record }: { record: Encounter }) {
  return <Link className="record-row" to={`/records?encounterId=${record.id}`}>
    <div><b>{record.patientName}</b><small>{record.chiefComplaint || 'No chief complaint recorded'}</small></div>
    <div><span className={`record-status ${record.status.toLowerCase()}`}>{record.status.toLowerCase()}</span>
      <time>{formatDateTime(record.finalizedAt || record.updatedAt)}</time></div>
  </Link>
}

function EncounterEditor({ patientId: routePatientId, encounterId }: {
  patientId: string; encounterId: string
}) {
  const { session } = useAuth()
  const tenantId = session?.tenant?.id
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(emptyForm)

  // Reference lists, held for the session. Grouped by what a clinician is treating, so
  // the dropdown is scannable rather than 36 names in alphabetical order.
  const medications = useMedications()
  const labTests = useLabTests()
  const medicationOptions = (medications.data ?? []).map(item => ({
    label: item.label, group: item.category ?? 'Other',
  }))
  const labTestOptions = (labTests.data ?? []).map(item => ({
    label: item.name, group: item.category ?? 'Other',
  }))
  const [savedId, setSavedId] = useState(encounterId)
  const [message, setMessage] = useState('')
  /**
   * Which action is running, so a button says what it is doing rather than every button
   * greying out together. The ref is the guard: `busy` is state, so it does not take
   * effect until the next render, and two clicks inside one tick both got past it — both
   * posting a new note for the same appointment, and the second losing to the unique
   * index on it.
   */
  const [busy, setBusy] = useState<'' | 'draft' | 'lab' | 'finalize' | 'summary'>('')
  const running = useRef(false)

  /** The note being edited: whichever the URL names, or the one just created. */
  const noteId = encounterId || savedId

  /** Refuses a second click while the first is still in the air, and always lets go. */
  async function once(action: typeof busy, work: () => Promise<void>) {
    if (running.current) return
    running.current = true
    setBusy(action); setMessage('')
    try {
      await work()
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Something went wrong')
    } finally {
      running.current = false
      setBusy('')
    }
  }
  const encounterQuery = useQuery({
    queryKey: ['encounter', tenantId, encounterId],
    queryFn: () => getEncounter(encounterId), enabled: Boolean(tenantId && encounterId),
  })
  const patientId = routePatientId || encounterQuery.data?.patientId || ''
  const patientQuery = useQuery({
    queryKey: ['patient', tenantId, patientId], queryFn: () => getPatient(patientId),
    enabled: Boolean(tenantId && patientId),
  })
  const appointmentsQuery = useQuery({
    queryKey: ['appointments', tenantId, patientId],
    queryFn: () => getAppointments(patientId), enabled: Boolean(tenantId && patientId),
  })
  const activeAppointment = appointmentsQuery.data?.find(value => value.status === 'IN_SESSION')

  /*
   * A visit can be started more than once — a patient sent to the lab rejoins the queue
   * and is called back in — and the note they left behind is the one to come back to.
   * Without this the second start opens a blank form over an existing draft.
   */
  const patientEncounters = useQuery({
    queryKey: ['encounters', tenantId, patientId],
    queryFn: () => getEncounters(patientId), enabled: Boolean(tenantId && patientId && !encounterId),
  })
  const openNote = patientEncounters.data?.find(value =>
    value.status === 'DRAFT' && value.appointmentId === activeAppointment?.id)

  useEffect(() => {
    if (openNote) navigate(`/records?encounterId=${openNote.id}`, { replace: true })
  }, [navigate, openNote])

  useEffect(() => {
    // Populate the editable local draft when the requested server record arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (encounterQuery.data) setForm(toForm(encounterQuery.data))
  }, [encounterQuery.data])
  useEffect(() => {
    // Seed a new record after the active appointment query resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!encounterId && patientId) setForm(value => ({ ...value, patientId,
      appointmentId: activeAppointment?.id || value.appointmentId || '' }))
  }, [activeAppointment?.id, encounterId, patientId])

  /*
   * Signed off is not the same as gone. Between finalizing and the patient walking out
   * they are still in the building — at the counter, or coming back from the bench — and
   * a clinician who spots a wrong dose in that window has to be able to fix it. Their
   * care status is exactly "are they still here", so it is what decides.
   */
  const signed = encounterQuery.data?.status === 'FINALIZED'
  const correcting = signed && Boolean(patientQuery.data?.activeCareStatus)
  const locked = signed && !correcting
  // Sent, and nothing back yet: sending the same tests again would only raise duplicates.
  const awaitingLab = Boolean(encounterQuery.data?.sentToLabAt)
    && !encounterQuery.data?.labResultsReadyAt
  const set = (field: keyof EncounterForm, value: string) =>
    setForm(current => ({ ...current, [field]: value }))

  function persist(finalize: boolean) {
    if (!tenantId) return
    return once(finalize ? 'finalize' : 'draft', async () => {
      const saved = await saveEncounter(form, noteId || undefined)
      setSavedId(saved.id)
      if (finalize) {
        await finalizeEncounter(saved.id)
        await queryClient.invalidateQueries()
        navigate(`/patients/${saved.patientId}`)
      } else {
        await queryClient.invalidateQueries()
        setMessage(correcting ? 'Correction saved' : 'Draft saved')
        navigate(`/records?encounterId=${saved.id}`, { replace: true })
        await queryClient.invalidateQueries({ queryKey: ['encounters'] })
      }
    })
  }
  const submit = (event: FormEvent) => { event.preventDefault(); void persist(false) }

  /**
   * Walks the patient to the bench without ending the visit. Saved first, because the
   * orders are raised from what the note says, not from what is on screen unsent.
   */
  function sendToLab() {
    if (!tenantId) return
    return once('lab', async () => {
      const saved = await saveEncounter(form, noteId || undefined)
      setSavedId(saved.id)
      await sendEncounterToLab(saved.id)
      await queryClient.invalidateQueries()
      setMessage('Sent to the lab — this note stays open until the results come back')
      navigate(`/records?encounterId=${saved.id}`, { replace: true })
    })
  }

  /**
   * Saves first so the summarizer reads what is on screen, then drops its draft into the
   * field. It stays editable: the clinician signs the record, not the model.
   */
  function draftSummary() {
    if (!tenantId) return
    return once('summary', async () => {
      const saved = await saveEncounter(form, noteId || undefined)
      setSavedId(saved.id)
      const drafted = await draftEncounterSummary(saved.id)
      setForm(current => ({ ...current, visitSummary: drafted.visitSummary || '' }))
      setMessage('Summary drafted — read it before you finalize')
      navigate(`/records?encounterId=${saved.id}`, { replace: true })
    })
  }

  if (encounterQuery.isLoading || patientQuery.isLoading || patientEncounters.isLoading) {
    return <p>Loading clinical record...</p>
  }
  if (!patientId || (!encounterId && !activeAppointment)) return <div className="card record-empty">
    A patient must have an active clinical session before an encounter can be documented.
  </div>

  return <div className="encounter-page">
    <Link className="detail-back-link" to={patientId ? `/patients/${patientId}` : '/records'}>← Back to patient</Link>
    <div className="page-header"><h2>{signed ? 'Clinical encounter' : 'Document clinical encounter'}</h2>
      <p>{patientQuery.data ? `${patientQuery.data.firstName} ${patientQuery.data.lastName}` : encounterQuery.data?.patientName}</p></div>
    {locked && <div className="record-locked">
      Finalized {formatDateTime(encounterQuery.data!.finalizedAt!)} · The patient has left
      and this record is read-only.</div>}
    {correcting && <div className="record-correcting">
      Signed off {formatDateTime(encounterQuery.data!.finalizedAt!)} ·{' '}
      {patientQuery.data?.firstName} is still in the building, so this can still be put
      right. A correction overwrites what is here rather than being filed beside it.</div>}
    {patientQuery.data
      && <PatientContext patient={patientQuery.data} currentEncounterId={savedId || encounterId} />}
    {encounterQuery.data && <LabTrip encounter={encounterQuery.data} />}
    <form className="encounter-form" onSubmit={submit}>
      <FormSection title="Visit overview">
        {/* Not a field: the API records whoever's token signed the request. */}
        <Field label="Clinician" value={encounterQuery.data?.clinicianName || session?.user.name || ''} onChange={() => {}} disabled />
        <Field label="Chief complaint" value={form.chiefComplaint} onChange={v => set('chiefComplaint', v)} wide disabled={locked} />
      </FormSection>
      <FormSection title="Vitals">
        <Field label="Blood pressure" placeholder="120/80" value={form.bloodPressure} onChange={v => set('bloodPressure', v)} disabled={locked} />
        <Field label="Temperature (°C)" type="number" value={form.temperatureCelsius} onChange={v => set('temperatureCelsius', v)} disabled={locked} />
        <Field label="Pulse (bpm)" type="number" value={form.pulseBpm} onChange={v => set('pulseBpm', v)} disabled={locked} />
        <Field label="Weight (kg)" type="number" value={form.weightKg} onChange={v => set('weightKg', v)} disabled={locked} />
        <Field label="Height (cm)" type="number" value={form.heightCm} onChange={v => set('heightCm', v)} disabled={locked} />
        <Derived vitals={form} />
      </FormSection>
      <FormSection title="Clinical assessment">
        <TextField label="Symptoms & history" value={form.symptoms} onChange={v => set('symptoms', v)} disabled={locked} />
        <TextField label="Examination notes" value={form.examinationNotes} onChange={v => set('examinationNotes', v)} disabled={locked} />
        <TextField label="Diagnosis" value={form.diagnosis} onChange={v => set('diagnosis', v)} required disabled={locked} />
        <TextField label="Treatment plan" value={form.treatmentPlan} onChange={v => set('treatmentPlan', v)} required disabled={locked} />
      </FormSection>
      <FormSection title="Orders">
        {/* Picked from the catalogue, or typed if the clinic stocks something it has
            never heard of — the list suggests, it does not fence. */}
        <OrderPicker label="Prescriptions" addLabel="Add medicine" disabled={locked}
          value={form.prescriptions} onChange={v => set('prescriptions', v)}
          options={medicationOptions} loading={medications.isLoading}
          detailLabel="How to take it" detailHint="1 tablet 3 times daily for 5 days" />
        <OrderPicker label="Lab requests" addLabel="Add test" disabled={locked}
          value={form.labRequests} onChange={v => set('labRequests', v)}
          options={labTestOptions} loading={labTests.isLoading} />
      </FormSection>
      <FormSection title="Visit summary">
        <div className="summary-heading form-field-wide">
          <p>Drafted from the notes above, then edited and signed by you.</p>
          {!locked && <button type="button" className="btn ghost" disabled={busy === 'summary'}
            onClick={() => void draftSummary()}>
            {busy === 'summary' ? 'Working...'
              : form.visitSummary ? 'Redraft with AI' : 'Draft with AI'}
          </button>}
        </div>
        <TextField label="Summary" hint="Yours to correct — the draft is a starting point"
          value={form.visitSummary} onChange={v => set('visitSummary', v)} disabled={locked} />
      </FormSection>
      {message && <p className={message.startsWith('Draft saved') || message.startsWith('Summary drafted')
        ? 'record-success' : 'patient-error'}>{message}</p>}
      {/* Only the button that was pressed goes quiet. Greying all four out said "the
          screen is busy" when the honest answer is "this one thing is". A second action
          during that moment is refused by the guard in `once` rather than by disabling
          everything, which is what actually keeps two saves out of the air at once. */}
      {/* A signed note is corrected, not re-signed: it is already finalized, the visit is
          already closed, and the orders it raised are already out. */}
      {correcting && <div className="encounter-actions">
        <button className="btn" disabled={busy === 'draft'}>
          {busy === 'draft' ? 'Saving...' : 'Save correction'}</button>
      </div>}
      {!signed && <div className="encounter-actions">
        <button className="btn ghost" disabled={busy === 'draft'}>
          {busy === 'draft' ? 'Saving...' : 'Save draft'}</button>
        {/* The visit pauses here rather than ending: no diagnosis is asked for, because
            the test is what will decide it. */}
        <button type="button" className="btn lab"
          disabled={busy === 'lab' || !form.labRequests.trim() || awaitingLab}
          onClick={() => void sendToLab()}>{busy === 'lab' ? 'Sending...'
            : awaitingLab ? 'Waiting on the lab' : 'Send to lab'}</button>
        {/* The clinician sends the patient onward; they do not close the visit. Whoever
            is last to see them does that, and with medicine on the note that is the
            counter. With nothing prescribed nobody else is going to see them, so ending
            it here is the one case where the visit stops with the clinician. */}
        <button type="button" className="btn"
          disabled={busy === 'finalize' || !form.diagnosis.trim() || !form.treatmentPlan.trim()}
          onClick={() => void persist(true)}>{busy === 'finalize' ? 'Sending...'
            : form.prescriptions.trim() ? 'Send to pharmacy' : 'End visit'}</button>
      </div>}
    </form>
  </div>
}

/**
 * Worked out from the fields above rather than typed: nobody records their own BMI, and
 * a mean arterial pressure done in someone's head mid-consultation is one done wrong.
 */
function Derived({ vitals }: { vitals: EncounterForm }) {
  const readings = derivedVitals(vitals)
  if (!readings.length) return null
  return <div className="vitals-derived encounter-wide">
    {readings.map(reading => <div key={reading.label} className={`vitals-reading ${reading.tone}`}>
      <span>{reading.label}</span><b>{reading.value}</b>
      {reading.note && <small>{reading.note}</small>}
    </div>)}
  </div>
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card encounter-section"><h3>{title}</h3><div className="encounter-grid">{children}</div></section>
}
function Field({ label, value, onChange, wide, required, disabled, type = 'text', placeholder }: {
  label: string; value: string; onChange: (value: string) => void; wide?: boolean; required?: boolean;
  disabled?: boolean; type?: string; placeholder?: string
}) {
  return <label className={wide ? 'encounter-wide' : ''}><span>{label}{required && ' *'}</span>
    <input type={type} step={type === 'number' ? 'any' : undefined} value={value} placeholder={placeholder}
      required={required} disabled={disabled} onChange={event => onChange(event.target.value)} /></label>
}
function TextField({ label, value, onChange, required, disabled, hint }: {
  label: string; value: string; onChange: (value: string) => void; required?: boolean; disabled?: boolean; hint?: string
}) {
  return <label><span>{label}{required && ' *'}</span>{hint && <small>{hint}</small>}
    <textarea rows={5} value={value} required={required} disabled={disabled}
      onChange={event => onChange(event.target.value)} /></label>
}
function toForm(value: Encounter): EncounterForm {
  return { ...value, bloodPressure: formatBloodPressure(value.systolicBp, value.diastolicBp),
    temperatureCelsius: value.temperatureCelsius?.toString() || '',
    pulseBpm: value.pulseBpm?.toString() || '', weightKg: value.weightKg?.toString() || '',
    heightCm: value.heightCm?.toString() || '', visitSummary: value.visitSummary || '' }
}
function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
