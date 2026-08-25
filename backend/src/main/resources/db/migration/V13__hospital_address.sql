-- A hospital was a name, a colour and a subscription. Onboarding now records where it is,
-- so the console can find a clinic by country or subdivision instead of only listing them.
--
-- The shape is the one international addresses agree on — street, city, subdivision,
-- postal code, country — rather than any one country's. "Subdivision" is ISO 3166-2's
-- name for the level below a country: a district in Uganda, a state in the US, a province
-- in Canada, a prefecture in Japan. One column holds whichever the hospital has, so the
-- console can filter the whole world by the same field.
--
-- Every column is nullable: the hospitals already onboarded have no address, and a NOT NULL
-- column added to a table that already holds rows is exactly the migration that locks
-- everyone out. The console treats a missing address as "not recorded yet".

ALTER TABLE tenants ADD COLUMN address_line varchar(255);
ALTER TABLE tenants ADD COLUMN city         varchar(100);
ALTER TABLE tenants ADD COLUMN subdivision  varchar(100);
ALTER TABLE tenants ADD COLUMN postal_code  varchar(20);
ALTER TABLE tenants ADD COLUMN country      varchar(2);
ALTER TABLE tenants ADD COLUMN phone        varchar(30);
ALTER TABLE tenants ADD COLUMN email        varchar(254);

-- The two the console filters on. Name search is a LIKE over a table of tens of rows, so
-- it needs no index of its own; these are equality lookups that will outlive that.
CREATE INDEX idx_tenants_country ON tenants (country);
CREATE INDEX idx_tenants_subdivision ON tenants (subdivision);

-- The demo clinic predates these columns: V4 created its row, so TenantSeeder's
-- "create if absent" guard means the address it now sets never reaches a migrated
-- database. Fill it in here, and only where nothing was recorded, so an address someone
-- typed into the console is never overwritten by a later re-run.
UPDATE tenants
SET address_line = 'Plot 12, Kimathi Avenue',
    city         = 'Kampala',
    subdivision  = 'Kampala',
    postal_code  = 'P.O. Box 7062',
    country      = 'UG',
    phone        = '+256700000000',
    email        = 'reception@sweclinic.test'
WHERE id = 'hk-clinics' AND country IS NULL;
