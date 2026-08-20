-- A tenant used to be only a string carried on every row. This is the row it refers to,
-- so a hospital can be onboarded, branded, and sold modules rather than hard-coded in
-- the frontend.

CREATE TABLE tenants (
    id            varchar(60) PRIMARY KEY,
    name          varchar(150) NOT NULL,
    primary_color varchar(7)   NOT NULL,
    modules       varchar(255) NOT NULL,
    active        boolean      NOT NULL DEFAULT true,
    created_at    timestamp(6) with time zone
);

-- Adopt the hospital the deployed data already belongs to, with every module on. The
-- seeder does the same thing for a fresh development database.
INSERT INTO tenants (id, name, primary_color, modules, active, created_at)
VALUES ('sample-hospital', 'St Mary''s Hospital', '#0f766e',
        'PATIENTS,APPOINTMENTS,RECORDS,PHARMACY,LABORATORY', true, now())
ON CONFLICT (id) DO NOTHING;

-- Any other hospital already present in the data — a tenant_id with rows but no row of
-- its own — is adopted with the same defaults so nobody is locked out by this migration.
INSERT INTO tenants (id, name, primary_color, modules, active, created_at)
SELECT tenant_id, initcap(replace(tenant_id, '-', ' ')), '#0f766e',
       'PATIENTS,APPOINTMENTS,RECORDS,PHARMACY,LABORATORY', true, now()
FROM (SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
      UNION SELECT DISTINCT tenant_id FROM patients) AS existing
ON CONFLICT (id) DO NOTHING;

-- Staff and patients belong to a hospital that exists; the platform administrator has no
-- tenant, which is why the column stays nullable on app_users. The remaining tables reach
-- a tenant through their patient.
ALTER TABLE app_users
    ADD CONSTRAINT fk_app_users_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants (id) ON DELETE RESTRICT;
ALTER TABLE patients
    ADD CONSTRAINT fk_patients_tenant FOREIGN KEY (tenant_id)
        REFERENCES tenants (id) ON DELETE RESTRICT;
