-- 020_chat.sql: Chat rooms and messages between clients and professionals

-- One chat room per booking
CREATE TABLE IF NOT EXISTS chat_rooms (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

-- Messages sent within a booking's chat room
CREATE TABLE IF NOT EXISTS messages (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID        NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  sender_id  UUID        NOT NULL REFERENCES profiles(id),
  content    TEXT        NOT NULL,
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_booking_id_idx ON messages(booking_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx  ON messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_unread_idx     ON messages(booking_id, sender_id, read_at)
  WHERE read_at IS NULL;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages    ENABLE ROW LEVEL SECURITY;

-- chat_rooms: participants (client or provider) can read and create
CREATE POLICY "chat_rooms_select" ON chat_rooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = chat_rooms.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

CREATE POLICY "chat_rooms_insert" ON chat_rooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- messages: participants can read all messages in their bookings
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- messages: participants can send messages (must be the sender)
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- messages: participants can mark messages as read (update read_at)
CREATE POLICY "messages_update_read" ON messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = messages.booking_id
        AND (b.client_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

NOTIFY pgrst, 'reload schema';
