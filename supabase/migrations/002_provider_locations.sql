-- ============================================================
-- Migration 002 — Tabela de localização em tempo real
-- Execute no SQL Editor do Supabase após o schema.sql inicial
-- ============================================================

-- Tabela para localização contínua do profissional por reserva.
-- Atualizada via upsert a cada posição do watchPosition do browser.
CREATE TABLE IF NOT EXISTS provider_locations (
  booking_id        UUID REFERENCES bookings(id) ON DELETE CASCADE PRIMARY KEY,
  latitude          DECIMAL(10, 8),
  longitude         DECIMAL(11, 8),
  accuracy          DECIMAL(8, 2),       -- precisão em metros
  has_checked_out   BOOLEAN DEFAULT FALSE,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para lookups por reserva (já coberto pela PK, mas explícito para clareza)
CREATE INDEX IF NOT EXISTS idx_provider_locations_booking ON provider_locations(booking_id);

-- RLS
ALTER TABLE provider_locations ENABLE ROW LEVEL SECURITY;

-- O profissional da reserva pode inserir/atualizar a sua localização
CREATE POLICY "Provider atualiza localização" ON provider_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = provider_locations.booking_id
        AND b.provider_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = provider_locations.booking_id
        AND b.provider_id = auth.uid()
    )
  );

-- O cliente da reserva pode ler a localização
CREATE POLICY "Cliente lê localização" ON provider_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = provider_locations.booking_id
        AND b.client_id = auth.uid()
    )
  );

-- Ativar Realtime na tabela para subscrições em tempo real
-- (executar uma vez; requer permissão de superuser no Supabase Dashboard)
-- ALTER PUBLICATION supabase_realtime ADD TABLE provider_locations;
-- Nota: ative também care_logs no Dashboard → Database → Replication se necessário.
