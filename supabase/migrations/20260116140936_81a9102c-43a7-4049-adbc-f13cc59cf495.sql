-- Admin Knowledge Base Table
CREATE TABLE public.admin_chatbot_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'txt',
  source_url TEXT,
  original_filename TEXT,
  content TEXT,
  summary TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  tokens_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Training Examples Table
CREATE TABLE public.admin_chatbot_training_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  ideal_answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  response_tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_chatbot_training_examples ENABLE ROW LEVEL SECURITY;

-- Policies (authenticated users can manage - admin check done in frontend)
CREATE POLICY "Authenticated users can view admin knowledge" 
ON public.admin_chatbot_knowledge_base FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert admin knowledge" 
ON public.admin_chatbot_knowledge_base FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update admin knowledge" 
ON public.admin_chatbot_knowledge_base FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete admin knowledge" 
ON public.admin_chatbot_knowledge_base FOR DELETE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view admin training" 
ON public.admin_chatbot_training_examples FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert admin training" 
ON public.admin_chatbot_training_examples FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update admin training" 
ON public.admin_chatbot_training_examples FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete admin training" 
ON public.admin_chatbot_training_examples FOR DELETE 
USING (auth.role() = 'authenticated');

-- Create trigger for updated_at
CREATE TRIGGER update_admin_knowledge_updated_at
  BEFORE UPDATE ON public.admin_chatbot_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_training_updated_at
  BEFORE UPDATE ON public.admin_chatbot_training_examples
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();