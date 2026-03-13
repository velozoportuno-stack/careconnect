-- ============================================================
-- Migration 010 — Add tax_id and tax_id_type to profiles
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- Values: 'NIF', 'NIPC', 'CPF', 'CNPJ'
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS tax_id_type TEXT;

-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
