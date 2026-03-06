-- ============================================================
-- Migration 003 — Patient data, medications, alarm logs,
--                bank account fields on profiles
-- ============================================================

-- Bank account on profiles (IBAN / PIX)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account_type TEXT CHECK (bank_account_type IN ('iban', 'pix')),
  ADD COLUMN IF NOT EXISTS bank_account_value TEXT;

-- Patient profiles attached to a booking
CREATE TABLE IF NOT EXISTS patient_profiles (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id     UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  birth_date     DATE,
  medical_conditions TEXT,
  observations   TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Medications for a patient profile
CREATE TABLE IF NOT EXISTS medications (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_profile_id UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  booking_id         UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  dosage             TEXT,
  frequency          TEXT,
  schedule_times     TEXT[],   -- e.g. ['08:00','14:00','20:00']
  is_active          BOOLEAN DEFAULT TRUE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Medication administration logs (realtime sync)
CREATE TABLE IF NOT EXISTS medication_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id   UUID REFERENCES medications(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
  scheduled_time  TEXT NOT NULL,            -- 'HH:MM'
  scheduled_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT CHECK (status IN ('pending', 'given', 'missed')) DEFAULT 'pending',
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Triggers ───────────────────────────────────────────────

CREATE TRIGGER patient_profiles_updated_at
  BEFORE UPDATE ON patient_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ────────────────────────────────────────────────────

ALTER TABLE patient_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Patient profiles for booking parties" ON patient_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = patient_profiles.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Medications for booking parties" ON medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = medications.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "Medication logs for booking parties" ON medication_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = medication_logs.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Realtime publication for medication_logs
ALTER PUBLICATION supabase_realtime ADD TABLE medication_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE provider_locations;
