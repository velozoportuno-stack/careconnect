-- Migration: dual profiles — one account can have both client and professional roles
-- Run this in your Supabase SQL editor

-- Add secondary_role column to profiles
-- A user whose primary role is 'client' can have secondary_role = 'caregiver' | 'nurse' | 'cleaner'
-- A user whose primary role is a professional role can have secondary_role = 'client'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS secondary_role TEXT;

-- Optional: add a check constraint to prevent invalid combinations
-- ALTER TABLE profiles ADD CONSTRAINT valid_secondary_role
--   CHECK (secondary_role IS NULL OR secondary_role IN ('client','caregiver','nurse','cleaner'));
