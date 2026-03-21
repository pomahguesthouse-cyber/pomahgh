-- Add auto_generated flag to chatbot_training_examples for AI-generated entries
ALTER TABLE chatbot_training_examples
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;

-- Add auto_generated flag to admin training examples too
ALTER TABLE admin_chatbot_training_examples
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
