-- The product is HK CLINIC; the clinic it is demonstrated with is a tenant like any
-- other. Naming it after the course makes the difference visible in the sidebar, which
-- reads "HK CLINIC · SWE Clinic".
UPDATE tenants SET name = 'SWE Clinic'
WHERE id = 'hk-clinics' AND name IN ('HK Clinics', 'St Mary''s Hospital');
