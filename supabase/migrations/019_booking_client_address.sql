-- Migration 019: Add confirmed service address fields to bookings
-- client_address already exists; add postal_code, city, and notes columns.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_postal_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_city         TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_notes        TEXT;

NOTIFY pgrst, 'reload schema';
