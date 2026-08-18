import { useQuery } from '@tanstack/react-query'
import { getPatientLabOrders } from '../../api/lab'
import { getPatientPrescriptions } from '../../api/pharmacy'

/**
 * SRS 4.1.1 and 5.1.3: the clinician reads their own patient's prescriptions and
 * lab results, rather than the pharmacist's or technician's working queue.
 */
export default function PatientOrderPanels({
  tenantId, patientId,
}: { tenantId?: string; patientId: string }) {
  const enabled = Boolean(tenantId && patientId)
  const labs = useQuery({
    queryKey: ['lab-orders', tenantId, patientId],
    queryFn: () => getPatientLabOrders(patientId),
    enabled,
  })
  const prescriptions = useQuery({
    queryKey: ['prescriptions', tenantId, patientId],
    queryFn: () => getPatientPrescriptions(patientId),
    enabled,
  })

  return (
    <>
      <details className="history-panel">
        <summary>
          <span>Laboratory results</span>
          <small>{labs.data?.length || 0} requested</small>
        </summary>
        {labs.data?.length ? (
          <div className="patient-appointment-history">
            {labs.data.map((order) => (
              <div key={order.id}>
                <div>
                  <b>{order.testName}</b>
                  <small>{order.result
                    || `${order.status.toLowerCase()} — no result recorded yet`}</small>
                </div>
                <time>{order.resultedAt
                  ? `${order.resultedBy} · ${formatDateTime(order.resultedAt)}`
                  : formatDateTime(order.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : <div className="history-empty">No laboratory tests requested.</div>}
      </details>

      <details className="history-panel">
        <summary>
          <span>Prescriptions</span>
          <small>{prescriptions.data?.length || 0} issued</small>
        </summary>
        {prescriptions.data?.length ? (
          <div className="patient-appointment-history">
            {prescriptions.data.map((order) => (
              <div key={order.id}>
                <div>
                  <b>{order.medication}</b>
                  <small>{order.status.toLowerCase()}
                    {order.notes ? ` — ${order.notes}` : ''}</small>
                </div>
                <time>{order.dispensedAt
                  ? `${order.dispensedBy} · ${formatDateTime(order.dispensedAt)}`
                  : formatDateTime(order.createdAt)}</time>
              </div>
            ))}
          </div>
        ) : <div className="history-empty">No prescriptions issued.</div>}
      </details>
    </>
  )
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
