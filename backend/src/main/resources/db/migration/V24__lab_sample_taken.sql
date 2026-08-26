-- A test had two states worth knowing and only one of them existed: the lab has the
-- sample, and the lab has an answer. Collapsing those meant the patient stood at the
-- bench until the result was written — fine for a rapid test read in twenty minutes,
-- absurd for a culture read in two days.
--
-- In progress is the gap between them. The specimen is taken, so the patient is free to
-- go back and sit down; the result is not in, so the clinician is not told it is.
alter table lab_orders drop constraint lab_orders_status_check;
alter table lab_orders add constraint lab_orders_status_check
    check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
