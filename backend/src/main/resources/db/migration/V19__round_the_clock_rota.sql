-- The default rota ran 08:00 to midnight, so nobody was bookable in the small hours —
-- which is exactly when it was noticed, at ten to one in the morning. A clinician should
-- be available at any hour until they say otherwise, so the day gets a fourth shift.
--
-- Only days still carrying all three original shifts are touched. A clinician who has
-- already edited a day has decided something about it, and this must not undo that.

INSERT INTO clinician_availability (id, tenant_id, clinician_id, day_of_week, start_time, end_time, room)
SELECT gen_random_uuid(), a.tenant_id, a.clinician_id, a.day_of_week,
       TIME '00:00', TIME '08:00', min(a.room)
FROM clinician_availability a
GROUP BY a.tenant_id, a.clinician_id, a.day_of_week
HAVING count(*) FILTER (WHERE a.start_time = TIME '08:00' AND a.end_time = TIME '14:00') = 1
   AND count(*) FILTER (WHERE a.start_time = TIME '14:00' AND a.end_time = TIME '20:00') = 1
   AND count(*) FILTER (WHERE a.start_time = TIME '20:00') = 1
   AND count(*) FILTER (WHERE a.start_time = TIME '00:00') = 0
ON CONFLICT ON CONSTRAINT clinician_availability_shift_key DO NOTHING;

-- 23:59 as an end time leaves the 23:59 minute itself uncovered, because a shift matches
-- on start <= t < end. Close the day properly.
UPDATE clinician_availability SET end_time = TIME '23:59:59' WHERE end_time = TIME '23:59';
