-- Migration: professional_id_number + booking payment status + custom profession
-- Run this in the Supabase SQL Editor

-- 1. Add unique 6-digit professional ID to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_id_number INTEGER UNIQUE;

-- 2. Add custom profession field for "Outro" service type
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_profession TEXT;

-- 3. Add payment status and completion timestamp to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 4. Enable Realtime on bookings table so clients receive instant notifications
-- (Run in Supabase Dashboard → Database → Replication, or via SQL:)
-- ALTER TABLE bookings REPLICA IDENTITY FULL;
-- (Then enable the table in the Supabase Realtime section of the dashboard)

-- 5. Index for fast ID lookup in Search
CREATE INDEX IF NOT EXISTS idx_profiles_professional_id_number
  ON profiles(professional_id_number);
