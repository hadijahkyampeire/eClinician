-- Reception only ever sees clinicians whose published shift covers the time being booked,
-- and a clinician started with nothing published. So every doctor at a hospital onboarded
-- through the console was invisible in the booking form — there was no doctor to pick.
--
-- Being bookable is the sensible default. This gives the clinic's three shifts, every day,
-- to every active clinician who has published nothing; a doctor marks themselves
-- unavailable by removing shifts, which this will not undo because it skips anyone who
-- already has a rota of their own.
--
-- 23:59 rather than 00:00 closes the last shift: a shift matches on
-- `start_time <= t AND end_time > t`, and midnight as an end time sorts before its own
-- start, so a shift ending at 00:00 would never match anything.

INSERT INTO clinician_availability (id, tenant_id, clinician_id, day_of_week, start_time, end_time, room)
SELECT gen_random_uuid(), u.tenant_id, u.id, d.day, s.start_time, s.end_time, 'Consulting room'
FROM app_users u
CROSS JOIN (VALUES ('MONDAY'), ('TUESDAY'), ('WEDNESDAY'), ('THURSDAY'),
                   ('FRIDAY'), ('SATURDAY'), ('SUNDAY')) AS d(day)
CROSS JOIN (VALUES (TIME '08:00', TIME '14:00'),
                   (TIME '14:00', TIME '20:00'),
                   (TIME '20:00', TIME '23:59')) AS s(start_time, end_time)
WHERE u.role = 'CLINICIAN'
  AND u.active
  AND u.tenant_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM clinician_availability a
      WHERE a.tenant_id = u.tenant_id AND a.clinician_id = u.id)
ON CONFLICT ON CONSTRAINT clinician_availability_shift_key DO NOTHING;
