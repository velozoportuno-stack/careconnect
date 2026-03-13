-- ============================================================
-- Migration 014 — Patient management, medications, alarms
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================
-- DO NOT REMOVE: existing patient_profiles / medications / medication_logs
-- tables remain for the booking-based alarm system (MedicationAlarms.jsx).
-- These new tables power the standalone Gestão de Pacientes feature.

-- ── patients ─────────────────────────────────────────────────────────────────
-- One record per patient managed by a professional.
-- client_id links the patient to the client (family/guardian) who hired them.
-- booking_id is optional — links to the booking that originated this record.
CREATE TABLE IF NOT EXISTS patients (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id  UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  client_id        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  date_of_birth    DATE,
  medical_conditions TEXT,
  observations     TEXT,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── patient_medications ───────────────────────────────────────────────────────
-- Medications belonging to a patient.
-- times TEXT[] stores HH:MM strings, e.g. {'08:00','14:00','20:00'}.
CREATE TABLE IF NOT EXISTS patient_medications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  dosage      TEXT,
  frequency   TEXT,
  times       TEXT[],          -- daily administration times in HH:MM
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── medication_alarms ─────────────────────────────────────────────────────────
-- One record per scheduled dose (created daily by the frontend).
-- scheduled_time is an absolute TIMESTAMPTZ so timezone math is correct.
-- status: pending → administered / missed
CREATE TABLE IF NOT EXISTS medication_alarms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medication_id   UUID REFERENCES patient_medications(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  scheduled_time  TIMESTAMP WITH TIME ZONE NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'administered', 'missed')),
  administered_at TIMESTAMP WITH TIME ZONE,
  notes           TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: only one alarm per medication per scheduled moment
CREATE UNIQUE INDEX IF NOT EXISTS idx_medication_alarms_unique
  ON medication_alarms (medication_id, scheduled_time);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_patients_professional_id ON patients (professional_id);
CREATE INDEX IF NOT EXISTS idx_patients_client_id       ON patients (client_id);
CREATE INDEX IF NOT EXISTS idx_patient_meds_patient_id  ON patient_medications (patient_id);
CREATE INDEX IF NOT EXISTS idx_med_alarms_patient_id    ON medication_alarms (patient_id);
CREATE INDEX IF NOT EXISTS idx_med_alarms_scheduled     ON medication_alarms (scheduled_time);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE patients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_alarms   ENABLE ROW LEVEL SECURITY;

-- Professional manages their own patients; client can view their own records
CREATE POLICY "Patients: professional manages, client reads" ON patients
  FOR ALL USING (
    auth.uid() = professional_id OR auth.uid() = client_id
  )
  WITH CHECK (auth.uid() = professional_id);

-- Access flows through patients row
CREATE POLICY "Patient medications: via patients" ON patient_medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_medications.patient_id
        AND (p.professional_id = auth.uid() OR p.client_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_medications.patient_id
        AND p.professional_id = auth.uid()
    )
  );

CREATE POLICY "Medication alarms: via patients" ON medication_alarms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_alarms.patient_id
        AND (p.professional_id = auth.uid() OR p.client_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = medication_alarms.patient_id
        AND p.professional_id = auth.uid()
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE medication_alarms;

NOTIFY pgrst, 'reload schema';
