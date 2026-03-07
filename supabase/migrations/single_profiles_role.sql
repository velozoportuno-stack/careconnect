-- Migration: consolidate to single profiles table with role='client'|'professional'
-- and a separate service_type column for professional sub-type.
-- Run this in your Supabase SQL editor.

-- 1. Add service_type column (stores 'caregiver' | 'nurse' | 'cleaner')
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS service_type TEXT;

-- 2. Migrate existing data: copy old role values into service_type for professionals
UPDATE profiles
SET service_type = role
WHERE role IN ('caregiver', 'nurse', 'cleaner');

-- 3. Normalise role to just 'client' or 'professional'
UPDATE profiles
SET role = 'professional'
WHERE role IN ('caregiver', 'nurse', 'cleaner');

-- 4. Drop secondary_role if it was added in a previous migration
ALTER TABLE profiles DROP COLUMN IF EXISTS secondary_role;
