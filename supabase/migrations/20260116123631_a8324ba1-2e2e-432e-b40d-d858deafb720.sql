-- Add whatsapp_manager_numbers column for manager phone numbers
-- These numbers will get AI Admin responses instead of Guest AI responses
ALTER TABLE public.hotel_settings 
ADD COLUMN IF NOT EXISTS whatsapp_manager_numbers JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.hotel_settings.whatsapp_manager_numbers IS 'Array of manager phone numbers with name/phone. These get Admin AI responses via WhatsApp.';