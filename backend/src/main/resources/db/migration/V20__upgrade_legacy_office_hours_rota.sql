-- The doctors seeded before any of this existed are still on office hours.
--
-- The original seeder gave them Monday-Friday 08:00-17:00. V14 then backfilled a default
-- rota only for clinicians who had *no* availability at all, so it skipped them; V19 added
-- the night shift only to days already carrying the three-shift pattern, so it skipped them
-- too. The result is a hospital whose doctors vanish from the booking form every evening
-- and all weekend, which is what "there is no clinician" turned out to mean.
--
-- Nobody chose those hours: they were the old default, written by a seeder. So they are
-- replaced with the current one. The match is deliberately exact — every row for that
-- clinician is 08:00-17:00, on five distinct weekdays, and nothing else. A clinician who
-- has edited anything at all falls outside it and keeps what they set.
--
-- Done in separate statements rather than one data-modifying CTE: the old and new rotas
-- share the 08:00 start, and a CTE's sub-statements see one snapshot — the insert's unique
-- check would not see the delete, and would trip the index. The temp table is session
-- scoped and dropped explicitly, so this behaves the same whether it is replayed through
-- psql, which commits each statement, or Flyway, which wraps the file in one transaction.

DROP TABLE IF EXISTS legacy_office_hours;

CREATE TEMP TABLE legacy_office_hours AS
SELECT tenant_id, clinician_id, min(room) AS room
FROM clinician_availability
GROUP BY tenant_id, clinician_id
HAVING count(*) = 5
   AND count(*) FILTER (WHERE start_time = TIME '08:00' AND end_time = TIME '17:00') = 5
   AND count(DISTINCT day_of_week) = 5
   AND count(*) FILTER (WHERE day_of_week IN ('SATURDAY', 'SUNDAY')) = 0;

DELETE FROM clinician_availability a
USING legacy_office_hours o
WHERE a.tenant_id = o.tenant_id AND a.clinician_id = o.clinician_id;

INSERT INTO clinician_availability (id, tenant_id, clinician_id, day_of_week, start_time, end_time, room)
SELECT gen_random_uuid(), o.tenant_id, o.clinician_id, d.day, s.start_time, s.end_time, o.room
FROM legacy_office_hours o
CROSS JOIN (VALUES ('MONDAY'), ('TUESDAY'), ('WEDNESDAY'), ('THURSDAY'),
                   ('FRIDAY'), ('SATURDAY'), ('SUNDAY')) AS d(day)
CROSS JOIN (VALUES (TIME '00:00', TIME '08:00'),
                   (TIME '08:00', TIME '14:00'),
                   (TIME '14:00', TIME '20:00'),
                   (TIME '20:00', TIME '23:59:59')) AS s(start_time, end_time);

DROP TABLE legacy_office_hours;
