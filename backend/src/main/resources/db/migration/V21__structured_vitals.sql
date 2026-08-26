-- Blood pressure was one free-text box, so nothing could be read back out of it: no mean
-- arterial pressure, no pulse pressure, no category. Two numbers can be. Height joins them
-- because a weight on its own says nothing about whether it is the right weight.
alter table encounters add column systolic_bp integer;
alter table encounters add column diastolic_bp integer;
alter table encounters add column height_cm double precision;

-- Anything already written the way the field asked for carries over. Anything else was
-- never a reading a clinician could act on, and is dropped with the column.
update encounters
set systolic_bp = split_part(blood_pressure, '/', 1)::integer,
    diastolic_bp = split_part(blood_pressure, '/', 2)::integer
where blood_pressure ~ '^\s*\d{2,3}\s*/\s*\d{2,3}\s*$';

alter table encounters drop column blood_pressure;
