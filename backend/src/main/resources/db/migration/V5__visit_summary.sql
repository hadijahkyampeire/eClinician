-- The drafted visit summary. It lives on the encounter like any other clinical field:
-- the summarizer writes the first version, the clinician edits it, and finalizing locks
-- it with everything else.
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS visit_summary text;
