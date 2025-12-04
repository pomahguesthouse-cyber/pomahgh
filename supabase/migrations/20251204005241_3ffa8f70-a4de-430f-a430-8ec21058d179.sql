-- Create whatsapp_sessions table for tracking WhatsApp conversations
CREATE TABLE public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  conversation_id UUID REFERENCES chat_conversations(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for phone lookup
CREATE INDEX idx_whatsapp_sessions_phone ON public.whatsapp_sessions(phone_number);

-- Enable RLS
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage whatsapp sessions"
ON public.whatsapp_sessions
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Allow service role to insert/update (for webhook)
CREATE POLICY "Service role can manage sessions"
ON public.whatsapp_sessions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create updated_at trigger
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON public.whatsapp_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();