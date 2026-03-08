-- ============================================================
-- Migration 007 — Booking cancellation status values
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- The bookings.status column accepts any TEXT value (no CHECK constraint),
-- so no schema change is strictly required. This migration documents the
-- new canonical status values and adds an index for filtered queries.

-- New status values used by the app:
--   cancelled_by_client       — client initiated cancellation
--   cancelled_by_professional — professional initiated cancellation
--   (existing: pending, confirmed, in_progress, completed, cancelled)

-- ── Index for status-filtered queries ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- ── Normalise legacy 'cancelled' rows (optional — run if desired) ─────────────
-- If you want to distinguish who cancelled legacy rows, you can leave them as
-- 'cancelled'. The UI handles this case gracefully via the fallback label.

-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
