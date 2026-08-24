ALTER TABLE patients DROP CONSTRAINT patients_active_care_status_check;

ALTER TABLE patients ADD CONSTRAINT patients_active_care_status_check
    CHECK (active_care_status IN ('CHECKED_IN', 'WAITING', 'IN_SESSION', 'PHARMACY'));

-- Preserve the correct status for prescriptions created before this workflow existed.
UPDATE patients
SET active_care_status = 'PHARMACY'
WHERE active_care_status IS NULL
  AND EXISTS (
      SELECT 1
      FROM prescription_orders
      WHERE prescription_orders.tenant_id = patients.tenant_id
        AND prescription_orders.patient_id = patients.id
        AND prescription_orders.status <> 'DISPENSED'
  );
