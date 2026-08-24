ALTER TABLE appointments ADD COLUMN waiting_at timestamp(6) with time zone;

-- Older WAITING rows only recorded arrival. Use that as the best historical estimate;
-- all new transitions receive their exact waiting-room timestamp in the service.
UPDATE appointments
SET waiting_at = checked_in_at
WHERE status = 'WAITING' AND waiting_at IS NULL;
