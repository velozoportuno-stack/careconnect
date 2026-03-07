-- Migration: location & availability features
-- Run this in your Supabase SQL editor

-- 1. Add GPS columns to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_latitude  DECIMAL(10,8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_longitude DECIMAL(11,8);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS client_address   TEXT;

-- 2. Professional weekly availability
CREATE TABLE IF NOT EXISTS professional_availability (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week     INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday … 6=Saturday
  start_time      TIME    NOT NULL,
  end_time        TIME    NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by professional
CREATE INDEX IF NOT EXISTS idx_professional_availability_professional_id
  ON professional_availability (professional_id);

-- Allow authenticated users to read all availability
CREATE POLICY IF NOT EXISTS "availability_select"
  ON professional_availability FOR SELECT USING (true);

-- Professionals can manage their own availability
CREATE POLICY IF NOT EXISTS "availability_insert"
  ON professional_availability FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

CREATE POLICY IF NOT EXISTS "availability_delete"
  ON professional_availability FOR DELETE
  USING (auth.uid() = professional_id);

ALTER TABLE professional_availability ENABLE ROW LEVEL SECURITY;
