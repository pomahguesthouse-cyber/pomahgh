
-- Agent configuration table (persistent, editable from dashboard)
CREATE TABLE public.agent_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL,
  icon text NOT NULL DEFAULT '🤖',
  category text NOT NULL DEFAULT 'specialist',
  tags text[] DEFAULT '{}',
  system_prompt text,
  temperature numeric DEFAULT 0.3,
  max_turns integer DEFAULT 10,
  is_active boolean DEFAULT true,
  auto_escalate boolean DEFAULT true,
  escalation_target text,
  config_json jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage agent configs"
  ON public.agent_configs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Service role can read agent configs"
  ON public.agent_configs FOR SELECT
  TO public
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_agent_configs_updated_at
  BEFORE UPDATE ON public.agent_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed default agent configs
INSERT INTO public.agent_configs (agent_id, name, role, icon, category, tags, system_prompt, temperature, escalation_target) VALUES
  ('orchestrator', 'Orchestrator', 'Router utama — mendelegasikan pesan ke agent tepat', '🎯', 'core', '{"core","routing"}', NULL, 0.1, NULL),
  ('intent', 'Intent Router', 'Koleksi nama tamu & deteksi intent awal', '🔀', 'core', '{"core","nlp"}', NULL, 0.3, NULL),
  ('booking', 'Reservasi Bot', 'AI percakapan penuh + tool calls (booking, extend, cancel)', '📅', 'specialist', '{"booking","tools","ai"}', NULL, 0.3, 'manager'),
  ('faq', 'CS & FAQ Bot', 'Jawab FAQ tanpa tools (fasilitas, lokasi, aturan)', '💬', 'specialist', '{"faq","info","fast"}', NULL, 0.2, 'booking'),
  ('pricing', 'Pricing Bot', 'Proses APPROVE/REJECT harga dari manager', '💰', 'manager', '{"pricing","approval"}', NULL, 0.1, 'manager'),
  ('manager', 'Manager Bot', 'Chat AI khusus manager via admin-chatbot', '👔', 'manager', '{"admin","command"}', NULL, 0.3, NULL);

-- Agent routing logs table (observability)
CREATE TABLE public.agent_routing_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id text,
  conversation_id uuid,
  phone_number text,
  from_agent text NOT NULL,
  to_agent text,
  reason text,
  intent text,
  duration_ms integer,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_routing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view routing logs"
  ON public.agent_routing_logs FOR SELECT
  USING (is_admin());

CREATE POLICY "Anyone can insert routing logs"
  ON public.agent_routing_logs FOR INSERT
  WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_agent_routing_logs_created_at ON public.agent_routing_logs (created_at DESC);
CREATE INDEX idx_agent_routing_logs_from_agent ON public.agent_routing_logs (from_agent);
CREATE INDEX idx_agent_routing_logs_conversation ON public.agent_routing_logs (conversation_id);
