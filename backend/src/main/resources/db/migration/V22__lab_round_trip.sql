-- A visit had one exit: finalize. So a clinician who wanted a test had to close the visit
-- before the lab could see anything — which left the patient with no status at all, gone
-- from the queue, and no way back to the doctor who sent them.
--
-- These two stamps make the trip part of the visit instead. The encounter stays open the
-- whole time: it says when the patient left for the lab, and when the results came back
-- for the clinician still holding it.
alter table encounters add column sent_to_lab_at timestamp(6) with time zone;
alter table encounters add column lab_results_ready_at timestamp(6) with time zone;
