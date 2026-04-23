ALTER TABLE public.hotel_settings
  ADD COLUMN IF NOT EXISTS whatsapp_memory_retention_days INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS whatsapp_history_window_messages INTEGER NOT NULL DEFAULT 40;

-- Validasi rentang nilai melalui CHECK constraint sederhana (immutable)
ALTER TABLE public.hotel_settings
  DROP CONSTRAINT IF EXISTS hotel_settings_memory_retention_days_range;
ALTER TABLE public.hotel_settings
  ADD CONSTRAINT hotel_settings_memory_retention_days_range
  CHECK (whatsapp_memory_retention_days >= 0 AND whatsapp_memory_retention_days <= 30);

ALTER TABLE public.hotel_settings
  DROP CONSTRAINT IF EXISTS hotel_settings_history_window_messages_range;
ALTER TABLE public.hotel_settings
  ADD CONSTRAINT hotel_settings_history_window_messages_range
  CHECK (whatsapp_history_window_messages >= 5 AND whatsapp_history_window_messages <= 200);