-- ============================================================
-- CareConnect — Migration 003
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. ADD MISSING COLUMNS TO profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bank_account_type  TEXT CHECK (bank_account_type IN ('iban', 'pix')),
  ADD COLUMN IF NOT EXISTS bank_account_value TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name  TEXT,
  ADD COLUMN IF NOT EXISTS address            TEXT;

-- 2. PATIENT PROFILES
CREATE TABLE IF NOT EXISTS patient_profiles (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  birth_date          DATE,
  medical_conditions  TEXT,
  observations        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MEDICATIONS
CREATE TABLE IF NOT EXISTS medications (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_profile_id  UUID REFERENCES patient_profiles(id) ON DELETE CASCADE,
  booking_id          UUID REFERENCES bookings(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  dosage              TEXT,
  frequency           TEXT,
  schedule_times      TEXT[],
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEDICATION LOGS (realtime sync)
CREATE TABLE IF NOT EXISTS medication_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id   UUID REFERENCES medications(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE CASCADE,
  scheduled_time  TEXT NOT NULL,
  scheduled_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT CHECK (status IN ('pending','given','missed')) DEFAULT 'pending',
  confirmed_at    TIMESTAMPTZ,
  confirmed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (medication_id, scheduled_time, scheduled_date)
);

-- 5. RLS POLICIES
ALTER TABLE patient_profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs    ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'patient_profiles' AND policyname = 'Patient profiles for booking parties'
  ) THEN
    CREATE POLICY "Patient profiles for booking parties" ON patient_profiles
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.id = patient_profiles.booking_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'medications' AND policyname = 'Medications for booking parties'
  ) THEN
    CREATE POLICY "Medications for booking parties" ON medications
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.id = medications.booking_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'medication_logs' AND policyname = 'Medication logs for booking parties'
  ) THEN
    CREATE POLICY "Medication logs for booking parties" ON medication_logs
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.id = medication_logs.booking_id
            AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
        )
      );
  END IF;
END $$;

-- 6. RELOAD PostgREST schema cache (fixes "column not found" error)
NOTIFY pgrst, 'reload schema';
