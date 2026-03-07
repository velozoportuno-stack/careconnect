-- Migration: nursing license fields on profiles
-- Run this in your Supabase SQL editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nursing_license         TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nursing_license_country TEXT;

-- Also add payment_method column to bookings for tracking which method was used
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
