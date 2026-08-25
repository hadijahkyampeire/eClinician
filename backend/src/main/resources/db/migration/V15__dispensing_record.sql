-- A prescription recorded only what was ordered and whether it went out. When the
-- prescribed medicine is not in stock a pharmacist rings the clinician, agrees an
-- equivalent, and hands that over instead — and the record said nothing about it.
--
-- These three columns hold the other half: what was actually dispensed, how much of it,
-- and in what unit. They stay null until a medicine is dispensed; the existing `notes`
-- column already carries the pharmacist's reason, so it is reused rather than doubled.

ALTER TABLE prescription_orders ADD COLUMN dispensed_medication varchar(500);
ALTER TABLE prescription_orders ADD COLUMN quantity_dispensed   integer;
ALTER TABLE prescription_orders ADD COLUMN dispense_unit        varchar(30);

-- Rows dispensed before this existed were, by definition, the medicine as prescribed.
-- Their quantity is genuinely unknown and stays null rather than being invented.
UPDATE prescription_orders
SET dispensed_medication = medication
WHERE status = 'DISPENSED' AND dispensed_medication IS NULL;
