-- Create chatbot_settings table
CREATE TABLE chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona TEXT NOT NULL DEFAULT 'Anda adalah asisten ramah Pomah Guesthouse yang membantu tamu dengan booking dan informasi penginapan.',
  greeting_message TEXT DEFAULT 'Halo! 👋 Saya asisten Pomah Guesthouse. Ada yang bisa saya bantu?',
  bot_name TEXT DEFAULT 'Pomah Assistant',
  bot_avatar_url TEXT,
  bot_avatar_style TEXT DEFAULT 'circle',
  primary_color TEXT DEFAULT '#8B4513',
  response_speed TEXT DEFAULT 'balanced',
  enable_booking_assistance BOOLEAN DEFAULT true,
  enable_availability_check BOOLEAN DEFAULT true,
  enable_facility_info BOOLEAN DEFAULT true,
  max_message_length INTEGER DEFAULT 500,
  show_typing_indicator BOOLEAN DEFAULT true,
  sound_enabled BOOLEAN DEFAULT false,
  widget_position TEXT DEFAULT 'bottom-right',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default settings
INSERT INTO chatbot_settings (id) VALUES (gen_random_uuid());

-- Create chat_conversations table for analytics
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  guest_email TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  booking_created BOOLEAN DEFAULT false
);

-- Create chat_messages table
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES chat_conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_settings
CREATE POLICY "Anyone can read chatbot settings"
  ON chatbot_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update chatbot settings"
  ON chatbot_settings FOR UPDATE
  USING (public.is_admin());

-- RLS Policies for chat_conversations
CREATE POLICY "Anyone can insert conversations"
  ON chat_conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all conversations"
  ON chat_conversations FOR SELECT
  USING (public.is_admin());

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can insert messages"
  ON chat_messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all messages"
  ON chat_messages FOR SELECT
  USING (public.is_admin());