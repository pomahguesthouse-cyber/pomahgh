ALTER TABLE public.whatsapp_sessions 
  ADD COLUMN IF NOT EXISTS pending_messages text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pending_since timestamptz DEFAULT NULL;