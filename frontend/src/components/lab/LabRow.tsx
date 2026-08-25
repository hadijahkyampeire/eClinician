import { Button } from '@mui/material'
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined'
import RowActions from '../RowActions'
import type { LabOrder } from '../../types/lab'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

/**
 * One test in the queue. Recording the result is the job; cancelling it means the
 * clinician never gets an answer, so that one lives behind the menu.
 */
export default function LabRow({ order, busy, onResult, onCancel }: {
  order: LabOrder
  busy: boolean
  onResult: () => void
  onCancel: () => void
}) {
  return (
    <div className="record-row">
      <div>
        <b>{order.testName}</b>
        <small>
          {order.patientName}
          {order.result ? ` · ${order.result}` : order.notes ? ` · ${order.notes}` : ''}
        </small>
      </div>
      <div>
        <span className={`record-status ${order.status.toLowerCase()}`}>
          {order.status.toLowerCase()}
        </span>
        {order.status === 'COMPLETED'
          ? <time>{order.resultedBy} · {formatDateTime(order.resultedAt!)}</time>
          : <div className="pharmacy-actions">
              <Button variant="contained" size="small" disabled={busy}
                onClick={onResult}>Record result</Button>
              <RowActions label={`Actions for ${order.testName}`} actions={[{
                label: 'Cancel test', danger: true, disabled: busy,
                icon: <EventBusyOutlinedIcon fontSize="small" />, onClick: onCancel,
              }]} />
            </div>}
      </div>
    </div>
  )
}
