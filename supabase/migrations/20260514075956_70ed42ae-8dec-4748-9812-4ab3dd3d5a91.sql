CREATE TABLE IF NOT EXISTS public.whatsapp_slang_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slang TEXT NOT NULL UNIQUE,
  normalized TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_slang_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view slang patterns"
ON public.whatsapp_slang_patterns FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage slang patterns"
ON public.whatsapp_slang_patterns FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_slang_patterns_updated_at
BEFORE UPDATE ON public.whatsapp_slang_patterns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_conversation_insights
  ADD COLUMN IF NOT EXISTS avg_admin_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS admin_rating_count INTEGER NOT NULL DEFAULT 0;