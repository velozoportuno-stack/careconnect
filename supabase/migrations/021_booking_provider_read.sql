-- 021_booking_provider_read.sql
-- provider_read_at: timestamp when the professional first viewed this booking.
-- NULL = the professional hasn't opened the bookings panel since this booking
-- was created → drives the unread badge in the dashboard.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_read_at TIMESTAMPTZ;

-- Efficient index for the unread-count query:
-- SELECT count(*) FROM bookings WHERE provider_id = $1 AND provider_read_at IS NULL
CREATE INDEX IF NOT EXISTS bookings_provider_unread_idx
  ON bookings(provider_id, provider_read_at)
  WHERE provider_read_at IS NULL;

NOTIFY pgrst, 'reload schema';
