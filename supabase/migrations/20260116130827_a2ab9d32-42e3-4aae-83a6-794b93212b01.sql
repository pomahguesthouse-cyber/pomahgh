-- Add admin persona settings columns to chatbot_settings
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_persona_name TEXT DEFAULT 'Rani Admin';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_persona_role TEXT DEFAULT 'Booking Manager Assistant';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_persona_traits TEXT[] DEFAULT ARRAY['efisien', 'informatif', 'proaktif'];
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_communication_style TEXT DEFAULT 'santai-profesional';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_language_formality TEXT DEFAULT 'informal';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_emoji_usage TEXT DEFAULT 'minimal';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_custom_instructions TEXT DEFAULT '';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS admin_greeting_template TEXT DEFAULT 'Halo {manager_name}! Ada yang bisa saya bantu hari ini?';