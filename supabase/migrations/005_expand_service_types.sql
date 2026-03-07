-- ============================================================
-- Migration 005 — Expand service types + add missing columns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. provider_services: drop old category CHECK constraint ─────────────────
-- The old constraint only allowed: 'caregiver','nurse','cleaner','fisioterapia','outros'
-- We now support 24+ profession types so we remove the constraint entirely.

ALTER TABLE provider_services
  DROP CONSTRAINT IF EXISTS provider_services_category_check;

-- ── 2. provider_services: add daily_rate column ───────────────────────────────
ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

-- ── 3. profiles: ensure all extended columns exist ───────────────────────────

-- Bank account fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account_type  TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account_value TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account_name  TEXT;

-- Address
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Daily rate (for caregivers, nurses, etc.)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(10, 2);

-- Cleaning-specific fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cleaning_types       TEXT[];

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cleaning_description TEXT;

-- License fields for health professionals
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nursing_license         TEXT;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nursing_license_country TEXT DEFAULT 'PT';

-- Custom profession label when service_type = 'other'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS custom_profession TEXT;

-- Professional ID (6-digit unique number, generated at signup)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS professional_id_number INTEGER UNIQUE;

-- ── 4. bookings: add payment tracking columns ────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ── 5. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_professional_id_number
  ON profiles(professional_id_number);

CREATE INDEX IF NOT EXISTS idx_provider_services_category
  ON provider_services(category);

-- ── 6. Storage bucket setup (informational — run via Supabase dashboard) ─────
-- Create a public bucket named "avatars":
--   Dashboard → Storage → New bucket → Name: avatars, Public: ON
--
-- RLS policies for the avatars bucket:
--   SELECT: allow all (public read)
--   INSERT/UPDATE: allow authenticated users on their own path (user.id prefix)

-- ── 7. Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
