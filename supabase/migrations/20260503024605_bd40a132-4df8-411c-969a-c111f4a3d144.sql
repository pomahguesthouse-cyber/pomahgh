CREATE TABLE public.session_intent_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT,
  conversation_id UUID,
  first_message TEXT,
  matched_intents TEXT[] NOT NULL DEFAULT '{}',
  greeting_bypass BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'whatsapp',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_intent_logs_created_at ON public.session_intent_logs (created_at DESC);
CREATE INDEX idx_session_intent_logs_intents ON public.session_intent_logs USING GIN (matched_intents);

ALTER TABLE public.session_intent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view session intent logs"
ON public.session_intent_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
