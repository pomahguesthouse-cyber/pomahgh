-- Add WhatsApp configuration to hotel_settings table
ALTER TABLE public.hotel_settings
ADD COLUMN IF NOT EXISTS whatsapp_session_timeout_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS whatsapp_ai_whitelist text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS whatsapp_contact_numbers jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.hotel_settings.whatsapp_session_timeout_minutes IS 'Session timeout in minutes for WhatsApp chatbot';
COMMENT ON COLUMN public.hotel_settings.whatsapp_ai_whitelist IS 'Phone numbers that will NOT be served by AI (human-only)';
COMMENT ON COLUMN public.hotel_settings.whatsapp_contact_numbers IS 'List of contact numbers with labels [{number, label}]';