-- Two patients wait differently. One walked in an hour ago and has not been seen; the
-- other was seen, sent for a test, and has just come back. Taking the second one first
-- because their clock started earlier is how the first one waits all morning — so a trip
-- to the lab restarts the wait, and the queue reads it from waiting_at, which it already
-- had.
--
-- Urgency is the one thing allowed to jump that order: a baby gone quiet is not a matter
-- of whose clock started first. One flag, set by the desk, and nothing else — a triage
-- scale with five levels is a thing nobody at a busy front desk has time to grade.
alter table appointments add column urgent boolean not null default false;
