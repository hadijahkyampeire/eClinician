-- What Hibernate never created. Relationships are held as UUID columns rather than JPA
-- associations (see docs/architecture.md §3), which kept every query tenant-scoped but
-- left the database enforcing nothing. These are the constraints that argument owed.

-- Referential integrity. A patient with visits already cannot be deleted by the service;
-- RESTRICT means the database says so too, rather than trusting the service to remember.
ALTER TABLE appointments
    ADD CONSTRAINT fk_appointments_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT,
    -- A doctor's account is deactivated, never deleted, so the visit keeps its clinician.
    ADD CONSTRAINT fk_appointments_doctor FOREIGN KEY (doctor_id)
        REFERENCES app_users (id) ON DELETE RESTRICT;

ALTER TABLE encounters
    ADD CONSTRAINT fk_encounters_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_encounters_appointment FOREIGN KEY (appointment_id)
        REFERENCES appointments (id) ON DELETE RESTRICT;

-- Orders belong to the encounter that raised them: deleting the record would take the
-- orders with it, which is the one place a cascade is the honest answer.
ALTER TABLE prescription_orders
    ADD CONSTRAINT fk_prescription_orders_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_prescription_orders_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT;

ALTER TABLE lab_orders
    ADD CONSTRAINT fk_lab_orders_encounter FOREIGN KEY (encounter_id)
        REFERENCES encounters (id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_lab_orders_patient FOREIGN KEY (patient_id)
        REFERENCES patients (id) ON DELETE RESTRICT;

-- The two SRS uniqueness rules, enforced where they cannot be raced. PatientService
-- checks them first so the caller still gets a 409 with a readable message; these are
-- the backstop for two receptionists registering the same person at the same moment.
CREATE UNIQUE INDEX ux_patients_tenant_phone
    ON patients (tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX ux_patients_tenant_national_id
    ON patients (tenant_id, lower(national_id)) WHERE national_id IS NOT NULL;

-- Every query in the system is tenant-scoped, so every table is indexed that way first.
CREATE INDEX ix_patients_tenant ON patients (tenant_id);
CREATE INDEX ix_patients_tenant_care_status ON patients (tenant_id, active_care_status);
CREATE INDEX ix_appointments_tenant_patient ON appointments (tenant_id, patient_id);
CREATE INDEX ix_encounters_tenant_patient ON encounters (tenant_id, patient_id);
CREATE INDEX ix_app_users_tenant_role ON app_users (tenant_id, role);

-- Serves the SRS scheduling rule: is this doctor's slot already taken?
CREATE INDEX ix_appointments_doctor_slot
    ON appointments (tenant_id, doctor_id, scheduled_at);

-- Serve the pharmacy and laboratory queues, which read by status and by patient.
CREATE INDEX ix_prescription_orders_tenant_status
    ON prescription_orders (tenant_id, status);
CREATE INDEX ix_prescription_orders_tenant_patient
    ON prescription_orders (tenant_id, patient_id);
CREATE INDEX ix_lab_orders_tenant_status ON lab_orders (tenant_id, status);
CREATE INDEX ix_lab_orders_tenant_patient ON lab_orders (tenant_id, patient_id);
