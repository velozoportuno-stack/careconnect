-- ============================================================
-- Migration 004 — provider_services table
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS provider_services (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  category      TEXT CHECK (category IN ('caregiver', 'nurse', 'cleaner', 'fisioterapia', 'outros')),
  title         TEXT NOT NULL,
  description   TEXT,
  bio           TEXT,
  price_per_hour DECIMAL(10, 2),
  is_available  BOOLEAN DEFAULT TRUE,
  images        TEXT[],
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE TRIGGER provider_services_updated_at
  BEFORE UPDATE ON provider_services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider services public read" ON provider_services
  FOR SELECT USING (true);

CREATE POLICY "Provider manages own services" ON provider_services
  FOR ALL USING (auth.uid() = provider_id);

-- Add provider_service_id to bookings for new booking flow
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS provider_service_id UUID REFERENCES provider_services(id) ON DELETE SET NULL;

-- ── Migrate existing data ─────────────────────────────────────────────────────

-- 1. From profiles (providers with role + hourly_rate)
INSERT INTO provider_services (provider_id, category, title, bio, price_per_hour, is_available)
SELECT
  id,
  role,
  CASE role
    WHEN 'caregiver' THEN 'Cuidador(a) de Idosos'
    WHEN 'nurse'     THEN 'Enfermagem Domiciliária'
    WHEN 'cleaner'   THEN 'Assistência de Limpeza'
    ELSE 'Serviço Profissional'
  END,
  bio,
  hourly_rate,
  is_active
FROM profiles
WHERE role IN ('caregiver', 'nurse', 'cleaner')
  AND hourly_rate IS NOT NULL
ON CONFLICT DO NOTHING;

-- 2. From existing services table (if populated)
INSERT INTO provider_services (provider_id, category, title, description, price_per_hour, is_available)
SELECT
  provider_id,
  category,
  title,
  description,
  price_per_hour,
  is_available
FROM services
WHERE provider_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
