
ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS analyzed_for_training boolean DEFAULT false;
ALTER TABLE public.chatbot_training_examples ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
