-- Chatbot alerts table for admin follow-up notifications
CREATE TABLE public.chatbot_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('no_date_found', 'low_confidence', 'other')),
  phone_number TEXT NOT NULL,
  conversation_id UUID,
  last_user_message TEXT,
  confidence NUMERIC,
  intent TEXT,
  snippet TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_chatbot_alerts_created_at ON public.chatbot_alerts(created_at DESC);
CREATE INDEX idx_chatbot_alerts_resolved ON public.chatbot_alerts(resolved, created_at DESC);
CREATE INDEX idx_chatbot_alerts_phone ON public.chatbot_alerts(phone_number);

ALTER TABLE public.chatbot_alerts ENABLE ROW LEVEL SECURITY;

-- Admin-only access (uses existing has_role function)
CREATE POLICY "Admins can view alerts"
ON public.chatbot_alerts FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert alerts"
ON public.chatbot_alerts FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update alerts"
ON public.chatbot_alerts FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_alerts;
ALTER TABLE public.chatbot_alerts REPLICA IDENTITY FULL;