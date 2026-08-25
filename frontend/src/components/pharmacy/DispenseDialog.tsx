import { useState } from 'react'
import { Alert, ListSubheader, MenuItem, TextField } from '@mui/material'
import ConfirmDialog from '../ConfirmDialog'
import {
  CONTAINER_UNITS, MEASURE_UNITS, describeAmount, isContainer,
  type DispenseForm, type Prescription,
} from '../../types/pharmacy'

/**
 * Handing a medicine over, and writing down what actually happened.
 *
 * The prescribed medicine is pre-filled but editable: when it is out of stock the
 * pharmacist rings the clinician, agrees an equivalent, and dispenses that instead. Both
 * are kept — changing this box does not rewrite what the doctor ordered — because "we gave
 * something else" is exactly the fact a record needs to carry.
 */
export default function DispenseDialog({ order, busy, error, onClose, onConfirm }: {
  order: Prescription
  busy: boolean
  error?: string
  onClose: () => void
  onConfirm: (form: DispenseForm) => void
}) {
  const [medication, setMedication] = useState(order.medication)
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState(MEASURE_UNITS[0])
  const [packSize, setPackSize] = useState('')
  const [notes, setNotes] = useState('')

  const substituted = medication.trim().toLowerCase() !== order.medication.trim().toLowerCase()
  const amount = quantity.trim() === '' ? null : Number(quantity)
  const badAmount = amount !== null && (!Number.isInteger(amount) || amount < 1)
  // A bottle needs to say what is in it; a tablet already has.
  const container = isContainer(unit)
  const preview = describeAmount(amount, unit, container ? packSize.trim() : '')

  return (
    <ConfirmDialog
      title="Dispense medicine"
      message={<>To <b>{order.patientName}</b>, recorded under your name.</>}
      confirmLabel="Dispense"
      busy={busy} error={error}
      disabled={!medication.trim() || badAmount}
      onClose={onClose}
      onConfirm={() => onConfirm({
        status: 'DISPENSED',
        dispensedMedication: medication.trim(),
        quantityDispensed: amount,
        dispenseUnit: unit,
        packSize: container ? packSize.trim() : '',
        notes: notes.trim(),
      })}>
      <TextField label="Prescribed" value={order.medication} disabled fullWidth size="small" />
      <TextField label="Dispensed" value={medication} required fullWidth size="small"
        onChange={(event) => setMedication(event.target.value)}
        helperText="Change it only if you gave an equivalent — and ring the clinician first." />

      {substituted && (
        <Alert severity="warning">
          This is not what was prescribed. Both are kept on the record, and the note below
          is where the agreement with the clinician belongs.
        </Alert>
      )}

      <div className="dispense-amount">
        <TextField label="How many" value={quantity} size="small" type="number"
          error={badAmount} helperText={badAmount ? 'A whole number, 1 or more' : 'Optional'}
          slotProps={{ htmlInput: { min: 1, step: 1 } }}
          onChange={(event) => setQuantity(event.target.value)} />
        <TextField select label="Unit" value={unit} size="small"
          onChange={(event) => setUnit(event.target.value)}>
          <ListSubheader>Counted as they are</ListSubheader>
          {MEASURE_UNITS.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
          <ListSubheader>Containers — say what is inside</ListSubheader>
          {CONTAINER_UNITS.map((value) => (
            <MenuItem key={value} value={value}>{value}</MenuItem>
          ))}
        </TextField>
        {/* "1 bottle" is not an amount of syrup — the volume in it is. */}
        {container && (
          <TextField label="Each one holds" value={packSize} size="small"
            placeholder="100 ml"
            slotProps={{ htmlInput: { maxLength: 40 } }}
            onChange={(event) => setPackSize(event.target.value)} />
        )}
      </div>
      {preview && <p className="dispense-preview">Recorded as <b>{preview}</b></p>}

      <TextField label="Note" value={notes} fullWidth size="small" multiline minRows={2}
        placeholder="Only half the course in stock — rest to be collected elsewhere"
        helperText="Seen by the clinician and on the patient's record."
        onChange={(event) => setNotes(event.target.value)} />
    </ConfirmDialog>
  )
}
