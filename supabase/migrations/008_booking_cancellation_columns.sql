-- ============================================================
-- Migration 008 — Add cancelled_at and cancelled_by to bookings
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Add cancellation columns ──────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- cancelled_by values: 'professional' | 'client'

-- ── RLS: allow both parties to update (cancel) their own bookings ─────────────
-- Drop and recreate the update policy to cover both client_id and provider_id.
-- Adjust if your existing policy name differs.
DROP POLICY IF EXISTS "Users can update own bookings" ON bookings;

CREATE POLICY "Users can update own bookings" ON bookings
  FOR UPDATE
  USING (
    auth.uid() = client_id OR auth.uid() = provider_id
  );

-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
