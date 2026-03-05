-- ============================================================
-- CareConnect — Supabase Schema
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- ============================================================

-- PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT CHECK (role IN ('client', 'caregiver', 'nurse', 'cleaner', 'admin')),
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  city TEXT,
  country TEXT DEFAULT 'PT',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  hourly_rate DECIMAL(10, 2),
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  stripe_account_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SERVIÇOS DISPONÍVEIS
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('cuidador', 'enfermagem', 'limpeza', 'fisioterapia', 'outros')),
  price_per_hour DECIMAL(10, 2),
  duration_hours INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT TRUE,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RESERVAS / AGENDAMENTOS
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'pending',
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  duration_hours INTEGER DEFAULT 1,
  total_price DECIMAL(10, 2),
  address TEXT,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AVALIAÇÕES
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LOGS DE CUIDADO (monitoramento em tempo real)
CREATE TABLE IF NOT EXISTS care_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  log_type TEXT CHECK (log_type IN ('checkin', 'medication', 'activity', 'observation', 'checkout')),
  description TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ALARMES DE MEDICAÇÃO
CREATE TABLE IF NOT EXISTS medication_alarms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  alarm_times TIME[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGER: atualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: criar perfil automaticamente após registo
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER: atualizar rating do provider após review
-- ============================================================
CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET
    rating = (SELECT AVG(rating) FROM reviews WHERE reviewed_id = NEW.reviewed_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE reviewed_id = NEW.reviewed_id)
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_insert AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_provider_rating();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_alarms ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles: leitura pública, escrita própria
CREATE POLICY "Perfis públicos visíveis" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuário edita próprio perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Usuário insere próprio perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Services: leitura pública, escrita pelo provider
CREATE POLICY "Serviços públicos visíveis" ON services
  FOR SELECT USING (true);

CREATE POLICY "Provider gere próprios serviços" ON services
  FOR ALL USING (auth.uid() = provider_id);

-- Bookings: apenas client e provider envolvidos
CREATE POLICY "Usuário vê próprias reservas" ON bookings
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Client cria reserva" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Partes atualizam reserva" ON bookings
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- Reviews: leitura pública
CREATE POLICY "Reviews públicas" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviewer cria review" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- Care logs: apenas partes envolvidas
CREATE POLICY "Partes veem care logs" ON care_logs
  FOR SELECT USING (auth.uid() = provider_id OR auth.uid() = client_id);

CREATE POLICY "Provider cria care log" ON care_logs
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- Medication alarms: apenas partes envolvidas via booking
CREATE POLICY "Medication alarms visíveis" ON medication_alarms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = medication_alarms.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Notifications: apenas o dono
CREATE POLICY "Usuário vê próprias notificações" ON notifications
  FOR ALL USING (auth.uid() = user_id);
