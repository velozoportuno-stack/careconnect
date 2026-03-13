-- ============================================================
-- Migration 015 — Client payment & contact columns
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

-- Phone number (clients + professionals)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Stripe — payment method reference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id       TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_payment_method_id TEXT;
-- Human-readable card summary stored at save time, e.g. "Visa **** 1234 — 12/26"
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_card_summary      TEXT;

-- MB WAY (Portugal)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mbway_phone TEXT;

-- PIX (Brasil)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- ── Reload PostgREST schema cache ──────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
