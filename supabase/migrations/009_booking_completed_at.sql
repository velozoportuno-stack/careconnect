-- ============================================================
-- Migration 009 — Add completed_at to bookings
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
