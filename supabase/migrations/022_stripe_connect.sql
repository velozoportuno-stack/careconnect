-- ============================================================
-- Migration 022 — Stripe Connect fields
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Track whether the professional has completed Stripe Express onboarding
-- Values: 'not_started' | 'pending' | 'active'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_started';

-- Store the Stripe PaymentIntent ID on bookings for reconciliation
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- ── Reload PostgREST schema cache ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
