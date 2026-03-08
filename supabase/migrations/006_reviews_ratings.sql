-- ============================================================
-- Migration 006 — Reviews schema + profile rating columns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Ensure reviews table exists ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Add all review columns (idempotent) ───────────────────────────────────
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS reviewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS comment TEXT;

-- ── 3. Prevent duplicate reviews per booking per reviewer ────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_booking_reviewer
  ON reviews(booking_id, reviewer_id);

-- ── 4. RLS for reviews ───────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (shown on profile pages)
CREATE POLICY "Reviews public read" ON reviews
  FOR SELECT USING (true);

-- Only the reviewer can insert their own review
CREATE POLICY "Reviewer can insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- ── 5. Profile: rating aggregation columns ───────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- ── 6. Bookings: ensure booking_type and days_count exist ────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'hours';

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS days_count INTEGER;

-- ── 7. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_id ON reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_average_rating ON profiles(average_rating);

-- ── 8. Reload PostgREST schema cache ─────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
