-- ============================================================
-- Migration 011 — Add nursing_license to provider_services
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- nursing_license goes to provider_services, NOT to profiles.
-- This lets each service record carry its own license number
-- (a professional may hold licenses in multiple countries).

ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS nursing_license TEXT;

ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS nursing_license_country TEXT DEFAULT 'PT';

-- Backfill from profiles for existing professionals who already had
-- nursing_license saved there.
UPDATE provider_services ps
SET
  nursing_license         = p.nursing_license,
  nursing_license_country = COALESCE(p.nursing_license_country, 'PT')
FROM profiles p
WHERE ps.provider_id = p.id
  AND p.nursing_license IS NOT NULL
  AND ps.nursing_license IS NULL;

-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
