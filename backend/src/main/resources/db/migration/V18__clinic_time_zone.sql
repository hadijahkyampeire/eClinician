-- Rota hours and every "today" were read in the server's timezone — one value for the
-- whole platform, set to Africa/Kampala on the deployed API. That is invisible while every
-- hospital is in one country and wrong the moment they are not: a rota that says the
-- morning shift starts at 08:00 means 08:00 *there*, so a clinic in Boston was finding its
-- morning shift running at one in the morning, and its dashboard's "today" starting at
-- 5pm the previous day.
--
-- The default matches what the server was already doing, so nothing shifts for the
-- hospitals that exist; new ones choose their own when they are onboarded.

ALTER TABLE tenants
    ADD COLUMN time_zone varchar(60) NOT NULL DEFAULT 'Africa/Kampala';
