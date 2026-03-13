-- Migration 013: Fix RLS on provider_services to explicitly cover INSERT
-- The existing "Provider manages own services" policy uses FOR ALL USING without
-- WITH CHECK. Some Supabase versions do not apply USING as WITH CHECK for INSERT,
-- causing silent insert failures.

-- Drop the old policy and recreate with explicit WITH CHECK.
DROP POLICY IF EXISTS "Provider manages own services" ON provider_services;

CREATE POLICY "Provider manages own services" ON provider_services
  FOR ALL
  USING     (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

-- Ensure SELECT remains public
DROP POLICY IF EXISTS "Provider services public read" ON provider_services;

CREATE POLICY "Provider services public read" ON provider_services
  FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
