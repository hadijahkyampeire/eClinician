-- A count and a unit are enough for something that is its own measure: 15 tablets is a
-- complete fact. A bottle of syrup is not. "1 bottle" says nothing about whether the
-- patient got 60ml or 200ml, and "100 ml" says nothing about what the shelf lost.
--
-- So the count stays what the pharmacy stocks and this holds what is inside each one,
-- which is what the patient actually receives: 2 x 100 ml bottles. Empty for tablets.

ALTER TABLE prescription_orders ADD COLUMN pack_size varchar(40);
