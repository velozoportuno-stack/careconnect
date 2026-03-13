-- Migration 013: Fix RLS on provider_services for professional_id column
-- Ensures professionals can INSERT and UPDATE their own slot 2 rows.
-- Uses explicit WITH CHECK so the policy covers INSERT in all Supabase versions.

-- Drop old policies that reference provider_id (from migration 004)
DROP POLICY IF EXISTS "Provider manages own services" ON provider_services;
DROP POLICY IF EXISTS "Provider services public read"  ON provider_services;

-- Public read — anyone can browse available services
CREATE POLICY "Provider services public read" ON provider_services
  FOR SELECT USING (true);

-- Professionals manage their own rows via professional_id
CREATE POLICY "Professional manages own services" ON provider_services
  FOR ALL
  USING     (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

NOTIFY pgrst, 'reload schema';
