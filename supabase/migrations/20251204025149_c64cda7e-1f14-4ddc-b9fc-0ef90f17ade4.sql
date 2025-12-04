-- Add takeover columns to whatsapp_sessions table
ALTER TABLE public.whatsapp_sessions 
ADD COLUMN IF NOT EXISTS is_takeover boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS takeover_by uuid,
ADD COLUMN IF NOT EXISTS takeover_at timestamp with time zone;

-- Enable realtime for chat_messages to allow live updates during takeover
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;