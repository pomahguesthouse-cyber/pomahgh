-- Create table for admin chatbot audit logs
CREATE TABLE public.admin_chatbot_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email TEXT,
  session_id TEXT,
  user_message TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]'::jsonb,
  ai_response TEXT,
  duration_ms INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX idx_admin_chatbot_audit_admin_id ON admin_chatbot_audit_logs(admin_id);
CREATE INDEX idx_admin_chatbot_audit_created_at ON admin_chatbot_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE admin_chatbot_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_chatbot_audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- System can insert audit logs (via service role in edge function)
CREATE POLICY "System can insert audit logs"
  ON admin_chatbot_audit_logs FOR INSERT
  WITH CHECK (true);