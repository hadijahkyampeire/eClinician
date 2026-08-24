ALTER TABLE app_users ADD COLUMN specialty varchar(100);

UPDATE app_users
SET specialty = 'General Practitioner'
WHERE role = 'CLINICIAN' AND specialty IS NULL;
