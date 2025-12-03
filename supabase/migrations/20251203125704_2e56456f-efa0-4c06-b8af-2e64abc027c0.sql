-- Create chatbot_knowledge_base table
CREATE TABLE public.chatbot_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'word', 'txt', 'url')),
  source_url TEXT,
  original_filename TEXT,
  content TEXT NOT NULL,
  summary TEXT,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN DEFAULT true,
  tokens_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read active knowledge base"
ON public.chatbot_knowledge_base
FOR SELECT
USING (is_active = true OR is_admin());

CREATE POLICY "Admins can insert knowledge base"
ON public.chatbot_knowledge_base
FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update knowledge base"
ON public.chatbot_knowledge_base
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete knowledge base"
ON public.chatbot_knowledge_base
FOR DELETE
USING (is_admin());

-- Create updated_at trigger
CREATE TRIGGER update_chatbot_knowledge_base_updated_at
BEFORE UPDATE ON public.chatbot_knowledge_base
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('knowledge-base', 'knowledge-base', false, 10485760);

-- Storage policies
CREATE POLICY "Admins can upload knowledge files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'knowledge-base' AND is_admin());

CREATE POLICY "Admins can view knowledge files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'knowledge-base' AND is_admin());

CREATE POLICY "Admins can delete knowledge files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'knowledge-base' AND is_admin());