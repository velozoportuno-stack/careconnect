ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS postal_code TEXT;
NOTIFY pgrst, 'reload schema';
