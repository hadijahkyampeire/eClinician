-- A phone number identifies a household, not a person. The old index refused a second
-- patient on a number already used, which is exactly what registering a child on their
-- mother's phone looks like — the ordinary case, turned into an error.
--
-- The pair that actually means "this person is already here" is the name together with
-- the number. Looser than the SRS, and deliberately so: everything below this line is the
-- receptionist asking whether the patient has visited before, which no column can do.
DROP INDEX IF EXISTS ux_patients_tenant_phone;

CREATE UNIQUE INDEX ux_patients_tenant_name_phone
    ON patients (tenant_id, lower(first_name), lower(last_name), phone)
    WHERE phone IS NOT NULL AND first_name IS NOT NULL AND last_name IS NOT NULL;
