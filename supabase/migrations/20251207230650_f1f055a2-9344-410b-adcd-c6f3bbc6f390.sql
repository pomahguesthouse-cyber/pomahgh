-- Add structured persona columns to chatbot_settings
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS persona_name TEXT DEFAULT 'Rani';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS persona_role TEXT DEFAULT 'Customer Service';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS persona_traits TEXT[] DEFAULT ARRAY['ramah', 'profesional', 'helpful'];
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'santai-profesional';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS emoji_usage TEXT DEFAULT 'moderate';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS language_formality TEXT DEFAULT 'semi-formal';
ALTER TABLE chatbot_settings ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- Add more training example categories
ALTER TABLE chatbot_training_examples ADD COLUMN IF NOT EXISTS response_tags TEXT[] DEFAULT '{}';

-- Update existing record with defaults if exists
UPDATE chatbot_settings 
SET 
  persona_name = COALESCE(persona_name, 'Rani'),
  persona_role = COALESCE(persona_role, 'Customer Service'),
  persona_traits = COALESCE(persona_traits, ARRAY['ramah', 'profesional', 'helpful']),
  communication_style = COALESCE(communication_style, 'santai-profesional'),
  emoji_usage = COALESCE(emoji_usage, 'moderate'),
  language_formality = COALESCE(language_formality, 'semi-formal')
WHERE id IS NOT NULL;