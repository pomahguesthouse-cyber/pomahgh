-- Add AI model provider columns to chatbot_settings
-- These allow admins to choose different AI models per use-case through the Lovable Gateway
-- Supported formats: google/gemini-2.5-flash, openai/gpt-4o, anthropic/claude-3-5-sonnet, etc.

ALTER TABLE chatbot_settings 
  ADD COLUMN IF NOT EXISTS ai_model_guest TEXT DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_model_admin TEXT DEFAULT 'google/gemini-2.5-flash',
  ADD COLUMN IF NOT EXISTS ai_model_training TEXT DEFAULT 'google/gemini-2.5-flash';

-- Update existing rows with default values
UPDATE chatbot_settings
SET
  ai_model_guest  = COALESCE(ai_model_guest,  'google/gemini-2.5-flash'),
  ai_model_admin  = COALESCE(ai_model_admin,  'google/gemini-2.5-flash'),
  ai_model_training = COALESCE(ai_model_training, 'google/gemini-2.5-flash');

-- Add auto_generated flag to chatbot_training_examples for AI-generated entries
ALTER TABLE chatbot_training_examples
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Add auto_generated flag to admin training examples too
ALTER TABLE admin_chatbot_training_examples
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
