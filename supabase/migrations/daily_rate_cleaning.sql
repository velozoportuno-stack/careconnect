-- Migration: daily rate + cleaning service fields
-- Run this in your Supabase SQL editor

-- Daily rate for health professionals (nurse, caregiver)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10,2);

-- Cleaning service fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cleaning_types        TEXT[];
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cleaning_description  TEXT;

-- Also add to professional_profiles if it exists in your schema
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS daily_rate           DECIMAL(10,2);
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS cleaning_types       TEXT[];
ALTER TABLE professional_profiles ADD COLUMN IF NOT EXISTS cleaning_description TEXT;

-- Booking type columns (hours vs days)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'hours'; -- 'hours' | 'days'
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS days_count   INTEGER;
