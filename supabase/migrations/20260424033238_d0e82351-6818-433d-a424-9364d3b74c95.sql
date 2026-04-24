-- Composite index untuk mempercepat lookup session per phone_number
-- yang sering disertai pengurutan / filter berdasarkan last_message_at.
-- last_message_at DESC karena query umumnya mencari sesi paling baru.
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_last_message
  ON public.whatsapp_sessions (phone_number, last_message_at DESC);