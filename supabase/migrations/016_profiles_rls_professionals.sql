-- Ensure authenticated users can always SELECT professional profiles.
-- The existing "Perfis públicos visíveis" policy already uses USING (true),
-- but this explicit policy makes the intent clear and guards against future changes.

CREATE POLICY IF NOT EXISTS "Anyone can view professionals"
ON profiles FOR SELECT
USING (role = 'professional' OR id = auth.uid());
