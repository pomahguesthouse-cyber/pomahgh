-- Add WhatsApp response mode column to hotel_settings
ALTER TABLE hotel_settings 
ADD COLUMN IF NOT EXISTS whatsapp_response_mode text DEFAULT 'ai';

-- Add check constraint
ALTER TABLE hotel_settings 
ADD CONSTRAINT whatsapp_response_mode_check 
CHECK (whatsapp_response_mode IN ('ai', 'manual'));