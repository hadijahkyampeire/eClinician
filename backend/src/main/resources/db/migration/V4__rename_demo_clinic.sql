-- The demo clinic is HK Clinics, and its staff sign in with addresses worth remembering.
-- V3 seeded it as sample-hospital / St Mary's Hospital and has already run on the
-- deployment, so its checksum is fixed: this is a new migration, not an edit to that file.

-- The new tenant row first, carrying V3's settings across, because app_users and patients
-- hold foreign keys and can only move to a hospital that exists.
INSERT INTO tenants (id, name, primary_color, modules, active, created_at)
SELECT 'hk-clinics', 'HK Clinics', primary_color, modules, active, created_at
FROM tenants WHERE id = 'sample-hospital'
ON CONFLICT (id) DO NOTHING;

UPDATE app_users           SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';
UPDATE patients            SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';
UPDATE appointments        SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';
UPDATE encounters          SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';
UPDATE prescription_orders SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';
UPDATE lab_orders          SET tenant_id = 'hk-clinics' WHERE tenant_id = 'sample-hospital';

-- Nothing points at the old row any more.
DELETE FROM tenants WHERE id = 'sample-hospital';

-- Each seeded account moves to the address the demo now uses. The NOT EXISTS guard means
-- an address already taken is left alone, so the unique index on email cannot be violated
-- by this migration and it stays safe to re-run against a partly renamed database.
UPDATE app_users AS u
SET email = renamed.new_email
FROM (VALUES
    ('reception@stmarys.eclinician.com', 'hkreceptionist@hkclinics.com'),
    ('sjenkins@stmarys.eclinician.com',  'hkdoctor@hkclinics.com'),
    ('lab@stmarys.eclinician.com',       'hklabtech@hkclinics.com'),
    ('pharmacy@stmarys.eclinician.com',  'hkpharmacy@hkclinics.com'),
    ('admin@stmarys.eclinician.com',     'hkadmin@hkclinics.com')
) AS renamed(old_email, new_email)
WHERE lower(u.email) = renamed.old_email
  AND NOT EXISTS (
      SELECT 1 FROM app_users other WHERE lower(other.email) = renamed.new_email);

-- Anyone else on the old domain — an account added by hand — keeps their name and follows
-- the clinic across.
UPDATE app_users AS u
SET email = replace(u.email, '@stmarys.eclinician.com', '@hkclinics.com')
WHERE u.email LIKE '%@stmarys.eclinician.com'
  AND NOT EXISTS (
      SELECT 1 FROM app_users other
      WHERE lower(other.email)
            = lower(replace(u.email, '@stmarys.eclinician.com', '@hkclinics.com')));
