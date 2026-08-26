-- LAB was added to PatientCareStatus when the clinician got a way to send a patient to
-- the bench mid-visit, but this constraint was never widened to admit it. Postgres
-- refused every such write; the tests never saw it because they build their schema from
-- the entity rather than from these files, so the enum and the database disagreed only
-- where it mattered.
ALTER TABLE patients DROP CONSTRAINT patients_active_care_status_check;

ALTER TABLE patients ADD CONSTRAINT patients_active_care_status_check
    CHECK (active_care_status IN ('CHECKED_IN', 'WAITING', 'IN_SESSION', 'LAB', 'PHARMACY'));
