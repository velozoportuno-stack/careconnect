-- Migration 018 — Extra columns for patients table
-- Run in Supabase Dashboard → SQL Editor

ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies               TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS insurance               TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS mobility_level          TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS special_diet            TEXT;

NOTIFY pgrst, 'reload schema';
